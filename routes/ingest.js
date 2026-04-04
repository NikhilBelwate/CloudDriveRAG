const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const googleAuth = require('../services/googleAuth');
const googleDrive = require('../services/googleDrive');
const { parseFile } = require('../services/parser');
const { chunkText } = require('../services/chunker');
const { embed, getDimensions } = require('../services/embedding');
const vectorStore = require('../services/vectorStore');
const { config } = require('../config');

const tempDir = path.join(__dirname, '..', 'temp');

router.post('/folder', async (req, res) => {
  const client = googleAuth.getAuthenticatedClient(req.session.id);
  if (!client) return res.status(401).json({ error: 'Not connected to Google Drive' });

  const { folderId, fileIds, provider } = req.body;
  if (!provider) return res.status(400).json({ error: 'Provider is required' });
  if (!folderId && !fileIds) return res.status(400).json({ error: 'folderId or fileIds required' });

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Ensure Qdrant collection
    const dimensions = getDimensions(provider);
    console.log(`[Ingest] Provider: ${provider}, Dimensions: ${dimensions}`);

    const collectionResult = await vectorStore.ensureCollection(config.qdrant.collection, dimensions);
    console.log(`[Ingest] Collection result:`, collectionResult);

    if (collectionResult.recreated) {
      sendEvent({ type: 'info', message: `Knowledge base was recreated for ${provider} (dimension ${dimensions}). Previous data cleared.` });
    }

    // Get files to process
    let files;
    if (fileIds && fileIds.length > 0) {
      const allFiles = await googleDrive.listFiles(client, folderId);
      files = allFiles.filter(f => fileIds.includes(f.id));
    } else {
      files = await googleDrive.listFiles(client, folderId);
    }

    console.log(`[Ingest] Files to process: ${files.length}`, files.map(f => f.name));
    sendEvent({ type: 'start', totalFiles: files.length });

    let totalChunks = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      sendEvent({ type: 'file_start', file: file.name, index: i + 1, total: files.length });

      let filePath;
      try {
        // Step 1: Download
        console.log(`[Ingest] Downloading: ${file.name} (${file.mimeType})`);
        filePath = await googleDrive.downloadFile(client, file.id, file.mimeType, tempDir);
        const fileSize = fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
        console.log(`[Ingest] Downloaded to: ${filePath} (${fileSize} bytes)`);

        if (fileSize === 0) {
          sendEvent({ type: 'file_skip', file: file.name, reason: 'Downloaded file is empty (0 bytes)' });
          continue;
        }

        // Step 2: Parse
        console.log(`[Ingest] Parsing: ${file.name}`);
        const { text, metadata } = await parseFile(filePath);
        console.log(`[Ingest] Parsed: ${file.name} — ${text ? text.length : 0} chars`, metadata);

        if (!text || !text.trim()) {
          sendEvent({ type: 'file_skip', file: file.name, reason: 'No text content extracted' });
          continue;
        }

        // Step 3: Chunk
        const chunks = chunkText(text);
        console.log(`[Ingest] Chunked: ${file.name} — ${chunks.length} chunks`);

        if (chunks.length === 0) {
          sendEvent({ type: 'file_skip', file: file.name, reason: 'No chunks generated' });
          continue;
        }

        // Step 4: Embed
        console.log(`[Ingest] Embedding ${chunks.length} chunks with ${provider}...`);
        const embeddings = await embed(chunks, provider);
        console.log(`[Ingest] Embedded: got ${embeddings.length} vectors, dim=${embeddings[0]?.length}`);

        if (embeddings.length !== chunks.length) {
          sendEvent({ type: 'file_error', file: file.name, error: `Embedding count mismatch: ${embeddings.length} embeddings for ${chunks.length} chunks` });
          continue;
        }

        // Step 5: Store in Qdrant
        console.log(`[Ingest] Upserting ${chunks.length} points to Qdrant...`);
        const items = chunks.map((chunkText, idx) => ({
          vector: embeddings[idx],
          text: chunkText,
          filename: file.name,
          chunkIndex: idx,
          fileId: file.id,
        }));
        await vectorStore.upsertPoints(config.qdrant.collection, items);
        console.log(`[Ingest] Upserted ${items.length} points for ${file.name}`);

        totalChunks += chunks.length;
        sendEvent({ type: 'file_done', file: file.name, chunks: chunks.length });
      } catch (err) {
        console.error(`[Ingest] Error processing ${file.name}:`, err.message);
        console.error(err.stack);
        sendEvent({ type: 'file_error', file: file.name, error: err.message });
      } finally {
        // Clean up temp file
        if (filePath && fs.existsSync(filePath)) {
          try { fs.unlinkSync(filePath); } catch {}
        }
      }
    }

    sendEvent({ type: 'complete', totalFiles: files.length, totalChunks });
    console.log(`[Ingest] Complete: ${files.length} files, ${totalChunks} total chunks`);
  } catch (err) {
    console.error('[Ingest] Fatal error:', err.message);
    console.error(err.stack);
    sendEvent({ type: 'error', message: err.message });
  }

  res.end();
});

router.delete('/collection', async (req, res) => {
  try {
    await vectorStore.deleteCollection(config.qdrant.collection);
    res.json({ success: true, message: 'Knowledge base reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const info = await vectorStore.getCollectionInfo(config.qdrant.collection);
    res.json(info);
  } catch (err) {
    res.json({ exists: false, error: err.message });
  }
});

module.exports = router;
