const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const cache = require('../services/cache.service');
const {
  dayKey,
  getFarmInsight,
  getMarketInsight,
} = require('../services/insight.service');

// GET /api/v1/insights/farm — daily personalized advisory for one farmer.
router.get('/farm', auth, requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const key = `insights:farm:${req.user._id}:${dayKey()}`;
    const report = await cache.remember(key, cache.TTL.REFERENCE, () => getFarmInsight(req.user));
    res.json(report);
  } catch (error) {
    console.error('Farm insight error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/insights/market?crop=Mahindi — public price trend plus supply.
router.get('/market', async (req, res) => {
  try {
    const crop = String(req.query.crop || '').trim();
    if (!crop) {
      return res.status(400).json({ message: 'Taja zao unalotaka kuchunguza' });
    }

    const key = `insights:market:${crop.toLowerCase()}`;
    const report = await cache.remember(key, cache.TTL.LISTING, () => getMarketInsight(crop));
    res.json(report);
  } catch (error) {
    console.error('Market insight error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
