const express = require('express');
const router = express.Router();
const FarmerGroup = require('../models/FarmerGroup');
const { auth } = require('../middleware/auth');
const { requireRole, requireOwnershipOrAdmin } = require('../middleware/roleCheck');

const groupOwnerId = async (req) => {
  const group = await FarmerGroup.findById(req.params.id).select('createdBy').lean();
  return group && group.createdBy;
};

// GET /api/farmer-groups
router.get('/', async (req, res) => {
  try {
    const groups = await FarmerGroup.find().sort({ createdAt: -1 });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/farmer-groups — farmers (and admins) create groups
router.post('/', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const group = await FarmerGroup.create({
      ...req.body,
      createdBy: req.user._id,
      creatorName: req.user.name,
      members: [req.user._id],
    });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/farmer-groups/:id/join
router.put('/:id/join', auth, async (req, res) => {
  try {
    const group = await FarmerGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Kikundi hiki hakipatikani' });
    if (group.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Tayari uko memberi wa kikundi hiki' });
    }
    if (group.members.length >= group.maxMembers) {
      return res.status(400).json({ message: 'Kikundi kimejaa' });
    }
    group.members.push(req.user._id);
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/farmer-groups/:id — creator (or admin) only
router.put('/:id', requireOwnershipOrAdmin(groupOwnerId), async (req, res) => {
  try {
    const group = await FarmerGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!group) return res.status(404).json({ message: 'Kikundi hiki hakipatikani' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/farmer-groups/:id — creator (or admin) only
router.delete('/:id', requireOwnershipOrAdmin(groupOwnerId), async (req, res) => {
  try {
    await FarmerGroup.findByIdAndDelete(req.params.id);
    res.json({ message: 'Kikundi kimefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
