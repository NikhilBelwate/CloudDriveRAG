let breadcrumb = [{ id: null, name: 'My Drive' }];
let currentFiles = [];
let selectedFileIds = new Set();

async function loadFolder(folderId) {
  const foldersEl = document.getElementById('folders-list');
  const filesEl = document.getElementById('files-list');

  foldersEl.innerHTML = '<div class="col-span-4 text-center text-gray-400 py-4">Loading...</div>';
  filesEl.innerHTML = '';
  selectedFileIds.clear();
  updateIngestButton();

  try {
    const query = folderId ? `?parentId=${folderId}` : '';
    const fileQuery = folderId ? `?folderId=${folderId}` : '';

    const [foldersRes, filesRes] = await Promise.all([
      fetch(`/api/drive/folders${query}`),
      fetch(`/api/drive/files${fileQuery}`),
    ]);

    const folders = await foldersRes.json();
    const files = await filesRes.json();
    currentFiles = files;

    renderBreadcrumb();
    renderFolders(folders);
    renderFiles(files);
  } catch (err) {
    foldersEl.innerHTML = `<div class="col-span-4 text-red-500 py-4">${err.message}</div>`;
  }
}

function renderBreadcrumb() {
  const nav = document.getElementById('breadcrumb');
  nav.innerHTML = breadcrumb.map((item, i) => {
    const isLast = i === breadcrumb.length - 1;
    const btn = `<button class="breadcrumb-item hover:text-blue-600 ${isLast ? 'text-gray-800 font-semibold' : 'text-gray-500'}"
      data-index="${i}">${item.name}</button>`;
    const separator = i < breadcrumb.length - 1 ? '<span class="text-gray-400 mx-1">/</span>' : '';
    return btn + separator;
  }).join('');

  nav.querySelectorAll('.breadcrumb-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const target = breadcrumb[idx];
      breadcrumb = breadcrumb.slice(0, idx + 1);
      loadFolder(target.id);
    });
  });
}

function renderFolders(folders) {
  const el = document.getElementById('folders-list');
  if (folders.length === 0) {
    el.innerHTML = '';
    return;
  }

  el.innerHTML = folders.map(f => `
    <button class="folder-item flex items-center gap-2 p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-left"
      data-id="${f.id}" data-name="${f.name}">
      <svg class="w-5 h-5 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
      </svg>
      <span class="text-sm text-gray-700 truncate">${f.name}</span>
    </button>
  `).join('');

  el.querySelectorAll('.folder-item').forEach(btn => {
    btn.addEventListener('click', () => {
      breadcrumb.push({ id: btn.dataset.id, name: btn.dataset.name });
      loadFolder(btn.dataset.id);
    });
  });
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const mimeIcons = {
    pdf: { class: 'file-icon-pdf', label: 'PDF' },
    xlsx: { class: 'file-icon-xls', label: 'XLSX' },
    xls: { class: 'file-icon-xls', label: 'XLS' },
    docx: { class: 'file-icon-doc', label: 'DOCX' },
    doc: { class: 'file-icon-doc', label: 'DOC' },
  };
  return mimeIcons[ext] || { class: 'text-gray-400', label: ext.toUpperCase() };
}

function formatSize(bytes) {
  if (!bytes) return '--';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function renderFiles(files) {
  const el = document.getElementById('files-list');
  if (files.length === 0) {
    el.innerHTML = '<div class="text-gray-400 text-sm py-4 text-center">No supported files in this folder</div>';
    return;
  }

  el.innerHTML = files.map(f => {
    const icon = getFileIcon(f.name);
    return `
      <label class="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer">
        <input type="checkbox" class="file-checkbox rounded border-gray-300" data-id="${f.id}" value="${f.id}">
        <span class="text-xs font-bold px-1.5 py-0.5 rounded ${icon.class} bg-gray-100">${icon.label}</span>
        <span class="text-sm text-gray-700 flex-1 truncate">${f.name}</span>
        <span class="text-xs text-gray-400">${formatSize(f.size)}</span>
      </label>
    `;
  }).join('');

  el.querySelectorAll('.file-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedFileIds.add(cb.dataset.id);
      else selectedFileIds.delete(cb.dataset.id);
      updateIngestButton();
    });
  });
}

