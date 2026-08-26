const express = require('express');
const router = express.Router();
const NewsArticle = require('../models/NewsArticle');
const { auth } = require('../middleware/auth');

// GET /api/news
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = {};
    if (category && category !== 'all') query.category = category;
    const articles = await NewsArticle.find(query).sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/news/:id
router.get('/:id', async (req, res) => {
  try {
    const article = await NewsArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: ' makala haipatikani' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/news/:id/view
router.put('/:id/view', async (req, res) => {
  try {
    const article = await NewsArticle.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!article) return res.status(404).json({ message: 'Makala haipatikani' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/news
router.post('/', auth, async (req, res) => {
  try {
    const article = await NewsArticle.create(req.body);
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/news/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const article = await NewsArticle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!article) return res.status(404).json({ message: 'Makala haipatikani' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/news/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await NewsArticle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Makala imefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
