const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  // Google Docs native types (will be exported)
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
];

const EXPORT_MIME_MAP = {
  'application/vnd.google-apps.document': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const EXTENSION_MAP = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'application/vnd.google-apps.document': '.docx',
  'application/vnd.google-apps.spreadsheet': '.xlsx',
};

function getDrive(authClient) {
  return google.drive({ version: 'v3', auth: authClient });
}

async function listFolders(authClient, parentId) {
  const drive = getDrive(authClient);
  const query = parentId
    ? `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    : `'root' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    orderBy: 'name',
    pageSize: 100,
  });

  return res.data.files || [];
}

async function listFiles(authClient, folderId) {
  const drive = getDrive(authClient);
  const mimeQuery = SUPPORTED_MIME_TYPES.map(m => `mimeType='${m}'`).join(' or ');
  const query = `'${folderId || 'root'}' in parents and (${mimeQuery}) and trashed=false`;

  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, size)',
    orderBy: 'name',
    pageSize: 200,
  });

  return (res.data.files || []).map(f => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: f.size ? parseInt(f.size) : null,
    extension: EXTENSION_MAP[f.mimeType] || '',
  }));
}

async function downloadFile(authClient, fileId, mimeType, destDir) {
  const drive = getDrive(authClient);
  const ext = EXTENSION_MAP[mimeType] || '.bin';
  const destPath = path.join(destDir, `${fileId}${ext}`);

  const isGoogleType = mimeType.startsWith('application/vnd.google-apps.');

  let response;
  if (isGoogleType) {
    const exportMime = EXPORT_MIME_MAP[mimeType];
    response = await drive.files.export(
      { fileId, mimeType: exportMime },
      { responseType: 'stream' }
    );
  } else {
    response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
  }

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);
    writer.on('finish', () => resolve(destPath));
    writer.on('error', reject);
    response.data.on('error', reject);
  });
}

module.exports = { listFolders, listFiles, downloadFile };
