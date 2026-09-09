const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Crop = require('../models/Crop');
const { auth } = require('../middleware/auth');
const { sendNotification } = require('../services/notification.service');
const {
  isTerminal,
  hasSufficientStock,
  deriveCropStatus,
  deriveApprovalStatus,
  remainderOffer,
  hasOpenRemainder,
} = require('../services/order.service');
const { ensureStockPersisted } = require('../services/crop.stock.service');

const EXPIRY_DAYS = 3;
const expiryDate = () => new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

// Push a live notification to a user via Socket.io (best-effort).
const pushLive = (req, userId, payload) => {
  try {
    const io = req.app && req.app.get('io');
    if (io && userId) io.to(`user_${userId}`).emit('new_notification', payload);
  } catch (e) { /* best effort */ }
};

const notify = async (req, userId, { title, message, type = 'order', link = '', metadata = {} }) => {
  await sendNotification(userId, { title, message, type, link, metadata });
  pushLive(req, userId, { userId, title, message, type, link, metadata, read: false });
};

// GET /api/orders
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ buyer: req.user._id }, { farmer: req.user._id }]
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/orders - place an order (buyer) with atomic reservation
router.post('/', auth, async (req, res) => {
  try {
    const { crop, requestedQuantity, deliveryDate, contact } = req.body;
    const qty = Number(requestedQuantity);

    if (!crop || !qty || qty < 1) {
      return res.status(400).json({ message: 'Weka kiasi halali' });
    }

    const cropDoc = await Crop.findById(crop);
    if (!cropDoc) return res.status(404).json({ message: 'Zao halipatikani' });

    const cropView = await ensureStockPersisted(Crop, cropDoc);
    cropDoc.stockQuantity = cropView.stockQuantity;
    cropDoc.reservedQuantity = cropView.reservedQuantity;

    if (!hasSufficientStock(cropDoc, qty)) {
      return res.status(400).json({
        message: 'Hakuna kiasi cha kutosha. Inapatikana: ' +
          (Number(cropDoc.stockQuantity) - Number(cropDoc.reservedQuantity)) + ' ' + (cropDoc.unit || 'kg'),
      });
    }

    // Atomically reserve stock; the guard prevents overselling under concurrency.
    const updated = await Crop.findOneAndUpdate(
      {
        _id: cropDoc._id,
        stockQuantity: { $gte: Number(cropDoc.reservedQuantity) + qty },
      },
      { $inc: { reservedQuantity: qty } },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ message: 'Wakati mmoja ukiagiza kiasi kilichopungua. Jaribu tena.' });
    }

    const order = await Order.create({
      crop: cropDoc._id,
      cropName: cropDoc.name,
      farmer: cropDoc.farmer,
      farmerName: cropDoc.farmerName,
      unit: cropDoc.unit || 'kg',
      quantity: `${qty} ${cropDoc.unit || 'kg'}`,
      price: String(cropDoc.price),
      requestedQuantity: qty,
      status: 'pending',
      expiresAt: expiryDate(),
      deliveryDate: deliveryDate || '',
      contact: contact || '',
      buyer: req.user._id,
      buyerName: req.user.name,
    });

    if (cropDoc.farmer) {
      await notify(req, cropDoc.farmer, {
        title: 'Agizo Jipya',
        message: `${req.user.name} ametuma agizo la ${qty} ${cropDoc.unit || 'kg'} ya ${cropDoc.name}.`,
        link: '/farmer',
        metadata: { orderId: order._id, cropId: cropDoc._id },
      });
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/orders/:id/approve - farmer approves (full or partial)
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Agizo hili limetolewa kwenye hali ya ' + order.status });
    }
    if (String(order.farmer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Hujaruhusiwa kukubali agizo hili' });
    }

    let approved = Number(req.body.approvedQuantity);
    if (!approved || approved < 1) {
      return res.status(400).json({ message: 'Weka kiasi unachokubali' });
    }
    approved = Math.min(approved, order.requestedQuantity);

    // Atomic guarded decrement of physical stock + release of the FULL reservation.
    const updated = await Crop.findOneAndUpdate(
      {
        _id: order.crop,
        stockQuantity: { $gte: approved },
      },
      {
        $inc: { stockQuantity: -approved, reservedQuantity: -order.requestedQuantity },
        $set: { status: (() => 'available')(), },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(400).json({ message: 'Hisia ya zao haieleweki (stock no longer sufficient). Ongeza hisa kwanza.' });
    }

    const cropStatus = deriveCropStatus(updated.stockQuantity);
    await Crop.updateOne({ _id: order.crop }, { $set: { status: cropStatus } });

    order.approvedQuantity = approved;
    order.status = deriveApprovalStatus({ requestedQuantity: order.requestedQuantity, approvedQuantity: approved });
    order.respondedAt = new Date();
    await order.save();

    await notify(req, order.buyer, {
      title: order.status === 'approved' ? 'Agizo Limekubaliwa' : 'Agizo Limekubaliwa Kwa Sehemu',
      message: order.status === 'approved'
        ? `${order.farmerName} amekubali ${approved} ${order.unit || 'kg'} ya ${order.cropName}.`
        : `${order.farmerName} amekubali ${approved} kati ya ${order.requestedQuantity} ${order.unit || 'kg'} ya ${order.cropName}.`,
      link: '/buyer',
      metadata: { orderId: order._id, status: order.status },
    });

    res.json(order);
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/orders/:id/reject - farmer rejects
router.post('/:id/reject', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Agizo hili haliko kwenye hali ya kukatwa' });
    }
    if (String(order.farmer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Hujaruhusiwa kukataa agizo hili' });
    }

    await Crop.updateOne(
      { _id: order.crop, reservedQuantity: { $gte: order.requestedQuantity } },
      { $inc: { reservedQuantity: -order.requestedQuantity } }
    );

    order.status = 'rejected';
    order.respondedAt = new Date();
    await order.save();

    await notify(req, order.buyer, {
      title: 'Agizo Limetengwa',
      message: `${order.farmerName} amekataa agizo la ${order.requestedQuantity} ${order.unit || 'kg'} ya ${order.cropName}.`,
      link: '/buyer',
      metadata: { orderId: order._id, status: 'rejected' },
    });

    res.json(order);
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/orders/:id - single order (with remainder link if any)
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    if (order.status === 'partially_approved') {
      const remainder = await Order.findOne({ parentOrder: order._id });
      order.remainderOrder = remainder || null;
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/orders/:id/remainder - buyer requests the remaining quantity
router.post('/:id/remainder', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });
    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Hujaruhusiwa kuomba ziada' });
    }
    if (order.status !== 'partially_approved') {
      return res.status(400).json({ message: 'Agizo haiko kwenye hali ya kuomba ziada' });
    }

    const existing = await Order.findOne({ parentOrder: order._id });
    if (existing && isTerminal(existing.status)) {
      return res.status(400).json({ message: 'Umekwishatuma ombi la ziada lililokamilika' });
    }
    if (existing && !isTerminal(existing.status)) {
      return res.status(400).json({ message: 'Tayari una ombi la ziada linalosubiri' });
    }

    const cropDoc = await Crop.findById(order.crop);
    if (!cropDoc) return res.status(404).json({ message: 'Zao halipatikani' });

    const cropView = await ensureStockPersisted(Crop, cropDoc);
    cropDoc.stockQuantity = cropView.stockQuantity;
    cropDoc.reservedQuantity = cropView.reservedQuantity;

    const offer = remainderOffer({
      requestedQuantity: order.requestedQuantity,
      approvedQuantity: order.approvedQuantity,
      crop: cropDoc,
    });

    if (offer.remaining <= 0) {
      return res.status(400).json({ message: 'Hakuna kiasi kitakachobaki kuomba.' });
    }
    if (offer.offered <= 0) {
      return res.status(400).json({ message: 'Zao limeisha, hakuna kiasi kitakachobakia.' });
    }

    const updated = await Crop.findOneAndUpdate(
      {
        _id: cropDoc._id,
        stockQuantity: { $gte: Number(cropDoc.reservedQuantity) + offer.offered },
      },
      { $inc: { reservedQuantity: offer.offered } },
      { new: true }
    );
    if (!updated) {
      return res.status(400).json({ message: 'Wakati mmoja hisa ilipungua. Jaribu tena.' });
    }

    const remainder = await Order.create({
      crop: cropDoc._id,
      cropName: cropDoc.name,
      farmer: cropDoc.farmer,
      farmerName: cropDoc.farmerName,
      unit: cropDoc.unit || 'kg',
      quantity: `${offer.offered} ${cropDoc.unit || 'kg'}`,
      price: String(cropDoc.price),
      requestedQuantity: offer.offered,
      status: 'pending',
      expiresAt: expiryDate(),
      parentOrder: order._id,
      buyer: req.user._id,
      buyerName: req.user.name,
    });

    if (cropDoc.farmer) {
      await notify(req, cropDoc.farmer, {
        title: 'Ombi la Ziada',
        message: `${req.user.name} ameomba ziada ya ${offer.offered} ${cropDoc.unit || 'kg'} ya ${cropDoc.name}.`,
        link: '/farmer',
        metadata: { orderId: remainder._id, parentOrderId: order._id },
      });
    }

    res.status(201).json({ remainder, capped: offer.capped, remaining: offer.remaining });
  } catch (error) {
    console.error('Remainder order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// Deprecated generic update (kept for backward compatibility) - returns 400 for
// direct status edits to protect the approval workflow.
router.put('/:id', auth, async (req, res) => {
  return res.status(400).json({ message: 'Tumia /approve au /reject kusimamia agizo' });
});

// DELETE /api/orders/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    // Release any outstanding reservation before deleting.
    if (order.status === 'pending' && order.crop) {
      await Crop.updateOne(
        { _id: order.crop, reservedQuantity: { $gte: order.requestedQuantity } },
        { $inc: { reservedQuantity: -order.requestedQuantity } }
      );
    }
    await Order.findByIdAndDelete(order._id);
    res.json({ message: 'Agizo limefutwa' });
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// Expose helper for the auto-expiry cron job.
router.expirePendingOrders = async () => {
  const now = new Date();
  const expired = await Order.find({ status: 'pending', expiresAt: { $lte: now } });
  let released = 0;
  for (const order of expired) {
    if (order.crop) {
      await Crop.updateOne(
        { _id: order.crop, reservedQuantity: { $gte: order.requestedQuantity } },
        { $inc: { reservedQuantity: -order.requestedQuantity } }
      );
    }
    order.status = 'expired';
    order.respondedAt = now;
    await order.save();
    await sendNotification(order.buyer, {
      title: 'Agizo Limeisha Muda',
      message: `Mkulima hakuweza kujibu kwa wakati, agizo la ${order.requestedQuantity} ${order.unit || 'kg'} ya ${order.cropName} limeisha muda. Hisa yako imetolewa.`,
      type: 'order',
      link: '/buyer',
      metadata: { orderId: order._id, status: 'expired' },
    });
    released++;
  }
  return released;
};

module.exports = router;
