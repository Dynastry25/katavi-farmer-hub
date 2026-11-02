const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const { requirePermission } = require('../middleware/roleCheck');

// GET /api/videos
router.get('/', async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/videos — content staff only
router.post('/', requirePermission('content.manage'), async (req, res) => {
  try {
    const video = await Video.create({
      title: req.body.title,
      duration: req.body.duration,
      category: req.body.category,
      thumbnail: req.body.thumbnail,
      description: req.body.description,
      url: req.body.url,
    });
    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
