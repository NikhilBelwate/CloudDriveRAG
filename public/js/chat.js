const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const providerInfo = document.getElementById('chat-provider-info');
let chatSelectedProvider = null;
let isFirstMessage = true;

const PROVIDER_LABELS = {
  openai: 'GPT-4o-mini',
  gemini: 'Gemini 2.0 Flash',
  ollama: 'Ollama (Local)',
};

// --- Chat Provider Selector ---
function initChatProviderSelector() {
  const buttons = document.querySelectorAll('.chat-provider-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectChatProvider(btn.dataset.provider);
      // Also persist to settings backend
      fetch('/api/settings/provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: btn.dataset.provider }),
      }).catch(() => {});
    });
  });
}

function selectChatProvider(provider) {
  chatSelectedProvider = provider;
  // Also sync with global settings variable
  if (typeof activeProvider !== 'undefined') {
    activeProvider = provider;
  }

  // Update button styles
  document.querySelectorAll('.chat-provider-btn').forEach(btn => {
    if (btn.dataset.provider === provider) {
      btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
      btn.classList.remove('bg-white', 'text-gray-600', 'border-gray-300', 'hover:bg-gray-50');
    } else {
      btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
      btn.classList.add('bg-white', 'text-gray-600', 'border-gray-300', 'hover:bg-gray-50');
    }
  });

  providerInfo.textContent = `Using ${PROVIDER_LABELS[provider] || provider}`;
}

// Load available providers and set active one
async function loadChatProviders() {
  try {
    const res = await fetch('/api/settings/providers');
    const data = await res.json();

    // Update availability dots
    for (const [name, available] of Object.entries(data.available)) {
      const dot = document.getElementById(`chat-${name}-dot`);
      if (dot) {
        dot.className = `inline-block w-2 h-2 rounded-full mr-1.5 ${available ? 'bg-green-500' : 'bg-gray-300'}`;
      }
    }

    // Select the active provider
    selectChatProvider(data.active);
  } catch {
    selectChatProvider('openai');
  }
}

initChatProviderSelector();
loadChatProviders();

// --- Chat Input ---
chatInput.addEventListener('input', () => {
  chatSend.disabled = !chatInput.value.trim();
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && chatInput.value.trim()) {
    e.preventDefault();
    sendMessage();
  }
});

chatSend.addEventListener('click', sendMessage);

async function sendMessage() {
  const question = chatInput.value.trim();
  if (!question) return;

  if (!chatSelectedProvider) {
    alert('Please select an LLM provider first.');
    return;
  }

  // Clear placeholder on first message
  if (isFirstMessage) {
    chatMessages.innerHTML = '';
    isFirstMessage = false;
  }

  // Add user message with provider badge
  appendMessage('user', question);
  chatInput.value = '';
  chatSend.disabled = true;

  // Show loading
  const loadingId = appendLoading();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, provider: chatSelectedProvider }),
    });

    const data = await res.json();
    removeLoading(loadingId);

    if (data.error) {
      appendMessage('assistant', `Error: ${data.error}`, null, chatSelectedProvider);
    } else {
      appendMessage('assistant', data.answer, data.sources, chatSelectedProvider);
    }
  } catch (err) {
    removeLoading(loadingId);
    appendMessage('assistant', `Error: ${err.message}`, null, chatSelectedProvider);
  }
}

function appendMessage(role, content, sources, provider) {
  const div = document.createElement('div');
  div.className = `flex ${role === 'user' ? 'justify-end' : 'justify-start'}`;

  const bubble = document.createElement('div');
  bubble.className = `max-w-2xl px-4 py-3 text-sm ${role === 'user' ? 'msg-user' : 'msg-assistant'}`;

  // Add provider badge for assistant messages
  let providerBadge = '';
  if (role === 'assistant' && provider) {
    providerBadge = `<div class="text-xs font-medium text-blue-500 mb-1.5 opacity-70">${PROVIDER_LABELS[provider] || provider}</div>`;
  }

  bubble.innerHTML = providerBadge + formatMessage(content);
  div.appendChild(bubble);

  // Add sources if available
  if (sources && sources.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.className = 'flex justify-start';

    const sourcesDiv = document.createElement('div');
    sourcesDiv.className = 'max-w-2xl mt-1';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1';
    toggleBtn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
    </svg> Sources (${sources.length})`;

    const sourcesContent = document.createElement('div');
    sourcesContent.className = 'sources-content mt-2 space-y-2';

    sources.forEach(s => {
      const sourceItem = document.createElement('div');
      sourceItem.className = 'bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs';
      sourceItem.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="font-medium text-gray-700">${escapeHtml(s.filename)}</span>
          <span class="text-gray-400">Score: ${s.score}</span>
        </div>
        <p class="text-gray-500 line-clamp-2">${escapeHtml(s.text)}</p>
      `;
      sourcesContent.appendChild(sourceItem);
    });

    toggleBtn.addEventListener('click', () => {
      sourcesContent.classList.toggle('open');
    });

    sourcesDiv.appendChild(toggleBtn);
    sourcesDiv.appendChild(sourcesContent);
    wrapper.appendChild(sourcesDiv);

    chatMessages.appendChild(div);
    chatMessages.appendChild(wrapper);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return;
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendLoading() {
  const id = 'loading-' + Date.now();
  const div = document.createElement('div');
  div.id = id;
  div.className = 'flex justify-start';
  div.innerHTML = `<div class="msg-assistant px-4 py-3">
    <div class="loading-dots"><span></span><span></span><span></span></div>
  </div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return id;
}

function removeLoading(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function formatMessage(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 rounded text-xs">$1</code>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
