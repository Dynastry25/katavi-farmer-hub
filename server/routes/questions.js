const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { auth, optionalAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

// Roles allowed to answer farmer questions.
const ANSWER_ROLES = ['expert', 'admin', 'content_moderator', 'support'];

// GET /api/v1/questions?status=&category=&mine=&search=
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { status, category, mine, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (mine === 'true') {
      if (!req.user) return res.status(401).json({ message: 'Tokeni siyo sahihi' });
      filter.asker = req.user._id;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
      ];
    }
    const questions = await Question.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/questions/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true },
    );
    if (!question) return res.status(404).json({ message: 'Swali halipatikani' });
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/questions — any authenticated user can ask
router.post('/', auth, async (req, res) => {
  try {
    const { title, body, category, image } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Kichwa cha swali kinahitajika' });
    }
    const question = await Question.create({
      title: title.trim(),
      body: body || '',
      category: category || 'general',
      image: image || '',
      asker: req.user._id,
      askerName: req.user.name,
    });
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/questions/:id/answers — experts and content staff answer
router.post('/:id/answers', requireRole(...ANSWER_ROLES), async (req, res) => {
  try {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ message: 'Jibu linahitajika' });
    }
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Swali halipatikani' });

    question.answers.push({
      body: body.trim(),
      author: req.user._id,
      authorName: req.user.name,
      authorRole: req.user.role,
    });
    question.status = 'answered';
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/questions/:id — asker (or staff) can edit
router.put('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Swali halipatikani' });
    const isOwner =
      question.asker && question.asker.toString() === req.user._id.toString();
    const isStaff = ['admin', 'support', 'content_moderator'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuhariri swali hili' });
    }
    const { title, body, category, image } = req.body;
    if (title !== undefined) question.title = title;
    if (body !== undefined) question.body = body;
    if (category !== undefined) question.category = category;
    if (image !== undefined) question.image = image;
    await question.save();
    res.json(question);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/questions/:id — asker or staff
router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Swali halipatikani' });
    const isOwner =
      question.asker && question.asker.toString() === req.user._id.toString();
    const isStaff = ['admin', 'support', 'content_moderator'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'Huna ruhusa ya kufuta swali hili' });
    }
    await question.deleteOne();
    res.json({ message: 'Swali limefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
