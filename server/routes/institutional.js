const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/roleCheck');
const cache = require('../services/cache.service');
const {
  clampDays,
  getOverview,
  getDistricts,
  getMonthly,
} = require('../services/institutional.service');

// GET /api/v1/institutional/overview — public impact snapshot (counts only).
router.get('/overview', async (req, res) => {
  try {
    const days = clampDays(req.query.days);
    const report = await cache.remember(
      `institutional:overview:${days}`,
      cache.TTL.REFERENCE,
      () => getOverview({ days }),
    );
    res.json(report);
  } catch (error) {
    console.error('Institutional overview error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/institutional/districts — staff view of district performance.
router.get('/districts', auth, requirePermission('stats.view'), async (req, res) => {
  try {
    const districts = await getDistricts({
      days: clampDays(req.query.days),
      limit: req.query.limit,
    });
    res.json(districts);
  } catch (error) {
    console.error('Institutional districts error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/institutional/report — staff report for ministry/partner
// reviews: overview, per-district rows and a monthly series in one payload.
router.get('/report', auth, requirePermission('stats.view'), async (req, res) => {
  try {
    const days = clampDays(req.query.days);
    const months = Math.min(Math.max(Number(req.query.months) || 12, 1), 24);
    const [overview, districts, monthly] = await Promise.all([
      getOverview({ days }),
      getDistricts({ days, limit: req.query.limit }),
      getMonthly({ months }),
    ]);
    res.json({ ...overview, districts, monthly });
  } catch (error) {
    console.error('Institutional report error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
