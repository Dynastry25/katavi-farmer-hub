const express = require('express');
const router = express.Router();
const CropType = require('../models/CropType');
const AuditLog = require('../models/AuditLog');
const { requirePermission } = require('../middleware/roleCheck');

const serialize = (c) => ({
  id: c._id,
  slug: c.slug,
  name: c.name,
  nameEn: c.nameEn,
  image: c.image,
  icon: c.icon,
  order: c.order,
  active: c.active,
  createdAt: c.createdAt,
});

const normalizeSlug = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

const log = (req, action, targetId) => AuditLog.create({
  user: req.user._id,
  userName: req.user.name,
  userRole: req.user.role,
  action,
  category: 'content',
  targetType: 'CropType',
  targetId,
  ipAddress: req.ip,
});

// Public: active crop types for the home "Aina za mazao" section.
router.get('/', async (req, res) => {
  try {
    const list = await CropType.find({ active: true })
      .sort({ order: 1, createdAt: 1 })
      .lean();
    res.json({ cropTypes: list.map(serialize) });
  } catch (error) {
    console.error('Crop types list error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// Admin: every crop type, including inactive ones.
router.get('/admin', requirePermission('content.manage'), async (req, res) => {
  try {
    const list = await CropType.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json({ cropTypes: list.map(serialize) });
  } catch (error) {
    console.error('Admin crop types list error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.post('/', requirePermission('content.manage'), async (req, res) => {
  try {
    const { slug, name, nameEn, image, icon, order, active } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Jina la aina ya zao linahitajika' });
    }
    const normalized = normalizeSlug(slug || name);
    if (!normalized) {
      return res.status(400).json({ message: 'Kitambulisho cha aina ya zao si sahihi' });
    }
    const duplicate = await CropType.findOne({ slug: normalized });
    if (duplicate) {
      return res.status(409).json({ message: 'Aina hii ya zao ipo tayari' });
    }
    const cropType = await CropType.create({
      slug: normalized,
      name: String(name).trim().slice(0, 80),
      nameEn: String(nameEn || '').trim().slice(0, 80),
      image: String(image || '').slice(0, 1000),
      icon: String(icon || '🌾').slice(0, 8),
      order: Number(order) || 0,
      active: active === undefined ? true : Boolean(active),
    });
    await log(req, 'create_crop_type', cropType._id);
    res.status(201).json({ message: 'Aina ya zao imeongezwa', cropType: serialize(cropType) });
  } catch (error) {
    console.error('Create crop type error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.put('/:id', requirePermission('content.manage'), async (req, res) => {
  try {
    const cropType = await CropType.findById(req.params.id);
    if (!cropType) {
      return res.status(404).json({ message: 'Aina ya zao haipatikani' });
    }
    const { slug, name, nameEn, image, icon, order, active } = req.body;
    if (name !== undefined) cropType.name = String(name).trim().slice(0, 80);
    if (nameEn !== undefined) cropType.nameEn = String(nameEn).trim().slice(0, 80);
    if (slug !== undefined) {
      const normalized = normalizeSlug(slug);
      if (!normalized) {
        return res.status(400).json({ message: 'Kitambulisho cha aina ya zao si sahihi' });
      }
      if (normalized !== cropType.slug) {
        const duplicate = await CropType.findOne({ slug: normalized });
        if (duplicate) {
          return res.status(409).json({ message: 'Aina hii ya zao ipo tayari' });
        }
        cropType.slug = normalized;
      }
    }
    if (image !== undefined) cropType.image = String(image).slice(0, 1000);
    if (icon !== undefined) cropType.icon = String(icon).slice(0, 8);
    if (order !== undefined) cropType.order = Number(order) || 0;
    if (active !== undefined) cropType.active = Boolean(active);
    await cropType.save();
    await log(req, 'update_crop_type', cropType._id);
    res.json({ message: 'Aina ya zao imehifadhiwa', cropType: serialize(cropType) });
  } catch (error) {
    console.error('Update crop type error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.delete('/:id', requirePermission('content.manage'), async (req, res) => {
  try {
    const cropType = await CropType.findByIdAndDelete(req.params.id);
    if (!cropType) {
      return res.status(404).json({ message: 'Aina ya zao haipatikani' });
    }
    await log(req, 'delete_crop_type', cropType._id);
    res.json({ message: 'Aina ya zao imeondolewa' });
  } catch (error) {
    console.error('Delete crop type error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
