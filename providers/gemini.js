const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getGeminiKey } = require('../config');

const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = 'gemini-2.5-flash';
const DIMENSIONS = 3072;

let genAI = null;
let lastKey = '';

function getGenAI() {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error('Gemini API Key not configured. Please set it in Settings.');
  // Recreate client if key changed
  if (!genAI || apiKey !== lastKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    lastKey = apiKey;
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
