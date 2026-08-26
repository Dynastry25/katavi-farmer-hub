const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');

// GET /api/chat/conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    }).sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/chat/conversations
router.post('/conversations', auth, async (req, res) => {
  try {
    const conversation = await Conversation.create({
      ...req.body,
      participants: [...(req.body.participants || []), req.user._id],
    });
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/chat/conversations/:id/messages
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    const messages = await Message.find({ conversation: req.params.id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/chat/messages
router.post('/messages', auth, async (req, res) => {
  try {
    const message = await Message.create({
      ...req.body,
      sender: req.user._id,
      senderName: req.user.name,
      time: new Date().toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' }),
    });
    
    // Update conversation last message
    await Conversation.findByIdAndUpdate(req.body.conversation, {
      lastMessage: req.body.text,
      lastTime: message.time,
      $inc: { unread: 1 },
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/chat/conversations/:id/read
router.put('/conversations/:id/read', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { conversation: req.params.id, read: false },
      { read: true }
    );
    await Conversation.findByIdAndUpdate(req.params.id, { unread: 0 });
    res.json({ message: 'Ujumbe umesomwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
