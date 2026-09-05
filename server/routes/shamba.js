const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getPlantingRecommendation,
  getCycleStage,
  getDiseaseLibrary,
  getLandGuidance,
} = require('../services/shambaAdvisor.service');

// GET /api/v1/shamba/land?ward=&district=&cropName=
router.get('/land', async (req, res) => {
  try {
    const items = await getLandGuidance(req.query);
    res.json(items);
  } catch (e) {
    console.error('Shamba land guidance error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/shamba/planting?cropName=&ward=&district=&zoneId=
router.get('/planting', auth, async (req, res) => {
  try {
    const result = await getPlantingRecommendation(req.query);
    res.json(result);
  } catch (e) {
    console.error('Shamba planting recommendation error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/shamba/stage?cropName=&plantingDate=
router.get('/stage', auth, async (req, res) => {
  try {
    const { cropName, plantingDate } = req.query;
    if (!cropName) return res.status(400).json({ message: 'Jina la zao linahitajika' });
    const result = await getCycleStage({ cropName, plantingDate });
    if (!result) return res.status(404).json({ message: 'Hakuna ratiba ya hatua kwa zao hili bado' });
    res.json(result);
  } catch (e) {
    console.error('Shamba stage error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/shamba/diseases?cropName=
router.get('/diseases', async (req, res) => {
  try {
    const items = await getDiseaseLibrary(req.query.cropName);
    res.json(items);
  } catch (e) {
    console.error('Shamba disease library error:', e);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;