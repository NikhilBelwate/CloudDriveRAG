const router = require('express').Router();
const { getAvailableProviders } = require('../config');

// In-memory session provider store
const sessionProviders = new Map();

router.get('/providers', (req, res) => {
  const available = getAvailableProviders();
  const active = sessionProviders.get(req.session.id) || getDefaultProvider(available);
  res.json({ available, active });
});

router.post('/provider', (req, res) => {
  const { provider } = req.body;
  if (!['openai', 'gemini', 'ollama'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }
  sessionProviders.set(req.session.id, provider);
  res.json({ success: true, active: provider });
});

function getDefaultProvider(available) {
  if (available.openai) return 'openai';
  if (available.gemini) return 'gemini';
  return 'ollama';
}

module.exports = router;