function updateIngestButton() {
  const btn = document.getElementById('ingest-btn');
  const count = selectedFileIds.size;
  btn.disabled = count === 0;
  btn.textContent = count > 0 ? `Ingest Selected (${count})` : 'Ingest Selected';
}

// Select all
document.getElementById('select-all').addEventListener('change', (e) => {
  const checked = e.target.checked;
  document.querySelectorAll('.file-checkbox').forEach(cb => {
    cb.checked = checked;
    if (checked) selectedFileIds.add(cb.dataset.id);
    else selectedFileIds.delete(cb.dataset.id);
  });
  updateIngestButton();
});

// Ingest button
document.getElementById('ingest-btn').addEventListener('click', startIngestion);

async function startIngestion() {
  if (selectedFileIds.size === 0) return;

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id;
  const progressEl = document.getElementById('ingest-progress');
  const progressList = document.getElementById('progress-list');
  const progressSummary = document.getElementById('progress-summary');

  progressEl.classList.remove('hidden');
  progressList.innerHTML = '';
  progressSummary.classList.add('hidden');

  document.getElementById('ingest-btn').disabled = true;

  try {
    const response = await fetch('/api/ingest/folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderId: currentFolderId,
        fileIds: Array.from(selectedFileIds),
        provider: activeProvider,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            handleIngestEvent(event, progressList, progressSummary);
          } catch {}
        }
      }
    }
  } catch (err) {
    progressList.innerHTML += `<div class="text-red-500 text-sm">Error: ${err.message}</div>`;
  }

  document.getElementById('ingest-btn').disabled = false;
}

function handleIngestEvent(event, listEl, summaryEl) {
  switch (event.type) {
    case 'start':
      listEl.innerHTML += `<div class="text-sm text-gray-500">Processing ${event.totalFiles} file(s)...</div>`;
      break;
    case 'file_start':
      listEl.innerHTML += `<div id="file-${event.index}" class="flex items-center gap-2 text-sm">
        <div class="loading-dots"><span></span><span></span><span></span></div>
        <span class="text-gray-600">${event.file}</span>
        <span class="text-gray-400">(${event.index}/${event.total})</span>
      </div>`;
      listEl.scrollTop = listEl.scrollHeight;
      break;
    case 'file_done':
      const doneEl = document.getElementById(`file-${getFileIndex(event.file, listEl)}`);
      updateFileStatus(listEl, event.file, `<span class="text-green-600">&#10003;</span>`, `${event.chunks} chunks`);
      break;
    case 'file_skip':
      updateFileStatus(listEl, event.file, `<span class="text-yellow-500">&#9888;</span>`, event.reason);
      break;
    case 'file_error':
      updateFileStatus(listEl, event.file, `<span class="text-red-500">&#10007;</span>`, event.error);
      break;
    case 'complete':
      summaryEl.classList.remove('hidden');
      summaryEl.innerHTML = `<span class="font-medium text-green-700">Ingestion complete!</span> ${event.totalFiles} files processed, ${event.totalChunks} chunks created.`;
      break;
    case 'error':
      listEl.innerHTML += `<div class="text-red-500 text-sm p-2 bg-red-50 rounded">${event.message}</div>`;
      break;
  }
}

function updateFileStatus(listEl, filename, icon, detail) {
  const items = listEl.querySelectorAll('.flex.items-center');
  for (const item of items) {
    if (item.textContent.includes(filename)) {
      const dots = item.querySelector('.loading-dots');
      if (dots) dots.outerHTML = icon;
      if (detail) {
        item.innerHTML += `<span class="text-gray-400 text-xs ml-auto">${detail}</span>`;
      }
      break;
    }
  }
}

function getFileIndex(filename, listEl) {
  const items = listEl.children;
  for (let i = 0; i < items.length; i++) {
    if (items[i].textContent.includes(filename)) return i;
  }
  return -1;
}

// Reset knowledge base
document.getElementById('reset-kb-btn').addEventListener('click', async () => {
  if (!confirm('Reset the entire knowledge base? All ingested data will be deleted.')) return;

  try {
    const res = await fetch('/api/ingest/collection', { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      alert('Knowledge base reset successfully.');
    }
  } catch (err) {
    alert('Failed to reset: ' + err.message);
  }
});
