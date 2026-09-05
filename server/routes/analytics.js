const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/roleCheck');
const { getAdminAnalytics } = require('../services/analytics.service');

// GET /api/v1/analytics/admin
router.get('/admin', auth, requirePermission('stats.view'), async (req, res) => {
  try {
    const data = await getAdminAnalytics();
    res.json(data);
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;