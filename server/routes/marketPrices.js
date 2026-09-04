const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const MarketPrice = require('../models/MarketPrice');
const { calculateAveragePrice, getPriceTrend } = require('../services/priceEngine.service');

router.get('/', async (req, res) => {
  try {
    const { cropName, region, category, isBaseline } = req.query;
    const filter = {};
    if (cropName) filter.cropName = new RegExp(cropName, 'i');
    if (region) filter.region = region;
    if (category) filter.category = category;
    if (isBaseline === 'true') filter.isBaseline = true;

    const prices = await MarketPrice.find(filter).sort({ dateRecorded: -1 }).limit(100);
    res.json(prices);
  } catch (error) {
    console.error('Get market prices error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.get('/average', async (req, res) => {
  try {
    const { cropName, region, days } = req.query;
    if (!cropName) return res.status(400).json({ message: 'Jina la zao linahitajika' });

    const result = await calculateAveragePrice(cropName, region, parseInt(days) || 30);
    res.json(result || { avgPrice: 0, minPrice: 0, maxPrice: 0, count: 0 });
  } catch (error) {
    console.error('Get average price error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.get('/trend', async (req, res) => {
  try {
    const { cropName, region, months } = req.query;
    if (!cropName) return res.status(400).json({ message: 'Jina la zao linahitajika' });

    const trend = await getPriceTrend(cropName, region, parseInt(months) || 6);
    res.json(trend);
  } catch (error) {
    console.error('Get price trend error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

router.get('/baselines', async (req, res) => {
  try {
    const { region } = req.query;
    const filter = { isBaseline: true };
    if (region) filter.region = region;

    const prices = await MarketPrice.find(filter).sort({ cropName: 1 });
    res.json(prices);
  } catch (error) {
    console.error('Get baselines error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
