const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Rating = require('../models/Rating');
const Order = require('../models/Order');
const Crop = require('../models/Crop');
const User = require('../models/User');
const InputOrder = require('../models/InputOrder');
const InputProduct = require('../models/InputProduct');
const { TransportProvider } = require('../models/Transport');
const { auth, optionalAuth } = require('../middleware/auth');

// Aggregations do not cast strings to ObjectId like find() does.
const toObjectId = (value) => {
  if (!value) return value;
  return mongoose.isValidObjectId(value)
    ? new mongoose.Types.ObjectId(String(value))
    : value;
};

const recalcAggregate = async ({ ratedUser, ratedProduct, ratedTransportProvider }) => {
  if (ratedProduct) {
    try {
      const [agg] = await Rating.aggregate([
        { $match: { ratedProduct: toObjectId(ratedProduct) } },
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
        { $match: { ratedUser: toObjectId(ratedUser) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg) {
        await User.findByIdAndUpdate(ratedUser, { rating: Math.round(agg.avg * 10) / 10 });
      }
    } catch (err) {
      console.error('Recalc user rating error:', err);
    }
  }
  if (ratedTransportProvider) {
    try {
      const [agg] = await Rating.aggregate([
        { $match: { ratedTransportProvider: toObjectId(ratedTransportProvider) } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]);
      if (agg) {
        await TransportProvider.findByIdAndUpdate(ratedTransportProvider, {
          averageRating: Math.round(agg.avg * 10) / 10,
          totalReviews: agg.count,
        });
      }
    } catch (err) {
      console.error('Recalc transport rating error:', err);
    }
  }
};

// POST /api/v1/ratings - toa ukadiriaji
router.post('/', auth, async (req, res) => {
  try {
    const {
      ratedOrder, ratedInputOrder, ratedTransportProvider, rating, comment,
    } = req.body;

    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Ukadiriaji lazima uwe kati ya 1 na 5' });
    }
    if (!ratedOrder && !ratedInputOrder) {
      return res.status(400).json({
        message: 'Kadiria kupitia agizo ulilokamilisha',
      });
    }
    if (ratedOrder && ratedInputOrder) {
      return res.status(400).json({ message: 'Kadiria agizo moja kwa wakati mmoja' });
    }
    if (ratedOrder && !mongoose.isValidObjectId(ratedOrder)) {
      return res.status(400).json({ message: 'Kitambulisho cha agizo si sahihi' });
    }
    if (ratedInputOrder && !mongoose.isValidObjectId(ratedInputOrder)) {
      return res.status(400).json({ message: 'Kitambulisho cha agizo si sahihi' });
    }

    const target = {
      ratedUser: null,
      ratedProduct: null,
      ratedTransportProvider: null,
      ratedOrder: null,
      ratedInputOrder: null,
      type: '',
    };
    let raterIsBuyer = false;
    let orderDelivered = false;
    let deliveryProviderId = null;

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
      raterIsBuyer = Boolean(isBuyer);
      orderDelivered = ['delivered', 'completed'].includes(order.status);
      deliveryProviderId = order.deliveryProvider
        ? String(order.deliveryProvider)
        : null;
      target.ratedUser = isBuyer ? order.farmer : order.buyer;
      target.type = isBuyer ? 'buyer_to_farmer' : 'farmer_to_buyer';
      target.ratedOrder = order._id;
    }

    if (ratedInputOrder) {
      const order = await InputOrder.findById(ratedInputOrder);
      if (!order) {
        return res.status(404).json({ message: 'Agizo halipatikani' });
      }
      const productIds = order.items.map((item) => item.product);
      const sellerIds = await InputProduct.find({
        _id: { $in: productIds },
        owner: { $ne: null },
      }).distinct('owner');
      const isBuyer = order.buyer.toString() === req.user._id.toString();
      const isSeller = sellerIds.some((id) => String(id) === String(req.user._id));
      if (!isBuyer && !isSeller) {
        return res.status(403).json({ message: 'Huna ruhusa ya kukadiria agizo hili' });
      }
      raterIsBuyer = isBuyer;
      orderDelivered = order.status === 'delivered';
      deliveryProviderId = order.deliveryProvider
        ? String(order.deliveryProvider)
        : null;
      if (isBuyer) {
        const product = await InputProduct.findById(productIds[0])
          .select('owner')
          .lean();
        target.ratedUser = product?.owner || null;
        target.type = 'buyer_to_seller';
        // A single product keeps the product average meaningful; a mixed cart
        // is rated through its seller only.
        const distinctProducts = [...new Set(productIds.map(String))];
        target.ratedProduct =
          distinctProducts.length === 1 ? distinctProducts[0] : null;
      } else {
        target.ratedUser = order.buyer;
        target.type = 'seller_to_buyer';
      }
      target.ratedInputOrder = order._id;
    }

    if (ratedTransportProvider) {
      if (!target.ratedOrder && !target.ratedInputOrder) {
        return res.status(400).json({ message: 'Taja agizo la usafirishaji' });
      }
      if (!deliveryProviderId ||
          String(ratedTransportProvider) !== deliveryProviderId) {
        return res.status(400).json({ message: 'Msafirishaji huyu si wa agizo hili' });
      }
      const provider = await TransportProvider.findById(deliveryProviderId);
      if (!provider) {
        return res.status(404).json({ message: 'Mtoa huduma wa usafiri hayupo' });
      }
      target.ratedUser = null;
      target.ratedProduct = null;
      target.ratedTransportProvider = provider._id;
      target.type = raterIsBuyer ? 'buyer_to_carrier' : 'seller_to_carrier';
    }

    if (!orderDelivered && (target.ratedOrder || target.ratedInputOrder)) {
      return res.status(400).json({
        message: 'Thibitisha kuwa umepokea mzigo kwanza kabla ya kukadiria',
      });
    }

    if (!target.ratedUser && !target.ratedProduct && !target.ratedTransportProvider) {
      return res.status(400).json({ message: 'Taja mtu au bidhaa utakayokadiria' });
    }

    if (target.ratedUser && target.ratedUser.toString() === req.user._id.toString() && !target.ratedProduct) {
      return res.status(400).json({ message: 'Huwezi kujikadiria mwenyewe' });
    }

    // A rating is always tied to a completed order, so one rater can submit at
    // most one rating per order and per party.
    const existing = await Rating.findOne({
      rater: req.user._id,
      ratedOrder: target.ratedOrder,
      ratedInputOrder: target.ratedInputOrder,
      ratedTransportProvider: target.ratedTransportProvider,
      type: target.type,
    });
    if (existing) {
      return res.status(400).json({ message: 'Umeshakadiria kitu hiki' });
    }

    const created = await Rating.create({
      rater: req.user._id,
      raterName: req.user.name,
      ratedUser: target.ratedUser,
      ratedProduct: target.ratedProduct,
      ratedTransportProvider: target.ratedTransportProvider,
      ratedOrder: target.ratedOrder,
      ratedInputOrder: target.ratedInputOrder,
      rating: parseInt(rating),
      comment: comment || '',
      type: target.type,
    });

    await recalcAggregate({
      ratedUser: target.ratedUser,
      ratedProduct: target.ratedProduct,
      ratedTransportProvider: target.ratedTransportProvider,
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Rating create error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/ratings/my - ukadiriaji nilioutoa
router.get('/my', auth, async (req, res) => {
  try {
    const ratings = await Rating.find({ rater: req.user._id }).sort({ createdAt: -1 }).limit(200).lean();
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
      query.type = { $in: ['buyer_to_farmer', 'buyer_to_seller'] };
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
    if (!mongoose.isValidObjectId(targetId)) {
      return res.status(400).json({ message: 'Kitambulisho si sahihi' });
    }
    // Aggregations do not cast strings to ObjectId like find() does.
    const id = new mongoose.Types.ObjectId(targetId);
    let match = {};
    if (targetType === 'user') {
      match = { ratedUser: id };
    } else if (targetType === 'product') {
      match = { ratedProduct: id };
    } else if (targetType === 'transport') {
      match = { ratedTransportProvider: id };
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