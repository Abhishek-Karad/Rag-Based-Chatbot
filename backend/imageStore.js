const fs = require("fs");
const path = require("path");
const { embedText, cosineSimilarity } = require("./embeddings");

const IMAGES_PATH = path.join(__dirname, "data", "images.json");

const imageStore = {
  images: [],
  ready: false,
};

/**
 * Precompute embeddings for each image using its title, description, and keywords.
 * This runs once on server startup.
 */
async function initImageStore() {
  if (!fs.existsSync(IMAGES_PATH)) {
    console.warn("[ImageStore] images.json not found, skipping image store init.");
    return;
  }

  const raw = fs.readFileSync(IMAGES_PATH, "utf-8");
  const images = JSON.parse(raw);

  for (const img of images) {
    const text = `${img.title}. ${img.description}. ${(img.keywords || []).join(", ")}`;
    img.embedding = await embedText(text);
  }

  imageStore.images = images;
  imageStore.ready = true;
  console.log("[ImageStore] Loaded", images.length, "images with embeddings.");
}

/**
 * Get all images for a given topicId.
 */
function getImagesByTopic(topicId) {
  if (!imageStore.ready) return [];
  return imageStore.images.filter((img) => img.topicId === topicId);
}

/**
 * Find the best matching image for a given text (question + answer),
 * optionally restricted to a topicId.
 */
async function findBestImageForText(text, topicId = null) {
  if (!imageStore.ready) return null;

  const queryEmbedding = await embedText(text);
  const candidates = topicId
    ? imageStore.images.filter((img) => img.topicId === topicId)
    : imageStore.images;

  if (!candidates.length) return null;

  let best = null;
  let bestScore = -1;

  for (const img of candidates) {
    const score = cosineSimilarity(queryEmbedding, img.embedding);
    if (score > bestScore) {
      bestScore = score;
      best = img;
    }
  }

  return best;
}

module.exports = {
  initImageStore,
  getImagesByTopic,
  findBestImageForText,
};
