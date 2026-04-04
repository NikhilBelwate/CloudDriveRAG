require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    chatModel: process.env.OLLAMA_CHAT_MODEL || 'llama3',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'clouddrive-rag-secret-change-me',
  },
};

// Dynamic getters that read from settingsStore at call time
function getOpenAIKey() {
  const { loadSettings } = require('../services/settingsStore');
  return loadSettings().openaiApiKey || process.env.OPENAI_API_KEY || '';
}

function getGeminiKey() {
  const { loadSettings } = require('../services/settingsStore');
  return loadSettings().geminiApiKey || process.env.GEMINI_API_KEY || '';
}

function getQdrantConfig() {
  const { loadSettings } = require('../services/settingsStore');
  const settings = loadSettings();
  return {
    url: settings.qdrantUrl || process.env.QDRANT_URL || 'http://localhost:6333',
    collection: settings.qdrantCollection || process.env.QDRANT_COLLECTION || 'clouddrive_rag',
    token: settings.qdrantToken || process.env.QDRANT_TOKEN || '',
  };
}

function getActiveProvider() {
  const { loadSettings } = require('../services/settingsStore');
  return loadSettings().provider || 'ollama';
}

function getAvailableProviders() {
  return {
    openai: !!getOpenAIKey(),
    gemini: !!getGeminiKey(),
    ollama: true,
  };
}

module.exports = { config, getAvailableProviders, getOpenAIKey, getGeminiKey, getQdrantConfig, getActiveProvider };
