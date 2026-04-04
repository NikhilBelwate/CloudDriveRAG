const { GoogleGenerativeAI } = require('@google/generative-ai');
const { config } = require('../config');

const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = 'gemini-2.0-flash';
const DIMENSIONS = 3072;

let genAI = null;

function getGenAI() {
  if (!genAI) {
    if (!config.gemini.apiKey) throw new Error('GEMINI_API_KEY not configured');
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

async function embed(texts) {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL });
  const allEmbeddings = [];
  const batchSize = 20;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Try batch first, fall back to one-by-one
    try {
      const result = await model.batchEmbedContents({
        requests: batch.map(text => ({
          content: { parts: [{ text }] },
        })),
      });
      for (const embedding of result.embeddings) {
        allEmbeddings.push(embedding.values);
      }
    } catch (batchErr) {
      console.log('Batch embed failed, falling back to single embed:', batchErr.message);
      // Fallback: embed one at a time
      for (const text of batch) {
        const result = await model.embedContent(text);
        allEmbeddings.push(result.embedding.values);
      }
    }
  }

  return allEmbeddings;
}

async function chat(systemPrompt, userMessage) {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: CHAT_MODEL,
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userMessage);
  return result.response.text();
}

module.exports = { embed, chat, dimensions: DIMENSIONS, name: 'gemini' };
