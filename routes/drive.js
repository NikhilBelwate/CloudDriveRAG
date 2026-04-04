const router = require('express').Router();
const googleAuth = require('../services/googleAuth');
const googleDrive = require('../services/googleDrive');

// Auth middleware
function requireAuth(req, res, next) {
  const client = googleAuth.getAuthenticatedClient(req.session.id);
  if (!client) return res.status(401).json({ error: 'Not connected to Google Drive' });
  req.driveClient = client;
  next();
}

router.use(requireAuth);

router.get('/folders', async (req, res, next) => {
  try {
    const { parentId } = req.query;
    const folders = await googleDrive.listFolders(req.driveClient, parentId || null);
    res.json(folders);
  } catch (err) {
    next(err);
  }
});

router.get('/files', async (req, res, next) => {
  try {
    const { folderId } = req.query;
    const files = await googleDrive.listFiles(req.driveClient, folderId || null);
    res.json(files);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
