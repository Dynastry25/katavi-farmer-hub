const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const { auth } = require('../middleware/auth');

// GET /api/contact
router.get('/', auth, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const message = await ContactMessage.create(req.body);
    res.status(201).json({ message: 'Ujumbe wako umetumwa kikamilifu', data: message });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/contact/:id/read
router.put('/:id/read', auth, async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!message) return res.status(404).json({ message: 'Ujumbe huu haupatikani' });
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
