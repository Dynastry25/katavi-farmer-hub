const express = require('express');
const router = express.Router();
const { requirePermission } = require('../middleware/roleCheck');
const ctrl = require('../controllers/weather.controller');
const WeatherSubscription = require('../models/WeatherSubscription');
const { auth } = require('../middleware/auth');

router.get('/forecast', ctrl.getForecast);
router.get('/config', ctrl.getConfig);
router.get('/config/admin', requirePermission('weather.manage'), ctrl.getConfigAdmin);
router.put('/config', requirePermission('weather.manage'), ctrl.updateConfig);

router.get('/zones', ctrl.getZones);
router.post('/zones', requirePermission('weather.manage'), ctrl.createZone);
router.put('/zones/:id', requirePermission('weather.manage'), ctrl.updateZone);
router.delete('/zones/:id', requirePermission('weather.manage'), ctrl.deleteZone);

// ──────────────────────────────────────────────
// Weather SMS Alert Subscriptions
// ──────────────────────────────────────────────

// POST /api/v1/weather/subscribe — public, subscribe to SMS weather alerts
router.post('/subscribe', async (req, res) => {
  try {
    const { phone, zone, userId } = req.body;
    if (!phone) return res.status(400).json({ message: 'Namba ya simu inahitajika' });

    const existing = await WeatherSubscription.findOne({ phone, active: true });
    if (existing) {
      if (zone) existing.zone = zone;
      if (userId) existing.user = userId;
      existing.active = true;
      await existing.save();
      return res.json({ message: 'Usajili wako umesasishwa', subscription: existing });
    }

    const sub = await WeatherSubscription.create({
      phone,
      zone: zone || '',
      user: userId || null,
    });

    res.status(201).json({ message: 'Umesajiliwa kupokea arifa za hali ya hewa kwenye simu yako', subscription: sub });
  } catch (error) {
    console.error('Weather subscribe error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/weather/subscribe — unsubscribe
router.delete('/subscribe', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: 'Namba ya simu inahitajika' });

    const sub = await WeatherSubscription.findOneAndUpdate(
      { phone, active: true },
      { active: false },
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: 'Hujasajiliwa' });
    res.json({ message: 'Umeondolewa kwenye orodha ya arifa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/weather/subscriptions — admin only
router.get('/subscriptions', requirePermission('weather.manage'), async (req, res) => {
  try {
    const subs = await WeatherSubscription.find().sort({ createdAt: -1 });
    res.json(subs);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;