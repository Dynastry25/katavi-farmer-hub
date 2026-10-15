const express = require('express');
const router = express.Router();
const NewsArticle = require('../models/NewsArticle');
const { requirePermission } = require('../middleware/roleCheck');

// GET /api/news
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = { $or: [{ status: 'approved' }, { status: { $exists: false } }] };
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

// POST /api/news — content staff only
router.post('/', requirePermission('content.manage'), async (req, res) => {
  try {
    const article = await NewsArticle.create(req.body);
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/news/:id — content staff only
router.put('/:id', requirePermission('content.manage'), async (req, res) => {
  try {
    const article = await NewsArticle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!article) return res.status(404).json({ message: 'Makala haipatikani' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/news/:id — content staff only
router.delete('/:id', requirePermission('content.manage'), async (req, res) => {
  try {
    await NewsArticle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Makala imefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
