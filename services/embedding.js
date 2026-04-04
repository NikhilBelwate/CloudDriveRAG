const openaiProvider = require('../providers/openai');
const geminiProvider = require('../providers/gemini');
const ollamaProvider = require('../providers/ollama');

const providers = {
  openai: openaiProvider,
  gemini: geminiProvider,
  ollama: ollamaProvider,
};

function getProvider(name) {
  const provider = providers[name];
  if (!provider) {
    throw new Error(`Unknown provider: ${name}. Available: ${Object.keys(providers).join(', ')}`);
  }
  return provider;
}

function getDimensions(providerName) {
  return getProvider(providerName).dimensions;
}

async function embed(texts, providerName) {
  const provider = getProvider(providerName);
  return provider.embed(texts);
}

async function chat(systemPrompt, userMessage, providerName) {
  const provider = getProvider(providerName);
  return provider.chat(systemPrompt, userMessage);
}

module.exports = { getProvider, getDimensions, embed, chat };
