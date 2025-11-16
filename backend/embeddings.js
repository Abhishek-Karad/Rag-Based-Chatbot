// backend/embeddings.js
const { pipeline } = require("@xenova/transformers");

// Singleton for embedder
let embedder = null;

async function loadEmbedder() {
  if (!embedder) {
    console.log("[Embeddings] Loading local MiniLM model...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("[Embeddings] Local embedding model loaded.");
  }
  return embedder;
}

async function embedText(text) {
  try {
    const extractor = await loadEmbedder();

    // Ask transformers.js to give us a pooled embedding vector
    const output = await extractor(text, {
      pooling: "mean",
      normalize: true,
    });

    // output.data is typically a TypedArray (e.g., Float32Array)
    const vector = Array.from(output.data); // <-- no .flat()
    // Optional debug:
    // console.log("[embedText] len =", vector.length);

    return vector;
  } catch (err) {
    console.error("[Embedding Error]", err);
    return [];
  }
}

function cosineSimilarity(a, b) {
  let dot = 0,
    na = 0,
    nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

module.exports = { embedText, cosineSimilarity };
