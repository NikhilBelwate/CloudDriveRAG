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
    updateConnectionUI(data.connected);
  } catch {
    updateConnectionUI(false);
  }
}

function updateConnectionUI(connected) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  const connectPanel = document.getElementById('connect-panel');
  const drivePanel = document.getElementById('drive-panel');

  if (connected) {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-green-400';
    text.textContent = 'Connected';
    connectPanel.classList.add('hidden');
    drivePanel.classList.remove('hidden');
    if (typeof loadFolder === 'function') loadFolder(null);
  } else {
    dot.className = 'w-2.5 h-2.5 rounded-full bg-red-400';
    text.textContent = 'Not connected';
    connectPanel.classList.remove('hidden');
    drivePanel.classList.add('hidden');
  }
}

// Check URL params for connection status
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('connected') === 'true') {
  window.history.replaceState({}, '', '/');
}

checkAuthStatus();
