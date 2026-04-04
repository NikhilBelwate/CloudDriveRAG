let activeProvider = 'openai';
let availableProviders = {};

// Load provider settings
async function loadProviderSettings() {
  try {
    const res = await fetch('/api/settings/providers');
    const data = await res.json();
    availableProviders = data.available;
    activeProvider = data.active;
    updateProviderUI();
  } catch (err) {
    console.error('Failed to load providers:', err);
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
  loadProviderSettings();
});

document.getElementById('settings-close').addEventListener('click', () => {
  document.getElementById('settings-modal').classList.add('hidden');
});

document.getElementById('settings-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('settings-modal').classList.add('hidden');
  }
});

// Save provider
document.getElementById('save-provider').addEventListener('click', async () => {
  const selected = document.querySelector('input[name="provider"]:checked');
  if (!selected) return;

  try {
    const res = await fetch('/api/settings/provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: selected.value }),
    });
    const data = await res.json();
    if (data.success) {
      activeProvider = data.active;
      document.getElementById('settings-modal').classList.add('hidden');
    }
  } catch (err) {
    console.error('Failed to save provider:', err);
  }
});

// Disconnect
document.getElementById('disconnect-btn').addEventListener('click', async () => {
  if (!confirm('Disconnect from Google Drive?')) return;
  try {
    await fetch('/api/auth/disconnect', { method: 'POST' });
    document.getElementById('settings-modal').classList.add('hidden');
    updateConnectionUI(false);
  } catch (err) {
    console.error('Disconnect failed:', err);
  }
});

loadProviderSettings();
