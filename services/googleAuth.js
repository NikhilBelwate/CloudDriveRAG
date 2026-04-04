const { google } = require('googleapis');
const { config } = require('../config');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

// In-memory token store keyed by session ID
const tokenStore = new Map();

function createOAuth2Client() {
  return new google.auth.OAuth2(
    config.google.clientId,
    config.google.clientSecret,
    config.google.redirectUri
  );
}

function getAuthUrl() {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

async function getTokensFromCode(code) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  return tokens;
}

function storeTokens(sessionId, tokens) {
  tokenStore.set(sessionId, tokens);
}

function getTokens(sessionId) {
  return tokenStore.get(sessionId);
}

function clearTokens(sessionId) {
  tokenStore.delete(sessionId);
}

function getAuthenticatedClient(sessionId) {
  const tokens = tokenStore.get(sessionId);
  if (!tokens) return null;

  const client = createOAuth2Client();
  client.setCredentials(tokens);

  // Auto-refresh tokens
  client.on('tokens', (newTokens) => {
    const existing = tokenStore.get(sessionId);
    tokenStore.set(sessionId, { ...existing, ...newTokens });
  });

  return client;
}

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  storeTokens,
  getTokens,
  clearTokens,
  getAuthenticatedClient,
};
