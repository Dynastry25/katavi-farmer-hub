const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getUserNotifications, markAsRead, markAllAsRead } = require('../services/notification.service');

router.get('/', auth, async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const notifications = await getUserNotifications(req.user._id, { unreadOnly: unreadOnly === 'true' });
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.get('/unread-count', auth, async (req, res) => {
  try {
    const notifications = await getUserNotifications(req.user._id, { unreadOnly: true, limit: 100 });
    res.json({ count: notifications.length });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await markAsRead(req.params.id, req.user._id);
    if (!notification) return res.status(404).json({ message: 'Taarifa haipatikani' });
    res.json(notification);
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    await markAllAsRead(req.user._id);
    res.json({ message: 'Taarifa zote zimesomwa' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
