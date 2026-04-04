const { google } = require('googleapis');
const { config } = require('../config');
const settingsStore = require('./settingsStore');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

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

function storeTokens(tokens) {
  settingsStore.saveTokens(tokens);
}

function getTokens() {
  return settingsStore.loadTokens();
}

function clearTokens() {
  settingsStore.clearTokens();
}

function getAuthenticatedClient() {
  const tokens = getTokens();
  if (!tokens) return null;

  const client = createOAuth2Client();
  client.setCredentials(tokens);

  // Auto-refresh and persist updated tokens
  client.on('tokens', (newTokens) => {
    const existing = getTokens() || {};
    storeTokens({ ...existing, ...newTokens });
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
