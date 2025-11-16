require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const { createTopicFromText, answerWithRAG } = require("./rag");
const { initImageStore, getImagesByTopic, findBestImageForText } = require("./imageStore");

const app = express();
app.use(express.json());
app.use(cors());

// Static images for diagrams
app.use("/static/images", express.static(path.join(__dirname, "public", "images")));

const upload = multer({ dest: path.join(__dirname, "uploads") });

const TOPICS_DIR = path.join(__dirname, "data", "topics");
if (!fs.existsSync(TOPICS_DIR)) fs.mkdirSync(TOPICS_DIR, { recursive: true });

// In-memory topic cache
const topics = {}; // topicId -> { id, title, chunks: [{id, text, embedding}] }

const geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function loadExistingTopics() {
  if (!fs.existsSync(TOPICS_DIR)) return;
  const files = fs.readdirSync(TOPICS_DIR);
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = fs.readFileSync(path.join(TOPICS_DIR, f), "utf-8");
    const topic = JSON.parse(raw);
    topics[topic.id] = topic;
  }
  console.log("[Topics] Loaded", Object.keys(topics).length, "topics from disk.");
}

// POST /upload - upload PDF, extract text, create embeddings, save as JSON
app.post("/upload", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No PDF uploaded" });

    const buffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text || "";

    if (!fullText.trim()) {
      return res.status(400).json({ error: "PDF text extraction failed or file is empty" });
    }

    const topicId = req.body.topicId || ("topic_" + Date.now());
    const title = req.body.title || "Uploaded Chapter";

    // Create chunks + embeddings
    const chunks = await createTopicFromText(fullText);

    const topicData = {
      id: topicId,
      title,
      chunks, // each chunk has id, text, embedding (float array)
      createdAt: new Date().toISOString(),
    };

    // Persist to JSON with embeddings stored
    const outPath = path.join(TOPICS_DIR, topicId + ".json");
    fs.writeFileSync(outPath, JSON.stringify(topicData, null, 2), "utf-8");

    // Cache in memory
    topics[topicId] = topicData;

    // cleanup uploaded PDF
    fs.unlinkSync(req.file.path);

    res.json({ topicId, title, chunksCount: chunks.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

// POST /chat - ask a question grounded in a topic
app.post("/chat", async (req, res) => {
  try {
    const { topicId, question } = req.body;
    if (!topicId || !question) {
      return res.status(400).json({ error: "topicId and question are required" });
    }

    const topicData = topics[topicId];
    if (!topicData) {
      return res.status(404).json({ error: "Unknown topicId" });
    }

    const { answer, usedChunks } = await answerWithRAG(question, topicData, geminiClient);

    // retrieve best image (use topicId as image topic mapping; here we hardcode "sound" as example)
    const imageTopic = "sound"; // you can map specific topicIds to labels if needed
    const queryText = `${question}\n\n${answer}`;
    const bestImage = await findBestImageForText(queryText, imageTopic);

    res.json({
      answer,
      image: bestImage
        ? {
            id: bestImage.id,
            title: bestImage.title,
            url: `/static/images/${bestImage.filename}`,
            description: bestImage.description,
          }
        : null,
      meta: {
        topicId,
        usedChunksCount: usedChunks.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat failed" });
  }
});

// GET /images/:topicId - list images for a topic
app.get("/images/:topicId", (req, res) => {
  const { topicId } = req.params;
  const imgs = getImagesByTopic(topicId);
  res.json(imgs);
});

// Simple health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "RAG Gemini Tutor backend is running" });
});

// Initialize and start server
(async () => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("[WARN] GEMINI_API_KEY is not set. Set it in .env before calling APIs.");
    }
    await initImageStore();
    loadExistingTopics();

    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Backend server listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
})();
