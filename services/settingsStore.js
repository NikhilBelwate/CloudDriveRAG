const fs = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '..', 'data', 'settings.json');
const TOKENS_FILE = path.join(__dirname, '..', 'data', 'tokens.json');

const DEFAULTS = {
  provider: 'ollama',
  openaiApiKey: '',
  geminiApiKey: '',
  qdrantUrl: '',
  qdrantCollection: '',
  qdrantToken: '',
};

function ensureDataDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// --- Settings ---

function loadSettings() {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      return { ...DEFAULTS, ...data };
    }
  } catch (err) {
    console.error('[SettingsStore] Failed to load settings:', err.message);
  }
  return { ...DEFAULTS };
}

function saveSettings(settings) {
  ensureDataDir();
  const merged = { ...DEFAULTS, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

function getSetting(key) {
  const settings = loadSettings();
  return settings[key];
}

// --- OAuth Tokens (persistent across restarts) ---

function loadTokens() {
  ensureDataDir();
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[SettingsStore] Failed to load tokens:', err.message);
  }
  return null;
}

function saveTokens(tokens) {
  ensureDataDir();
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

function clearTokens() {
  ensureDataDir();
  if (fs.existsSync(TOKENS_FILE)) {
    fs.unlinkSync(TOKENS_FILE);
  }
}

module.exports = {
  loadSettings,
  saveSettings,
  getSetting,
  loadTokens,
  saveTokens,
  clearTokens,
};
