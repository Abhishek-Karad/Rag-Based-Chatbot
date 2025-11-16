  const { embedText, cosineSimilarity } = require("./embeddings");

  /**
   * Simple text chunking by sentence and character length.
   */
  function chunkText(text, maxChars = 800) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let current = "";

    for (const s of sentences) {
      if ((current + " " + s).length > maxChars) {
        if (current) chunks.push(current.trim());
        current = s;
      } else {
        current += (current ? " " : "") + s;
      }
    }
    if (current) chunks.push(current.trim());
    return chunks;
  }

  /**
   * Given full chapter text, create chunks and embeddings.
   * Returns an array: [{ id, text, embedding }]
   */
  async function createTopicFromText(text) {
    const rawChunks = chunkText(text);
    const vectorChunks = [];

    for (let i = 0; i < rawChunks.length; i++) {
      const chunkTextValue = rawChunks[i];
      const embedding = await embedText(chunkTextValue);
      vectorChunks.push({
        id: i,
        text: chunkTextValue,
        embedding,
      });
    }

    return vectorChunks;
  }

  /**
   * Retrieve top-K chunks for a given query embedding.
   */
  function retrieveTopKChunks(queryEmbedding, chunks, k = 4) {
    const scored = chunks.map((c) => ({
      id: c.id,
      text: c.text,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k);
  }

  /**
   * Build a prompt and ask Gemini Pro using retrieved chunks.
   */
  async function answerWithRAG(question, topicData, geminiClient) {
    const queryEmbedding = await embedText(question);
    const top = retrieveTopKChunks(queryEmbedding, topicData.chunks, 4);

    const contextBlocks = top
      .map((c, idx) => `Chunk ${idx + 1}:\n${c.text}`)
      .join("\n\n");

    const systemPrompt = `
  You are an AI Tutor for a specific textbook chapter.
  You must answer ONLY using the provided context chunks.
  If the answer is not clearly supported by the context, say:
  "I am not sure based on this chapter."

  Context:
  ${contextBlocks}
  `.trim();

    const model = geminiClient.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      systemPrompt,
      `Question: ${question}\nAnswer in a clear, student-friendly way.`,
    ]);

    let answer = result.response.text().trim();

    // Detect RAG failure
    const failedRAG = answer.includes("I am not sure");
    const relevanceThreshold = 0.3;

    // Find highest semantic similarity
    const maxSimilarity = Math.max(
      ...topicData.chunks.map((c) => cosineSimilarity(queryEmbedding, c.embedding))
    );

    let fallbackUsed = false;

    // Fallback only if question fits topic
    if (failedRAG && maxSimilarity > relevanceThreshold) {
      console.log("[RAG] Failed but question appears relevant. Fallback to Gemini...");

      const generalPrompt = `
  You are a tutor. Answer this question clearly and factually:
  Q: ${question}
  A:`;

      const fallbackResult = await model.generateContent(generalPrompt);
      let fallbackAnswer = fallbackResult.response.text().trim();

      // Add the warning message
      fallbackAnswer +=
        `\n\n*Note: This answer was generated outside the chapter context and may be open-ended.*`;

      answer = fallbackAnswer;
      fallbackUsed = true;
    }

    return {
      answer,
      usedChunks: top,
      fallbackUsed
    };
  }



  module.exports = {
    createTopicFromText,
    retrieveTopKChunks,
    answerWithRAG,
  };
