const router = require('express').Router();
const { getAvailableProviders } = require('../config');
const settingsStore = require('../services/settingsStore');
const vectorStore = require('../services/vectorStore');

// GET all settings (masks API keys for display)
router.get('/', (req, res) => {
  const settings = settingsStore.loadSettings();
  res.json({
    provider: settings.provider,
    openaiApiKey: settings.openaiApiKey ? maskKey(settings.openaiApiKey) : '',
    geminiApiKey: settings.geminiApiKey ? maskKey(settings.geminiApiKey) : '',
    qdrantUrl: settings.qdrantUrl,
    qdrantCollection: settings.qdrantCollection,
    qdrantToken: settings.qdrantToken ? maskKey(settings.qdrantToken) : '',
    hasOpenaiKey: !!settings.openaiApiKey,
    hasGeminiKey: !!settings.geminiApiKey,
    hasQdrantToken: !!settings.qdrantToken,
  });
});

// Save all settings
router.post('/', async (req, res) => {
  try {
    const { provider, openaiApiKey, geminiApiKey, qdrantUrl, qdrantCollection, qdrantToken } = req.body;
    const current = settingsStore.loadSettings();

    const updated = {
      provider: provider || current.provider,
      // Only update keys if a new value is sent (not the masked version)
      openaiApiKey: isNewKey(openaiApiKey) ? openaiApiKey : current.openaiApiKey,
      geminiApiKey: isNewKey(geminiApiKey) ? geminiApiKey : current.geminiApiKey,
      qdrantUrl: qdrantUrl || current.qdrantUrl,
      qdrantCollection: qdrantCollection || current.qdrantCollection,
      qdrantToken: isNewKey(qdrantToken) ? qdrantToken : current.qdrantToken,
    };

    settingsStore.saveSettings(updated);

    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET available providers
router.get('/providers', (req, res) => {
  const available = getAvailableProviders();
  const settings = settingsStore.loadSettings();
  res.json({ available, active: settings.provider });
});

// POST set active provider
router.post('/provider', (req, res) => {
  const { provider } = req.body;
  if (!['openai', 'gemini', 'ollama'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }
  const settings = settingsStore.loadSettings();
  settings.provider = provider;
  settingsStore.saveSettings(settings);
  res.json({ success: true, active: provider });
});

// Test Qdrant connection
router.post('/test-qdrant', async (req, res) => {
  try {
    const result = await vectorStore.testConnection();
    res.json(result);
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

function maskKey(key) {
  if (!key || key.length < 8) return '****';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

function isNewKey(value) {
  // A new key is one that doesn't contain the mask pattern and isn't empty
  return value && !value.includes('****');
}

module.exports = router;
