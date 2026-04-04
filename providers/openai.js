const OpenAI = require('openai');
const { config } = require('../config');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const CHAT_MODEL = 'gpt-4o-mini';
const DIMENSIONS = 1536;

let client = null;

function getClient() {
  if (!client) {
    if (!config.openai.apiKey) throw new Error('OPENAI_API_KEY not configured');
    client = new OpenAI({ apiKey: config.openai.apiKey });
  }
  return client;
}

async function embed(texts) {
  const openai = getClient();
  const batchSize = 50;
  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

async function chat(systemPrompt, userMessage) {
  const openai = getClient();
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });
  return response.choices[0].message.content;
}

module.exports = { embed, chat, dimensions: DIMENSIONS, name: 'openai' };
