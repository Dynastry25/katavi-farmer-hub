const express = require('express');
const router = express.Router();
const ContactMessage = require('../models/ContactMessage');
const { requireRole, STAFF_ROLES } = require('../middleware/roleCheck');

const INQUIRY_TYPES = ['general', 'support', 'payment', 'account', 'other'];

// GET /api/contact — support inbox (staff only)
router.get('/', requireRole(...STAFF_ROLES), async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/contact — anyone may send a support message
router.post('/', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: 'Jina, barua pepe, kichwa na ujumbe vinahitajika',
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Barua pepe si sahihi' });
    }
    const inquiryType = INQUIRY_TYPES.includes(req.body.inquiryType)
      ? req.body.inquiryType
      : 'general';

    const created = await ContactMessage.create({
      name: name.slice(0, 120),
      email: email.slice(0, 160),
      phone: String(req.body.phone || '').trim().slice(0, 30),
      subject: subject.slice(0, 160),
      message: message.slice(0, 3000),
      inquiryType,
    });
    res.status(201).json({ message: 'Ujumbe wako umetumwa kikamilifu', data: created });
  } catch (error) {
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za ujumbe hazijakamilika' });
    }
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/contact/:id/read — mark a ticket as read (staff only)
router.put('/:id/read', requireRole(...STAFF_ROLES), async (req, res) => {
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
