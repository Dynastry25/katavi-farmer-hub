const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const PriceAlert = require('../models/PriceAlert');

// GET /api/v1/price-alerts/my
router.get('/my', auth, async (req, res) => {
  try {
    const alerts = await PriceAlert.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error) {
    console.error('Get my price alerts error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/price-alerts  { crop, thresholdPct }
router.post('/', auth, async (req, res) => {
  try {
    const { crop, thresholdPct } = req.body;
    if (!crop) return res.status(400).json({ message: 'Jina la zao linahitajika' });
    const threshold = Number(thresholdPct) || 10;
    const cropMatch = new RegExp(`^${String(crop).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    const existing = await PriceAlert.findOne({ user: req.user._id, crop: cropMatch });
    if (existing) {
      existing.thresholdPct = threshold;
      existing.active = true;
      existing.lastNotifiedPrice = null;
      await existing.save();
      return res.json(existing);
    }

    const created = await PriceAlert.create({
      user: req.user._id,
      crop: String(crop).trim(),
      thresholdPct: threshold,
    });
    return res.status(201).json(created);
  } catch (error) {
    console.error('Create price alert error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/price-alerts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const alert = await PriceAlert.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!alert) return res.status(404).json({ message: 'Tahadhari haipatikani' });
    res.json({ message: 'Tahadhari imefutwa' });
  } catch (error) {
    console.error('Delete price alert error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;