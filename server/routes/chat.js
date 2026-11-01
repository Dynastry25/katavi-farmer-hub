const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const PRESENCE_WINDOW_MS = 60 * 1000;
const PRESENCE_TOUCH_MS = 20 * 1000;
const TYPING_WINDOW_MS = 6 * 1000;

const str = (value) => String(value);

const isMember = (conversation, userId) =>
  (conversation?.participants || []).some((p) => str(p) === str(userId));

const otherParticipants = (conversation, userId) =>
  (conversation?.participants || []).filter((p) => str(p) !== str(userId));

// Refresh the caller's lastSeen at most every 20s so inbox/thread polling
// doubles as a presence heartbeat without writing on every request.
const touchPresence = async (user) => {
  if (user.lastSeen && Date.now() - new Date(user.lastSeen).getTime() < PRESENCE_TOUCH_MS) {
    return;
  }
  const now = new Date();
  await User.updateOne({ _id: user._id }, { lastSeen: now });
  user.lastSeen = now;
};

const onlineIds = async (ids) => {
  if (!ids.length) return new Set();
  const users = await User.find({
    _id: { $in: ids },
    lastSeen: { $gt: new Date(Date.now() - PRESENCE_WINDOW_MS) },
  })
    .select('_id')
    .lean();
  return new Set(users.map((u) => str(u._id)));
};

const isTypingFromOthers = (conversation, userId) => {
  if (!conversation?.typingBy) return false;
  const now = Date.now();
  for (const [key, at] of conversation.typingBy.entries()) {
    if (key === str(userId) || !at) continue;
    if (now - new Date(at).getTime() < TYPING_WINDOW_MS) return true;
  }
  return false;
};

