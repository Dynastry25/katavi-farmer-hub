const MarketPrice = require('../models/MarketPrice');
const Crop = require('../models/Crop');
const Order = require('../models/Order');

const calculateAveragePrice = async (cropName, region, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const result = await MarketPrice.aggregate([
    {
      $match: {
        cropName: cropName,
        ...(region ? { region } : {}),
        dateRecorded: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: null,
        avgPrice: { $avg: '$pricePerUnit' },
        minPrice: { $min: '$pricePerUnit' },
        maxPrice: { $max: '$pricePerUnit' },
        count: { $sum: 1 },
      },
    },
  ]);

  return result[0] || null;
};

const updateAverageFromTransactions = async (cropName, region) => {
  const recentOrders = await Order.find({
    cropName: new RegExp(cropName, 'i'),
    status: 'completed',
  }).sort({ createdAt: -1 }).limit(50);

  if (recentOrders.length === 0) return null;

  const prices = recentOrders.map(o => parseFloat(o.price)).filter(p => !isNaN(p));
  if (prices.length === 0) return null;

  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  const marketPrice = await MarketPrice.findOneAndUpdate(
    { cropName, region: region || 'general', source: 'transaction_average' },
    {
      cropName,
      region: region || 'general',
      pricePerUnit: Math.round(avgPrice),
      source: 'transaction_average',
      dateRecorded: new Date(),
    },
    { upsert: true, new: true }
  );

  return marketPrice;
};

const getPriceTrend = async (cropName, region, months = 6) => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const trend = await MarketPrice.aggregate([
    {
      $match: {
        cropName,
        ...(region ? { region } : {}),
        dateRecorded: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$dateRecorded' } },
        avgPrice: { $avg: '$pricePerUnit' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return trend.map(t => ({ month: t._id, price: Math.round(t.avgPrice) }));
};

module.exports = { calculateAveragePrice, updateAverageFromTransactions, getPriceTrend };
