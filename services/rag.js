const { embed, chat } = require('./embedding');
const vectorStore = require('./vectorStore');
const { getQdrantConfig } = require('../config');

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided context from documents.

Rules:
- Answer ONLY based on the provided context. Do not use external knowledge.
- If the context does not contain enough information to answer, say "I don't have enough information in the knowledge base to answer this question."
- Cite the source document names when possible.
- Be concise but thorough.
- Format your response with clear structure when appropriate.`;

async function query(question, providerName, topK = 5) {
  const collectionName = getQdrantConfig().collection;

  // Embed the question
  const [queryVector] = await embed([question], providerName);

  // Search Qdrant
  const results = await vectorStore.search(collectionName, queryVector, topK);

  if (results.length === 0) {
    return {
      answer: 'No relevant documents found in the knowledge base. Please ingest some documents first.',
      sources: [],
    };
  }

  // Build context from results
  const contextParts = results.map((r, i) =>
    `[Source ${i + 1}: ${r.filename}]\n${r.text}`
  );
  const context = contextParts.join('\n\n---\n\n');

  const userMessage = `Context from documents:\n\n${context}\n\n---\n\nQuestion: ${question}`;

  // Get LLM response
  const answer = await chat(SYSTEM_PROMPT, userMessage, providerName);

  return {
    answer,
    sources: results.map(r => ({
      filename: r.filename,
      text: r.text.substring(0, 200) + (r.text.length > 200 ? '...' : ''),
      score: Math.round(r.score * 100) / 100,
    })),
  };
}

module.exports = { query };
