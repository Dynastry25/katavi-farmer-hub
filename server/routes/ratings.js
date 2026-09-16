const express = require('express');
const router = express.Router();
const Rating = require('../models/Rating');
const Order = require('../models/Order');
const Crop = require('../models/Crop');
const User = require('../models/User');
const InputProduct = require('../models/InputProduct');
const { auth, optionalAuth } = require('../middleware/auth');

const recalcAggregate = async ({ ratedUser, ratedProduct }) => {
  if (ratedProduct) {
    try {
      const [agg] = await Rating.aggregate([
        { $match: { ratedProduct } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg) {
        const summary = { rating: Math.round(agg.avg * 10) / 10, reviews: agg.count };
        await Crop.findByIdAndUpdate(ratedProduct, summary).catch(() => null);
        await InputProduct.findByIdAndUpdate(ratedProduct, {
          averageRating: summary.rating,
          totalReviews: summary.reviews,
        }).catch(() => null);
      }
    } catch (err) {
      console.error('Recalc product rating error:', err);
    }
  }
  if (ratedUser) {
    try {
      const [agg] = await Rating.aggregate([
        { $match: { ratedUser } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg) {
        await User.findByIdAndUpdate(ratedUser, { rating: Math.round(agg.avg * 10) / 10 });
      }
    } catch (err) {
      console.error('Recalc user rating error:', err);
    }
  }
};

// POST /api/v1/ratings - toa ukadiriaji
router.post('/', auth, async (req, res) => {
  try {
    const { ratedUser, ratedProduct, ratedOrder, rating, comment, type } = req.body;

    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Ukadiriaji lazima uwe kati ya 1 na 5' });
    }

    let target = {
      ratedUser: ratedUser || null,
      ratedProduct: ratedProduct || null,
      type: type || 'buyer_to_farmer',
      orderError: false,
    };

    if (ratedOrder) {
      const order = await Order.findById(ratedOrder);
      if (!order) {
        return res.status(404).json({ message: 'Agizo halipatikani' });
      }
      const isBuyer = order.buyer && order.buyer.toString() === req.user._id.toString();
      const isFarmer = order.farmer && order.farmer.toString() === req.user._id.toString();
      if (!isBuyer && !isFarmer) {
        return res.status(403).json({ message: 'Huna ruhusa ya kukadiria agizo hili' });
      }
      target.ratedUser = isBuyer ? order.farmer : order.buyer;
      target.type = isBuyer ? 'buyer_to_farmer' : 'farmer_to_buyer';
    }

    if (!target.ratedUser && !target.ratedProduct) {
      return res.status(400).json({ message: 'Taja mtu au bidhaa utakayokadiria' });
    }

    if (target.ratedUser && target.ratedUser.toString() === req.user._id.toString() && !target.ratedProduct) {
      return res.status(400).json({ message: 'Huwezi kujikadiria mwenyewe' });
    }

    const existingQuery = ratedOrder
      ? { rater: req.user._id, ratedOrder }
      : { rater: req.user._id, ratedUser: target.ratedUser, ratedProduct: target.ratedProduct, type: target.type };
    const existing = await Rating.findOne(existingQuery);
    if (existing) {
      return res.status(400).json({ message: 'Umeshakadiria kitu hiki' });
    }

    const created = await Rating.create({
      rater: req.user._id,
      raterName: req.user.name,
      ratedUser: target.ratedUser,
      ratedProduct: target.ratedProduct,
      ratedOrder: ratedOrder || null,
      rating: parseInt(rating),
      comment: comment || '',
      type: target.type,
    });

    await recalcAggregate({ ratedUser: target.ratedUser, ratedProduct: target.ratedProduct });

    res.status(201).json(created);
  } catch (error) {
    console.error('Rating create error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/ratings/my - ukadiriaji nilioutoa
router.get('/my', auth, async (req, res) => {
  try {
    const ratings = await Rating.find({ rater: req.user._id }).sort({ createdAt: -1 });
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/ratings/user/:id - ukadiriaji wa mtumiaji mahususi
router.get('/user/:id', optionalAuth, async (req, res) => {
  try {
    let query = { ratedUser: req.params.id };
    if (req.user && req.user.role === 'buyer') {
      query.type = 'buyer_to_farmer';
    }
    const ratings = await Rating.find(query).sort({ createdAt: -1 }).limit(100);
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/ratings/summary/:targetType/:targetId - average rating + review count
router.get('/summary/:targetType/:targetId', optionalAuth, async (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    let match = {};
    if (targetType === 'user') {
      match = { ratedUser: targetId };
    } else if (targetType === 'product') {
      match = { ratedProduct: targetId };
    } else {
      return res.status(400).json({ message: 'Type isiyo sahihi' });
    }
    const result = await Rating.aggregate([
      { $match: match },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const data = result[0] || { avg: 0, count: 0 };
    res.json({ averageRating: Math.round(data.avg * 10) / 10, totalReviews: data.count });
  } catch (error) {
    console.error('Ratings summary error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;