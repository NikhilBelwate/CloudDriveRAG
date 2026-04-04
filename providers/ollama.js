const { Ollama } = require('ollama');
const { config } = require('../config');

const EMBEDDING_MODEL = 'nomic-embed-text';
const DIMENSIONS = 768;

let client = null;

function getClient() {
  if (!client) {
    client = new Ollama({ host: config.ollama.baseUrl });
  }
  return client;
}

async function embed(texts) {
  const ollama = getClient();
  const allEmbeddings = [];
  const batchSize = 10;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await ollama.embed({
      model: EMBEDDING_MODEL,
      input: batch,
    });
    allEmbeddings.push(...response.embeddings);
  }

  return allEmbeddings;
}

async function chat(systemPrompt, userMessage) {
  const ollama = getClient();
  const response = await ollama.chat({
    model: config.ollama.chatModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });
  return response.message.content;
}

module.exports = { embed, chat, dimensions: DIMENSIONS, name: 'ollama' };
