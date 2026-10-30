const express = require('express');
const router = express.Router();
const Offer = require('../models/Offer');
const AuditLog = require('../models/AuditLog');
const { requirePermission } = require('../middleware/roleCheck');

const serialize = (o) => ({
  id: o._id,
  title: o.title,
  subtitle: o.subtitle,
  emoji: o.emoji,
  image: o.image,
  link: o.link,
  active: o.active,
  audience: o.audience || 'all',
  color: o.color || 'g',
  order: o.order,
  createdAt: o.createdAt,
});

const log = (req, action, targetId) => AuditLog.create({
  user: req.user._id,
  userName: req.user.name,
  userRole: req.user.role,
  action,
  category: 'content',
  targetType: 'Offer',
  targetId,
  ipAddress: req.ip,
});

// Public: active promotional offers for the app home screen.
// `?role=farmer|buyer|expert` filters by the reference `aud` audience.
router.get('/', async (req, res) => {
  try {
    const role = ['farmer', 'buyer', 'expert', 'logistics'].includes(req.query.role)
      ? req.query.role
      : '';
    const filter = { active: true };
    if (role) {
      filter.$or = [
        { audience: 'all' },
        { audience: role },
        { audience: { $exists: false } },
      ];
    }
    const list = await Offer.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();
    res.json({ offers: list.map(serialize) });
  } catch (error) {
    console.error('Offers list error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// Admin: every offer, including inactive ones.
router.get('/admin', requirePermission('content.manage'), async (req, res) => {
  try {
    const list = await Offer.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json({ offers: list.map(serialize) });
  } catch (error) {
    console.error('Admin offers list error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.post('/', requirePermission('content.manage'), async (req, res) => {
  try {
    const { title, subtitle, emoji, image, link, active, audience, color, order } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Kichwa cha ofa kinahitajika' });
    }
    const offer = await Offer.create({
      title: String(title).trim().slice(0, 160),
      subtitle: String(subtitle || '').slice(0, 300),
      emoji: String(emoji || '🎁').slice(0, 8),
      image: String(image || '').slice(0, 1000),
      link: String(link || '/marketplace').slice(0, 300),
      active: active === undefined ? true : Boolean(active),
      audience: ['all', 'farmer', 'buyer', 'expert', 'logistics'].includes(audience) ? audience : 'all',
      color: ['g', 'o', 't', 'd', 'l', 'e'].includes(color) ? color : 'g',
      order: Number(order) || 0,
      createdBy: req.user._id,
    });
    await log(req, 'create_offer', offer._id);
    res.status(201).json({ message: 'Ofa imeongezwa', offer: serialize(offer) });
  } catch (error) {
    console.error('Create offer error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.put('/:id', requirePermission('content.manage'), async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Ofa haipatikani' });
    }
    const { title, subtitle, emoji, image, link, active, audience, color, order } = req.body;
    if (title !== undefined) offer.title = String(title).trim().slice(0, 160);
    if (subtitle !== undefined) offer.subtitle = String(subtitle).slice(0, 300);
    if (emoji !== undefined) offer.emoji = String(emoji).slice(0, 8);
    if (image !== undefined) offer.image = String(image).slice(0, 1000);
    if (link !== undefined) offer.link = String(link).slice(0, 300);
    if (active !== undefined) offer.active = Boolean(active);
    if (audience !== undefined && ['all', 'farmer', 'buyer', 'expert', 'logistics'].includes(audience)) {
      offer.audience = audience;
    }
    if (color !== undefined && ['g', 'o', 't', 'd', 'l', 'e'].includes(color)) {
      offer.color = color;
    }
    if (order !== undefined) offer.order = Number(order) || 0;
    await offer.save();
    await log(req, 'update_offer', offer._id);
    res.json({ message: 'Ofa imehifadhiwa', offer: serialize(offer) });
  } catch (error) {
    console.error('Update offer error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.delete('/:id', requirePermission('content.manage'), async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({ message: 'Ofa haipatikani' });
    }
    await log(req, 'delete_offer', offer._id);
    res.json({ message: 'Ofa imeondolewa' });
  } catch (error) {
    console.error('Delete offer error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
