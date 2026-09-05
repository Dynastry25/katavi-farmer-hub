const express = require('express');
const router = express.Router();
const AdviceArticle = require('../models/AdviceArticle');
const Expert = require('../models/Expert');
const { auth } = require('../middleware/auth');

// GET /api/advice/articles
router.get('/articles', async (req, res) => {
  try {
    const articles = await AdviceArticle.find({ $or: [{ status: 'approved' }, { status: { $exists: false } }] }).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/advice/experts
router.get('/experts', async (req, res) => {
  try {
    const experts = await Expert.find().populate('user', '-password');
    res.json(experts);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/advice/articles
router.post('/articles', auth, async (req, res) => {
  try {
    const article = await AdviceArticle.create(req.body);
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/advice/articles/:id
router.put('/articles/:id', auth, async (req, res) => {
  try {
    const article = await AdviceArticle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!article) return res.status(404).json({ message: 'Makala haipatikani' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/advice/articles/:id
router.delete('/articles/:id', auth, async (req, res) => {
  try {
    await AdviceArticle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Makala imefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
