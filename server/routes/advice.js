const express = require('express');
const router = express.Router();
const AdviceArticle = require('../models/AdviceArticle');
const Expert = require('../models/Expert');
const { auth, optionalAuth } = require('../middleware/auth');
const { requireRole, STAFF_ROLES } = require('../middleware/roleCheck');

// Owner (author) or staff may edit/delete an article.
const canManageArticle = async (req) => {
  if (STAFF_ROLES.includes(req.user.role)) return true;
  const article = await AdviceArticle.findById(req.params.id).select('author').lean();
  return !!(article && article.author && article.author.toString() === req.user._id.toString());
};

// GET /api/advice/articles — public feed; `?mine=true` (auth) returns the
// caller's own articles including drafts/under-review.
router.get('/articles', optionalAuth, async (req, res) => {
  try {
    if (req.query.mine === 'true') {
      if (!req.user) {
        return res.status(401).json({ message: 'Usajili unahitajika' });
      }
      const mine = await AdviceArticle.find({ author: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
      return res.json(mine);
    }
    const articles = await AdviceArticle.find({ status: 'approved' }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/advice/experts
router.get('/experts', async (req, res) => {
  try {
    const experts = await Expert.find().populate(
      'user',
      'name profilePicture location district'
    ).limit(100).lean();
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
    const editable = ['title', 'excerpt', 'content', 'category', 'readTime', 'image'];
    const updates = {};
    for (const key of editable) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (req.body.status !== undefined) {
      if (!['admin', 'content_moderator'].includes(req.user.role)) {
        return res.status(403).json({ message: 'Hali ya makala hurekebishwa na wahariri' });
      }
      if (!['pending', 'approved', 'rejected'].includes(req.body.status)) {
        return res.status(400).json({ message: 'Hali ya makala si sahihi' });
      }
      updates.status = req.body.status;
    }
    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'Hakuna mabadiliko yaliyotolewa' });
    }
    const article = await AdviceArticle.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!article) return res.status(404).json({ message: 'Makala haipatikani' });
    res.json(article);
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za makala hazijakamilika' });
    }
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
