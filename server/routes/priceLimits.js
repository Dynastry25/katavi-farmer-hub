const express = require('express');
const router = express.Router();
const PriceLimit = require('../models/PriceLimit');
const { auth } = require('../middleware/auth');

const STAFF_ROLES = ['admin', 'support', 'finance_officer'];

// GET /api/v1/price-limits — public listing
router.get('/', async (req, res) => {
  try {
    const limits = await PriceLimit.find({ active: true }).sort({ cropName: 1 });
    res.json(limits);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/price-limits/all — admin (includes inactive)
router.get('/all', auth, async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa' });
    }
    const limits = await PriceLimit.find().sort({ cropName: 1 });
    res.json(limits);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/price-limits — admin creates/updates a limit
router.post('/', auth, async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa' });
    }
    const { cropName, category, minPrice, maxPrice, unit, active } = req.body;
    if (!cropName || minPrice == null || maxPrice == null) {
      return res.status(400).json({ message: 'Jina la zao, bei ya chini na bei ya juu zinahitajika' });
    }
    if (minPrice > maxPrice) {
      return res.status(400).json({ message: 'Bei ya chini haiwezi kuwa zaidi ya bei ya juu' });
    }

    const limit = await PriceLimit.findOneAndUpdate(
      { cropName: cropName.trim() },
      { cropName: cropName.trim(), category, minPrice, maxPrice, unit: unit || 'kg', active: active !== false, updatedBy: req.user._id },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(limit);
  } catch (error) {
    console.error('Save price limit error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/price-limits/:id — admin removes a limit
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa' });
    }
    await PriceLimit.findByIdAndDelete(req.params.id);
    res.json({ message: 'Kiwango kimefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
