const express = require('express');
const router = express.Router();
const PlatformSetting = require('../models/PlatformSetting');

router.get('/platform', async (req, res) => {
  try {
    const setting = await PlatformSetting.findOne({ key: 'platform' });
    if (!setting) {
      return res.json({ commissionRate: 5, featuredListingsEnabled: true, bannerMessage: '', bannerActive: true });
    }
    res.json({
      commissionRate: setting.commissionRate,
      featuredListingsEnabled: setting.featuredListingsEnabled,
      bannerMessage: setting.bannerMessage,
      bannerActive: setting.bannerActive,
    });
  } catch (error) {
    console.error('Platform settings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;