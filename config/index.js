require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    chatModel: process.env.OLLAMA_CHAT_MODEL || 'llama3',
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    collection: process.env.QDRANT_COLLECTION || 'clouddrive_rag',
  },
  session: {
    secret: process.env.SESSION_SECRET || 'clouddrive-rag-secret-change-me',
  },
};

function getAvailableProviders() {
  return {
    openai: !!config.openai.apiKey,
    gemini: !!config.gemini.apiKey,
    ollama: true, // Ollama is local, always "available" if running
  };
}

module.exports = { config, getAvailableProviders };
