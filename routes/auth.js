const router = require('express').Router();
const googleAuth = require('../services/googleAuth');

router.get('/google', (req, res) => {
  const url = googleAuth.getAuthUrl();
  res.redirect(url);
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing authorization code');

    const tokens = await googleAuth.getTokensFromCode(code);
    googleAuth.storeTokens(req.session.id, tokens);
    res.redirect('/?connected=true');
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect('/?error=auth_failed');
  }
});

router.get('/status', (req, res) => {
  const tokens = googleAuth.getTokens(req.session.id);
  res.json({ connected: !!tokens });
});

router.post('/disconnect', (req, res) => {
  googleAuth.clearTokens(req.session.id);
  res.json({ success: true });
});

module.exports = router;
