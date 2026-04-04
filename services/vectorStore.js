const { QdrantClient } = require('@qdrant/js-client-rest');
const { v4: uuidv4 } = require('uuid');
const { getQdrantConfig } = require('../config');

let client = null;
let lastUrl = '';
let lastToken = '';

function getClient() {
  const qdrantCfg = getQdrantConfig();
  const url = qdrantCfg.url;
  const token = qdrantCfg.token || '';

  // Recreate client if connection settings changed
  if (!client || url !== lastUrl || token !== lastToken) {
    const opts = { url };
    if (token) {
      opts.apiKey = token;
    }
    client = new QdrantClient(opts);
    lastUrl = url;
    lastToken = token;
    console.log(`[Qdrant] Client created for ${url}${token ? ' (with token)' : ''}`);
  }
  return client;
}

function getCollectionName() {
  return getQdrantConfig().collection;
}

async function ensureCollection(name, dimensions) {
  const qdrant = getClient();

  try {
    const info = await qdrant.getCollection(name);
    const existingDim = info.config.params.vectors.size;
    if (existingDim !== dimensions) {
      console.log(`[Qdrant] Collection "${name}" has dimension ${existingDim} but provider needs ${dimensions}. Auto-recreating...`);
      await qdrant.deleteCollection(name);
      console.log(`[Qdrant] Deleted old collection "${name}"`);
      await qdrant.createCollection(name, {
        vectors: { size: dimensions, distance: 'Cosine' },
      });
      console.log(`[Qdrant] Created new collection "${name}" with dimension ${dimensions}`);
      return { exists: false, recreated: true };
    }
    console.log(`[Qdrant] Collection "${name}" exists with correct dimension ${dimensions}`);
    return { exists: true, dimensionMismatch: false };
  } catch (err) {
    await qdrant.createCollection(name, {
      vectors: { size: dimensions, distance: 'Cosine' },
    });
    console.log(`[Qdrant] Created Qdrant collection "${name}" with dimension ${dimensions}`);
    return { exists: false, dimensionMismatch: false };
  }
}

async function upsertPoints(collectionName, items) {
  const qdrant = getClient();
  const batchSize = 100;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const points = batch.map(item => ({
      id: uuidv4(),
      vector: item.vector,
      payload: {
        text: item.text,
        filename: item.filename,
        chunkIndex: item.chunkIndex,
        fileId: item.fileId,
      },
    }));
    await qdrant.upsert(collectionName, { points });
  }
}

async function search(collectionName, queryVector, topK = 5) {
  const qdrant = getClient();
  const results = await qdrant.search(collectionName, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
  });
  return results.map(r => ({
    score: r.score,
    text: r.payload.text,
    filename: r.payload.filename,
    chunkIndex: r.payload.chunkIndex,
  }));
}

async function deleteCollection(name) {
  const qdrant = getClient();
  try {
    await qdrant.deleteCollection(name);
    console.log(`[Qdrant] Deleted collection "${name}"`);
    return true;
  } catch {
    return false;
  }
}

async function getCollectionInfo(name) {
  const qdrant = getClient();
  try {
    const info = await qdrant.getCollection(name);
    return {
      exists: true,
      pointsCount: info.points_count,
      vectorSize: info.config.params.vectors.size,
    };
  } catch {
    return { exists: false };
  }
}

async function testConnection() {
  try {
    const qdrant = getClient();
    const collections = await qdrant.getCollections();
    return { success: true, collections: collections.collections.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { ensureCollection, upsertPoints, search, deleteCollection, getCollectionInfo, getCollectionName, testConnection };