// GET /api/chat/conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    await touchPresence(req.user);

    const conversations = await Conversation.find({
      participants: req.user._id,
    }).sort({ updatedAt: -1 });

    if (conversations.length === 0) return res.json([]);

    // Polling the inbox means the device received the messages: mark them delivered.
    await Message.updateMany(
      {
        conversation: { $in: conversations.map((c) => c._id) },
        sender: { $ne: req.user._id },
        deliveredAt: null,
      },
      { $set: { deliveredAt: new Date() } }
    );

    const peerIds = [
      ...new Set(
        conversations.flatMap((c) =>
          otherParticipants(c, req.user._id).map(str)
        )
      ),
    ];
    const online = await onlineIds(peerIds);

    res.json(
      conversations.map((c) => {
        const peers = otherParticipants(c, req.user._id);
        const json = c.toObject({ flattenMaps: true });
        delete json.unreadBy;
        delete json.typingBy;
        return {
          ...json,
          unread: c.unreadBy?.get(str(req.user._id)) || 0,
          online: peers.some((p) => online.has(str(p))),
          typing: isTypingFromOthers(c, req.user._id),
        };
      })
    );
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/chat/contacts — active users from every role, excluding the caller.
router.get('/contacts', auth, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      isActive: true,
    })
      .select('name role location profilePicture lastSeen')
      .sort({ name: 1 })
      .limit(300)
      .lean();

    const cutoff = Date.now() - PRESENCE_WINDOW_MS;
    res.json(
      users.map((u) => ({
        ...u,
        online: u.lastSeen ? new Date(u.lastSeen).getTime() > cutoff : false,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/chat/presence — explicit heartbeat from the app.
router.post('/presence', auth, async (req, res) => {
  try {
    const now = new Date();
    await User.updateOne({ _id: req.user._id }, { lastSeen: now });
    res.json({ online: true, lastSeen: now });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/chat/conversations
router.post('/conversations', auth, async (req, res) => {
  try {
    const participants = [
      ...new Set([...(req.body.participants || []), req.user._id]),
    ];
    if (participants.some((p) => !mongoose.isValidObjectId(p))) {
      return res.status(400).json({ message: 'Washiriki si sahihi' });
    }

    // Reuse an existing 1:1 thread with the same person instead of duplicating.
    if (participants.length === 2) {
      const existing = await Conversation.findOne({
        participants: { $all: participants, $size: 2 },
      });
      if (existing) return res.json(existing);
    }

    const conversation = await Conversation.create({
      name: req.body.name || '',
      type: req.body.type || 'farmer',
      avatar: req.body.avatar || '💬',
      lastMessage: req.body.lastMessage || '',
      participantNames: req.body.participantNames || [],
      members: participants.length,
      participants,
    });
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/chat/conversations/:id/messages
// Opening a thread marks the peer's messages delivered and read.
router.get('/conversations/:id/messages', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Mazungumzo hayapatikani' });
    }
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Mazungumzo hayapatikani' });
    }
    if (!isMember(conversation, req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuona mazungumzo haya' });
    }

    await touchPresence(req.user);

    const now = new Date();
    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, deliveredAt: null },
      { $set: { deliveredAt: now } }
    );
    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, readAt: null },
      { $set: { readAt: now, read: true } }
    );
    await Conversation.updateOne(
      { _id: conversation._id },
      { $set: { [`unreadBy.${str(req.user._id)}`]: 0 } }
    );

    const messages = await Message.find({ conversation: conversation._id })
      .sort({ createdAt: 1 })
      .lean();

    res.json(
      messages.map((m) => ({
        ...m,
        delivered: Boolean(m.deliveredAt) || Boolean(m.readAt),
        read: Boolean(m.readAt) || Boolean(m.read),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/chat/conversations/:id/state — presence + typing for the thread header.
router.get('/conversations/:id/state', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Mazungumzo hayapatikani' });
    }
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Mazungumzo hayapatikani' });
    }
    if (!isMember(conversation, req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuona mazungumzo haya' });
    }

    await touchPresence(req.user);

    const peers = otherParticipants(conversation, req.user._id);
    const online = await onlineIds(peers.map(str));
    const peerUsers = await User.find({ _id: { $in: peers } })
      .select('name lastSeen')
      .lean();
    const lastSeen = peerUsers
      .map((u) => (u.lastSeen ? new Date(u.lastSeen).getTime() : 0))
      .reduce((max, value) => Math.max(max, value), 0);

    res.json({
      online: peers.some((p) => online.has(str(p))),
      typing: isTypingFromOthers(conversation, req.user._id),
      lastSeen: lastSeen ? new Date(lastSeen) : null,
      peerNames: peerUsers.map((u) => u.name),
    });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/chat/conversations/:id/typing — refreshed by the composer while typing.
router.post('/conversations/:id/typing', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Mazungumzo hayapatikani' });
    }
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Mazungumzo hayapatikani' });
    }
    if (!isMember(conversation, req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuona mazungumzo haya' });
    }

    await Conversation.updateOne(
      { _id: conversation._id },
      { $set: { [`typingBy.${str(req.user._id)}`]: new Date() } }
    );
    res.json({ typing: true });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/chat/messages
router.post('/messages', auth, async (req, res) => {
  try {
    const conversationId = req.body.conversation;
    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: 'Mazungumzo si sahihi' });
    }
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Mazungumzo hayapatikani' });
    }
    if (!isMember(conversation, req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kutuma hapa' });
    }

    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    const fileName = typeof req.body.fileName === 'string' ? req.body.fileName : '';
    if (!text && !fileName) {
      return res.status(400).json({ message: 'Ujumbe hauwezi kuwa tupu' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      senderName: req.user.name,
      text,
      type: req.body.type || 'text',
      fileName,
      fileSize: req.body.fileSize || '',
      time: new Date().toLocaleTimeString('sw-TZ', { hour: '2-digit', minute: '2-digit' }),
    });

    const unread = {};
    otherParticipants(conversation, req.user._id).forEach((participant) => {
      unread[`unreadBy.${str(participant)}`] = 1;
    });

    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: { lastMessage: text || fileName, lastTime: message.time },
        $inc: unread,
        $unset: { [`typingBy.${str(req.user._id)}`]: 1 },
      }
    );

    res.status(201).json({
      ...message.toObject(),
      delivered: false,
      read: false,
    });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/chat/conversations/:id/read
router.put('/conversations/:id/read', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Mazungumzo hayapatikani' });
    }
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ message: 'Mazungumzo hayapatikani' });
    }
    if (!isMember(conversation, req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuona mazungumzo haya' });
    }

    const now = new Date();
    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, deliveredAt: null },
      { $set: { deliveredAt: now } }
    );
    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, readAt: null },
      { $set: { readAt: now, read: true } }
    );
    await Conversation.updateOne(
      { _id: conversation._id },
      { $set: { [`unreadBy.${str(req.user._id)}`]: 0 } }
    );

    res.json({ message: 'Ujumbe umesomwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
