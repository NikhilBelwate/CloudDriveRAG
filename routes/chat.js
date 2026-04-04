const router = require('express').Router();
const rag = require('../services/rag');

router.post('/', async (req, res, next) => {
  try {
    const { question, provider, topK } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    const result = await rag.query(question.trim(), provider, topK || 5);
    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
