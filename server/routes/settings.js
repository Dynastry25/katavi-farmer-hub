const express = require('express');
const router = express.Router();
const PlatformSetting = require('../models/PlatformSetting');

router.get('/platform', async (req, res) => {
  try {
    const setting = await PlatformSetting.findOne({ key: 'platform' });
    if (!setting) {
      return res.json({ commissionRate: 5, featuredListingsEnabled: true, bannerMessage: '', bannerImage: '', bannerActive: true });
    }
    res.json({
      commissionRate: setting.commissionRate,
      featuredListingsEnabled: setting.featuredListingsEnabled,
      bannerMessage: setting.bannerMessage,
      bannerImage: setting.bannerImage || '',
      bannerActive: setting.bannerActive,
    });
  } catch (error) {
    console.error('Platform settings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// Latest published Android release for the in-app "check for updates" flow.
router.get('/app-version', async (req, res) => {
  try {
    const setting = await PlatformSetting.findOne({ key: 'platform' });
    res.json({
      version: setting?.appVersion || '',
      buildNumber: setting?.appBuildNumber || 0,
      apkUrl: setting?.appApkUrl || '',
      releaseNotes: setting?.appReleaseNotes || '',
    });
  } catch (error) {
    console.error('App version error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;