const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const AuditLog = require('../models/AuditLog');
const { requirePermission } = require('../middleware/roleCheck');

const serialize = (a) => ({
  id: a._id,
  title: a.title,
  message: a.message,
  type: a.type,
  date: a.date,
  location: a.location,
  image: a.image,
  active: a.active,
  order: a.order,
  createdAt: a.createdAt,
});

const log = (req, action, targetId) => AuditLog.create({
  user: req.user._id,
  userName: req.user.name,
  userRole: req.user.role,
  action,
  category: 'content',
  targetType: 'Announcement',
  targetId,
  ipAddress: req.ip,
});

// Public: active announcements for the mobile/web app.
router.get('/', async (req, res) => {
  try {
    const list = await Announcement.find({ active: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ announcements: list.map(serialize) });
  } catch (error) {
    console.error('Announcements list error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// Admin: every announcement, including inactive ones.
router.get('/admin', requirePermission('content.manage'), async (req, res) => {
  try {
    const list = await Announcement.find()
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ announcements: list.map(serialize) });
  } catch (error) {
    console.error('Admin announcements list error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.post('/', requirePermission('content.manage'), async (req, res) => {
  try {
    const { title, message, type, date, location, image, active, order } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Kichwa cha tangazo kinahitajika' });
    }
    const announcement = await Announcement.create({
      title: String(title).trim().slice(0, 200),
      message: String(message || '').slice(0, 2000),
      type: type || 'general',
      date: String(date || '').slice(0, 60),
      location: String(location || '').slice(0, 120),
      image: String(image || '').slice(0, 1000),
      active: active === undefined ? true : Boolean(active),
      order: Number(order) || 0,
      createdBy: req.user._id,
    });
    await log(req, 'create_announcement', announcement._id);
    res.status(201).json({ message: 'Tangazo limeongezwa', announcement: serialize(announcement) });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.put('/:id', requirePermission('content.manage'), async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Tangazo halipatikani' });
    }
    const { title, message, type, date, location, image, active, order } = req.body;
    if (title !== undefined) announcement.title = String(title).trim().slice(0, 200);
    if (message !== undefined) announcement.message = String(message).slice(0, 2000);
    if (type !== undefined) announcement.type = type;
    if (date !== undefined) announcement.date = String(date).slice(0, 60);
    if (location !== undefined) announcement.location = String(location).slice(0, 120);
    if (image !== undefined) announcement.image = String(image).slice(0, 1000);
    if (active !== undefined) announcement.active = Boolean(active);
    if (order !== undefined) announcement.order = Number(order) || 0;
    await announcement.save();
    await log(req, 'update_announcement', announcement._id);
    res.json({ message: 'Tangazo limehifadhiwa', announcement: serialize(announcement) });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.delete('/:id', requirePermission('content.manage'), async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Tangazo halipatikani' });
    }
    await log(req, 'delete_announcement', announcement._id);
    res.json({ message: 'Tangazo limeondolewa' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
