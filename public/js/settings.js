let activeProvider = 'openai';
let availableProviders = {};

// Load all settings
async function loadAllSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();

    // Load provider info
    const provRes = await fetch('/api/settings/providers');
    const provData = await provRes.json();
    availableProviders = provData.available;
    activeProvider = provData.active;

    // Populate form with masked values as placeholders
    document.getElementById('openai-key').value = '';
    document.getElementById('gemini-key').value = '';
    document.getElementById('qdrant-token').value = '';

    if (data.hasOpenaiKey) document.getElementById('openai-key').placeholder = data.openaiApiKey || 'sk-**** (configured)';
    if (data.hasGeminiKey) document.getElementById('gemini-key').placeholder = data.geminiApiKey || 'AIza**** (configured)';
    if (data.hasQdrantToken) document.getElementById('qdrant-token').placeholder = data.qdrantToken || '****' + ' (configured)';

    document.getElementById('qdrant-url').value = data.qdrantUrl || 'http://localhost:6333';
    document.getElementById('qdrant-collection').value = data.qdrantCollection || 'clouddrive_rag';

    updateProviderUI();
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

function updateProviderUI() {
  // Update status badges
  for (const [name, available] of Object.entries(availableProviders)) {
    const badge = document.getElementById(`${name}-status`);
    if (badge) {
      if (available) {
        badge.textContent = name === 'ollama' ? 'Local' : 'Configured';
        badge.className = 'ml-auto text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700';
      } else {
        badge.textContent = 'No API Key';
        badge.className = 'ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700';
      }
    }
  }

  // Select active radio
  const radio = document.querySelector(`input[name="provider"][value="${activeProvider}"]`);
  if (radio) radio.checked = true;
}

// Settings modal
document.getElementById('settings-btn').addEventListener('click', () => {
  document.getElementById('settings-modal').classList.remove('hidden');
  loadAllSettings();
});

document.getElementById('settings-close').addEventListener('click', () => {
  document.getElementById('settings-modal').classList.add('hidden');
});

document.getElementById('settings-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('settings-modal').classList.add('hidden');
  }
});

// Save all settings
document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const openaiApiKey = document.getElementById('openai-key').value.trim();
  const geminiApiKey = document.getElementById('gemini-key').value.trim();
  const qdrantUrl = document.getElementById('qdrant-url').value.trim();
  const qdrantCollection = document.getElementById('qdrant-collection').value.trim();
  const qdrantToken = document.getElementById('qdrant-token').value.trim();
  const provider = document.querySelector('input[name="provider"]:checked').value;

  if (!qdrantUrl || !qdrantCollection) {
    alert('Please fill in Qdrant URL and Collection Name');
    return;
  }

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openaiApiKey: openaiApiKey || undefined,
        geminiApiKey: geminiApiKey || undefined,
        qdrantUrl,
        qdrantCollection,
        qdrantToken: qdrantToken || undefined,
        provider,
      }),
    });
    const data = await res.json();
    if (data.success) {
      activeProvider = provider;
      document.getElementById('settings-modal').classList.add('hidden');
      alert('Settings saved successfully!');
      // Reload drive folder after settings saved
      setTimeout(() => {
        if (typeof loadFolder === 'function') {
          loadFolder(null);
        }
      }, 500);
    } else {
      alert('Error: ' + (data.error || 'Failed to save settings'));
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
    alert('Failed to save settings: ' + err.message);
  }
});

// Test Qdrant connection
document.getElementById('test-qdrant-btn').addEventListener('click', async () => {
  const url = document.getElementById('qdrant-url').value.trim();
  const token = document.getElementById('qdrant-token').value.trim();

  if (!url) {
    alert('Please enter Qdrant URL first');
    return;
  }

  const resultDiv = document.getElementById('qdrant-test-result');
  resultDiv.textContent = 'Testing connection...';
  resultDiv.className = 'text-sm p-2 rounded-lg bg-blue-100 text-blue-700';
  resultDiv.classList.remove('hidden');

  try {
    const res = await fetch('/api/settings/test-qdrant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, token: token || undefined }),
    });
    const data = await res.json();

    if (data.success) {
      resultDiv.textContent = '✓ Connection successful!';
      resultDiv.className = 'text-sm p-2 rounded-lg bg-green-100 text-green-700';
    } else {
      resultDiv.textContent = '✗ Connection failed: ' + (data.error || 'Unknown error');
      resultDiv.className = 'text-sm p-2 rounded-lg bg-red-100 text-red-700';
    }
  } catch (err) {
    resultDiv.textContent = '✗ Connection failed: ' + err.message;
    resultDiv.className = 'text-sm p-2 rounded-lg bg-red-100 text-red-700';
  }
});

// Disconnect
document.getElementById('disconnect-btn').addEventListener('click', async () => {
  if (!confirm('Disconnect from Google Drive?')) return;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
    document.getElementById('settings-modal').classList.add('hidden');
    updateConnectionUI(false);
    window.location.reload();
  } catch (err) {
    console.error('Disconnect failed:', err);
  }
});

loadAllSettings();
