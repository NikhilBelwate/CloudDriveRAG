// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

// Check auth status on load
async function checkAuthStatus() {
  try {
    const res = await fetch('/api/auth/status');
    const data = await res.json();

    if (data.connected) {
      // Check if settings are configured
      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();

      // Show Settings modal if no Qdrant URL configured
      if (!settingsData.qdrantUrl) {
        updateConnectionUI(true, false); // Show nav, hide drive panel
        document.getElementById('settings-modal').classList.remove('hidden');
        // Setup listener for successful settings save
        setupSettingsSaveListener();
      } else {
        updateConnectionUI(true, true); // Show nav and drive panel
      }
    } else {
      updateConnectionUI(false, false);
    }
  } catch (err) {
    console.error('Failed to check auth status:', err);
    updateConnectionUI(false, false);
  }
}

function updateConnectionUI(connected, showDrive = true) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const connectPanel = document.getElementById('connect-panel');
  const drivePanel = document.getElementById('drive-panel');

  if (connected) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-green-400';
    text.textContent = 'Connected';
    connectPanel.classList.add('hidden');

    if (showDrive) {
      drivePanel.classList.remove('hidden');
      if (typeof loadFolder === 'function') loadFolder(null);
    } else {
      drivePanel.classList.add('hidden');
    }
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-red-400';
    text.textContent = 'Not connected';
    connectPanel.classList.remove('hidden');
    drivePanel.classList.add('hidden');
  }
}

// Setup listener for Settings save completion
function setupSettingsSaveListener() {
  const originalForm = document.getElementById('settings-form');
  if (!originalForm) return;

  const saveBtn = originalForm.querySelector('button[type="submit"]');
  if (!saveBtn) return;

  const originalOnClick = saveBtn.onclick;
  saveBtn.addEventListener('click', (e) => {
    // Wait a moment for the form submission to complete
    setTimeout(() => {
      const modalHidden = document.getElementById('settings-modal').classList.contains('hidden');
      if (modalHidden) {
        // Settings were saved and modal closed
        updateConnectionUI(true, true);
      }
    }, 1000);
  });
}

// Check URL params for connection status
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('connected') === 'true') {
  window.history.replaceState({}, '', '/');
}

checkAuthStatus();
