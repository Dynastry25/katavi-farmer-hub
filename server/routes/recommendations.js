const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const Order = require('../models/Order');
const Favorite = require('../models/Favorite');
const Crop = require('../models/Crop');
const InputOrder = require('../models/InputOrder');
const InputProduct = require('../models/InputProduct');
const { TransportBooking } = require('../models/Transport');
const { StorageBooking } = require('../models/Warehouse');
const LoanApplication = require('../models/LoanApplication');
const { normalizeStock } = require('../services/crop.stock.service');
const {
  buildProfile,
  buildCropPopularity,
  buildInputPopularity,
  buildServicePopularity,
  recommend,
} = require('../services/recommender.service');

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LIMIT = 20;

const parseLimit = (value, fallback) => {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, 0), MAX_LIMIT);
};

const cropView = (crop) => {
  const view = normalizeStock(crop);
  delete view._patched;
  return {
    ...view,
    id: String(view._id || view.id || ''),
    farmerId: view.farmer ? String(view.farmer) : '',
    farmer: view.farmer ? String(view.farmer) : '',
  };
};

const inputView = (product) => ({
  ...product,
  id: String(product._id || product.id || ''),
  supplierId: product.supplier ? String(product.supplier) : '',
});

// GET /api/v1/recommendations — personalised crops, inputs and services.
// Works for guests too (popularity-driven, no personal signals).
router.get('/', optionalAuth, async (req, res) => {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - 365 * DAY_MS);
    const user = req.user || null;
    const userId = user ? user._id : null;
    const limits = {
      crops: parseLimit(req.query.crops, 8),
      inputs: parseLimit(req.query.inputs, 6),
      services: parseLimit(req.query.services, 4),
    };

    const cropQuery = {
      status: { $in: ['available', 'low_stock'] },
      stockQuantity: { $gt: 0 },
    };
    if (userId) cropQuery.farmer = { $ne: userId };

    const [
      crops,
      inputs,
      cropOrders,
      favoriteRows,
      favoriteCountRows,
      inputOrders,
      transportBookings,
      storageBookings,
      loanApplications,
      inputPurchaseRows,
      globalTransport,
      globalStorage,
      globalLoans,
    ] = await Promise.all([
      Crop.find(cropQuery).sort({ createdAt: -1 }).limit(150).lean(),
      InputProduct.find({ status: 'available', stockQuantity: { $gt: 0 } })
        .sort({ createdAt: -1 })
        .limit(120)
        .lean(),
      Order.find({ createdAt: { $gte: since }, crop: { $ne: null } })
        .select('crop status createdAt')
        .populate('crop', 'category animal price location farmer rating')
        .sort({ createdAt: -1 })
        .limit(3000)
        .lean(),
      userId
        ? Favorite.find({ user: userId })
            .populate('crop')
            .sort({ createdAt: -1 })
            .limit(200)
            .lean()
        : [],
      Favorite.aggregate([{ $group: { _id: '$crop', count: { $sum: 1 } } }]),
      userId
        ? InputOrder.find({ buyer: userId, createdAt: { $gte: since } })
            .populate('items.product', 'category')
            .sort({ createdAt: -1 })
            .limit(300)
            .lean()
        : [],
      userId
        ? TransportBooking.find({ user: userId, createdAt: { $gte: since } })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean()
        : [],
      userId
        ? StorageBooking.find({ user: userId, createdAt: { $gte: since } })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean()
        : [],
      userId
        ? LoanApplication.find({ user: userId, createdAt: { $gte: since } })
            .sort({ createdAt: -1 })
            .limit(100)
            .lean()
        : [],
      InputOrder.aggregate([
        {
          $match: {
            status: { $in: ['confirmed', 'shipped', 'delivered'] },
            createdAt: { $gte: since },
          },
        },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', qty: { $sum: '$items.quantity' } } },
      ]),
      TransportBooking.countDocuments({ createdAt: { $gte: since } }),
      StorageBooking.countDocuments({ createdAt: { $gte: since } }),
      LoanApplication.countDocuments({ createdAt: { $gte: since } }),
    ]);

    const favoriteCounts = {};
    favoriteCountRows.forEach((row) => {
      if (row._id) favoriteCounts[String(row._id)] = row.count;
    });
    const purchaseTotals = {};
    inputPurchaseRows.forEach((row) => {
      if (row._id) purchaseTotals[String(row._id)] = row.qty;
    });

    const profile = buildProfile({
      user,
      orders: cropOrders,
      favorites: favoriteRows.filter((favorite) => favorite.crop),
      inputOrders,
      transportBookings,
      storageBookings,
      loanApplications,
      now,
    });

    const cropPopularity = buildCropPopularity({
      orders: cropOrders,
      favoriteCounts,
      now,
    });
    const inputPopularity = buildInputPopularity({ purchaseTotals });
    const servicePopularity = buildServicePopularity({
      transport: globalTransport,
      storage: globalStorage,
      loans: globalLoans,
    });

    const result = recommend({
      crops: crops.map(cropView),
      inputs: inputs.map(inputView),
      profile,
      affinity: profile.affinity,
      user,
      role: user ? user.role : 'buyer',
      cropPopularity,
      inputPopularity,
      servicePopularity,
      limits,
      now,
    });

    res.json({ ...result, generatedAt: now.toISOString() });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
