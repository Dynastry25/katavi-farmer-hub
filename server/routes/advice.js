const express = require('express');
const router = express.Router();
const AdviceArticle = require('../models/AdviceArticle');
const Expert = require('../models/Expert');
const { auth } = require('../middleware/auth');
const { requireRole, STAFF_ROLES } = require('../middleware/roleCheck');

// Owner (author) or staff may edit/delete an article.
const canManageArticle = async (req) => {
  if (STAFF_ROLES.includes(req.user.role)) return true;
  const article = await AdviceArticle.findById(req.params.id).select('author').lean();
  return !!(article && article.author && article.author.toString() === req.user._id.toString());
};

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

// POST /api/advice/articles — experts and content staff author articles
router.post('/articles', requireRole('expert', 'admin', 'content_moderator'), async (req, res) => {
  try {
    const article = await AdviceArticle.create({
      ...req.body,
      author: req.user._id,
      authorName: req.user.name,
    });
    res.status(201).json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/advice/articles/:id — author (or staff) only
router.put('/articles/:id', auth, async (req, res) => {
  try {
    if (!(await canManageArticle(req))) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuhariri makala hii' });
    }
    const article = await AdviceArticle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!article) return res.status(404).json({ message: 'Makala haipatikani' });
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/advice/articles/:id — author (or staff) only
router.delete('/articles/:id', auth, async (req, res) => {
  try {
    if (!(await canManageArticle(req))) {
      return res.status(403).json({ message: 'Huna ruhusa ya kufuta makala hii' });
    }
    await AdviceArticle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Makala imefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
