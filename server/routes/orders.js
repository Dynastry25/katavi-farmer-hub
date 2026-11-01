const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Order = require('../models/Order');
const Crop = require('../models/Crop');
const { TransportProvider } = require('../models/Transport');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { sendNotification } = require('../services/notification.service');
const {
  isTerminal,
  hasSufficientStock,
  deriveCropStatus,
  deriveApprovalStatus,
  resolveApprovedQuantity,
  canMarkDelivered,
  normalizePaymentMethod,
  orderAmount,
  canPayOrder,
  remainderOffer,
  hasOpenRemainder,
} = require('../services/order.service');
const { ensureStockPersisted } = require('../services/crop.stock.service');
const { initiatePayment } = require('../services/payment.service');

const EXPIRY_DAYS = 3;
const expiryDate = () => new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

const isDeliveryOrder = (order) =>
  order.deliveryMethod === 'delivery' || order.deliveryMethod === 'tr';

// The logistics user who registered the carrier vehicle (or an admin).
const isOrderCarrier = async (order, user) => {
  if (user.role === 'admin') return true;
  if (!order.deliveryProvider) return false;
  const provider = await TransportProvider.findById(order.deliveryProvider)
    .select('owner')
    .lean();
  return Boolean(provider && provider.owner &&
    String(provider.owner) === String(user._id));
};

// Lean documents skip schema virtuals, so compute the payable amount here.
const withAmount = (order) => ({ ...order, totalAmount: orderAmount(order) });

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

// GET /api/orders?view=buyer|farmer
router.get('/', auth, async (req, res) => {
  try {
    const { view } = req.query;
    const query = view === 'buyer'
      ? { buyer: req.user._id }
      : view === 'farmer'
        ? { farmer: req.user._id }
        : { $or: [{ buyer: req.user._id }, { farmer: req.user._id }] };
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();
    res.json(orders.map(withAmount));
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/orders - place an order (buyer or farmer buying another farm)
router.post('/', requireRole('buyer', 'farmer', 'seller', 'admin'), async (req, res) => {
  try {
    const {
      crop, requestedQuantity, deliveryDate, contact, options, note,
      deliveryMethod, deliveryLocation, deliveryFee, deliveryProviderName,
      deliveryVehicleType, deliveryProvider, paymentMethod,
    } = req.body;
    const qty = Number(requestedQuantity);
    const method = deliveryMethod || 'self';

    if (!crop || !qty || qty < 1) {
      return res.status(400).json({ message: 'Weka kiasi halali' });
    }

    let provider = null;
    if (method === 'delivery' || method === 'tr') {
      if (!deliveryProvider || !mongoose.isValidObjectId(deliveryProvider)) {
        return res.status(400).json({ message: 'Chagua mtoa huduma wa usafiri' });
      }
      provider = await TransportProvider.findById(deliveryProvider);
      if (!provider) {
        return res.status(404).json({ message: 'Mtoa huduma wa usafiri hayupo' });
      }
      if (provider.available === false) {
        return res.status(400).json({ message: 'Gari hili halipatikani kwa sasa' });
      }
    }

    const cropDoc = await Crop.findById(crop);
    if (!cropDoc) return res.status(404).json({ message: 'Zao halipatikani' });
    if (cropDoc.farmer && String(cropDoc.farmer) === String(req.user._id)) {
      return res.status(400).json({ message: 'Hauwezi kuagiza zao lako mwenyewe' });
    }

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
      options: options || {},
      note: note || '',
      deliveryMethod: method,
      pickupLocation: cropDoc.location || '',
      deliveryLocation: deliveryLocation || '',
      deliveryFee: Math.max(0, Number(deliveryFee) || 0),
      deliveryProvider: provider ? provider._id : null,
      deliveryProviderName: provider ? provider.name : (deliveryProviderName || ''),
      deliveryVehicleType: provider ? provider.vehicleType : (deliveryVehicleType || ''),
      deliveryStatus: provider ? 'requested' : 'none',
      paymentMethod: normalizePaymentMethod(paymentMethod),
      buyer: req.user._id,
      buyerName: req.user.name,
    });

    if (cropDoc.farmer) {
      await notify(req, cropDoc.farmer, {
        title: 'Agizo Jipya',
        message: `${req.user.name} ametuma agizo la ${qty} ${cropDoc.unit || 'kg'} ya ${cropDoc.name}.`,
        link: '/farmer/orders',
        metadata: { orderId: order._id, cropId: cropDoc._id },
      });
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/orders/pay - buyer pays for one or more live crop orders at once
router.post('/pay', requireRole('buyer', 'farmer', 'seller', 'admin'), async (req, res) => {
  try {
    const { orderIds, provider, phone } = req.body;
    const ids = Array.isArray(orderIds)
      ? orderIds.filter((id) => mongoose.Types.ObjectId.isValid(id))
      : [];
    if (!ids.length) return res.status(400).json({ message: 'Chagua angalau agizo moja' });
    if (!provider || !phone) {
      return res.status(400).json({ message: 'Chagua mtoa huduma na namba ya simu' });
    }

    const orders = await Order.find({ _id: { $in: ids } });
    if (orders.length !== ids.length) {
      return res.status(404).json({ message: 'Baadhi ya maagizo hayapatikani' });
    }
    if (req.user.role !== 'admin') {
      const foreign = orders.find((order) => String(order.buyer) !== String(req.user._id));
      if (foreign) return res.status(403).json({ message: 'Huna ruhusa kulipia agizo hili' });
    }
    const blocked = orders.find((order) => !canPayOrder(order));
    if (blocked) {
      return res.status(400).json({
        message: blocked.paymentStatus === 'paid'
          ? 'Agizo limekwisha lipwa'
          : `Agizo hili haliko kwenye hali ya kulipiwa (${blocked.status})`,
      });
    }

    const amount = orders.reduce((sum, order) => sum + orderAmount(order), 0);
    const result = await initiatePayment({
      provider,
      phone,
      amount,
      reference: `CROP-ORDERS-${orders.map((order) => order._id).join('-')}`,
      customerName: req.user.name,
    });
    if (!result.success) {
      return res.status(400).json({ message: result.error || 'Malipo hayakuanza' });
    }

    await Order.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          paymentStatus: 'processing',
          paymentMethod: 'mm',
          paymentProvider: provider,
          paymentTransactionId: result.transactionId || '',
        },
      }
    );

    const updated = await Order.find({ _id: { $in: ids } }).lean();
    res.json({ payment: result, amount, orders: updated.map(withAmount) });
  } catch (error) {
    console.error('Pay orders error:', error);
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

    const approved = resolveApprovedQuantity({
      requestedQuantity: order.requestedQuantity,
      approvedQuantity: req.body.approvedQuantity,
    });
    if (!approved || approved < 1) {
      return res.status(400).json({ message: 'Weka kiasi unachokubali' });
    }

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
    if (isDeliveryOrder(order) && order.deliveryProvider) {
      order.deliveryStatus = 'pending';
    }
    await order.save();

    await notify(req, order.buyer, {
      title: order.status === 'approved' ? 'Agizo Limekubaliwa' : 'Agizo Limekubaliwa Kwa Sehemu',
      message: order.status === 'approved'
        ? `${order.farmerName} amekubali ${approved} ${order.unit || 'kg'} ya ${order.cropName}.`
        : `${order.farmerName} amekubali ${approved} kati ya ${order.requestedQuantity} ${order.unit || 'kg'} ya ${order.cropName}.`,
      link: '/buyer/orders',
      metadata: { orderId: order._id, status: order.status },
    });

    // Delivery orders now need a carrier: the provider's owner gets the job
    // request with every detail needed to accept or reject it.
    if (order.deliveryStatus === 'pending') {
      const provider = await TransportProvider.findById(order.deliveryProvider)
        .select('owner name')
        .lean();
      if (provider && provider.owner) {
        await notify(req, provider.owner, {
          title: 'Ombi la Usafiri',
          message: `${order.buyerName} ameagiza ${order.approvedQuantity || order.requestedQuantity} ${order.unit || 'kg'} ya ${order.cropName}. ${order.pickupLocation || 'Mpanda'} → ${order.deliveryLocation || 'Mpanda'}.`,
          type: 'order',
          link: '/logistics?tab=orders',
          metadata: { orderId: order._id, kind: 'delivery_request' },
        });
      }
    }

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
    if (isDeliveryOrder(order)) {
      order.deliveryStatus = 'cancelled';
      order.deliveryFee = 0;
    }
    await order.save();

    await notify(req, order.buyer, {
      title: 'Agizo Limetengwa',
      message: `${order.farmerName} amekataa agizo la ${order.requestedQuantity} ${order.unit || 'kg'} ya ${order.cropName}.`,
      link: '/buyer/orders',
      metadata: { orderId: order._id, status: 'rejected' },
    });

    res.json(order);
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/orders/:id/receive — buyer confirms the goods arrived
router.post('/:id/receive', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    const isBuyer = String(order.buyer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isBuyer && !isAdmin) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuthibitisha agizo hili' });
    }
    if (!['approved', 'partially_approved', 'delivered'].includes(order.status)) {
      return res.status(400).json({ message: `Agizo hili liko katika hali ya ${order.status}` });
    }

    order.status = 'completed';
    order.respondedAt = new Date();
    if (isDeliveryOrder(order) && order.deliveryStatus !== 'rejected') {
      order.deliveryStatus = 'delivered';
    }
    // Receipt settles the payment: escrow releases and cash-on-delivery is paid.
    if (order.paymentStatus !== 'paid' && order.paymentStatus !== 'refunded') {
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
    }
    await order.save();

    if (order.farmer) {
      await notify(req, order.farmer, {
        title: 'Mzigo Umepokelewa',
        message: `${order.buyerName} amethibitisha kupokea ${order.approvedQuantity || order.requestedQuantity} ${order.unit || 'kg'} ya ${order.cropName}.`,
        link: '/farmer/orders',
        metadata: { orderId: order._id, status: 'completed' },
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Receive order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/orders/:id/deliver — farmer hands the goods over to the buyer
router.post('/:id/deliver', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    const isFarmer = String(order.farmer) === String(req.user._id);
    const isAdmin = req.user.role === 'admin';
    if (!isFarmer && !isAdmin) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuwasilisha agizo hili' });
    }
    if (!canMarkDelivered(order.status)) {
      return res.status(400).json({ message: `Agizo hili liko katika hali ya ${order.status}` });
    }
    if (isDeliveryOrder(order) &&
        ['pending', 'accepted', 'in_transit'].includes(order.deliveryStatus)) {
      return res.status(400).json({
        message: 'Uwasilishaji unasimamiwa na mtoa usafiri aliyekubali agizo hili',
      });
    }

    order.status = 'delivered';
    order.respondedAt = new Date();
    await order.save();

    if (order.buyer) {
      await notify(req, order.buyer, {
        title: 'Mzigo Umefika',
        message: `${order.farmerName} amewasilisha ${order.approvedQuantity || order.requestedQuantity} ${order.unit || 'kg'} ya ${order.cropName}. Thibitisha kupokea mzigo.`,
        link: '/orders',
        metadata: { orderId: order._id, status: 'delivered' },
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Deliver order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/orders/transport/requests — delivery jobs for the caller's vehicles
router.get('/transport/requests', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const filter = {
      deliveryStatus: { $in: ['pending', 'accepted', 'in_transit', 'delivered', 'rejected'] },
    };
    if (req.user.role !== 'admin') {
      const owned = await TransportProvider.find({ owner: req.user._id })
        .select('_id')
        .lean();
      filter.deliveryProvider = { $in: owned.map((provider) => provider._id) };
    }
    const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json(orders.map(withAmount));
  } catch (error) {
    console.error('Get transport requests error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/orders/:id/transport/accept — carrier takes the delivery job
router.patch('/:id/transport/accept', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || !order.deliveryProvider) {
      return res.status(404).json({ message: 'Ombi la usafiri halipo' });
    }
    if (!(await isOrderCarrier(order, req.user))) {
      return res.status(403).json({ message: 'Ombi hili si la gari lako' });
    }
    if (order.deliveryStatus !== 'pending') {
      return res.status(400).json({ message: `Ombi hili liko katika hali ya ${order.deliveryStatus}` });
    }

    order.deliveryStatus = 'accepted';
    order.deliveryAcceptedAt = new Date();
    await order.save();

    const route = `${order.pickupLocation || 'Mpanda'} → ${order.deliveryLocation || 'Mpanda'}`;
    const quantity = `${order.approvedQuantity || order.requestedQuantity} ${order.unit || 'kg'}`;
    await notify(req, order.buyer, {
      title: 'Usafiri Umekubaliwa',
      message: `${order.deliveryProviderName || 'Mtoa usafiri'} atapeleka ${quantity} ya ${order.cropName} (${route}). Fuatilia gari kwenye ramani.`,
      link: '/orders',
      metadata: { orderId: order._id, deliveryStatus: 'accepted' },
    });
    if (order.farmer) {
      await notify(req, order.farmer, {
        title: 'Mtoa Usafiri Amekubali',
        message: `${order.deliveryProviderName || 'Mtoa usafiri'} atachukua ${quantity} ya ${order.cropName} (${route}).`,
        link: '/orders',
        metadata: { orderId: order._id, deliveryStatus: 'accepted' },
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Accept transport request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/orders/:id/transport/reject — carrier declines the delivery job
router.patch('/:id/transport/reject', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order || !order.deliveryProvider) {
      return res.status(404).json({ message: 'Ombi la usafiri halipo' });
    }
    if (!(await isOrderCarrier(order, req.user))) {
      return res.status(403).json({ message: 'Ombi hili si la gari lako' });
    }
    if (order.deliveryStatus !== 'pending') {
      return res.status(400).json({ message: `Ombi hili liko katika hali ya ${order.deliveryStatus}` });
    }

    const reason = String(req.body.reason || '').trim().slice(0, 200);
    order.deliveryStatus = 'rejected';
    order.deliveryRejectedReason = reason;
    // Nobody is moving the goods, so the buyer must not be charged the fee.
    order.deliveryFee = 0;
    await order.save();

    await notify(req, order.buyer, {
      title: 'Usafiri Umekataliwa',
      message: `${order.deliveryProviderName || 'Mtoa usafiri'} hawezi kupeleka mzigo huu. Unaweza kuchukua mzigo mwenyewe ${order.pickupLocation || 'Mpanda'}.`,
      link: '/orders',
      metadata: { orderId: order._id, deliveryStatus: 'rejected' },
    });
    if (order.farmer) {
      await notify(req, order.farmer, {
        title: 'Usafiri Umekataliwa',
        message: `${order.deliveryProviderName || 'Mtoa usafiri'} amekataa kupeleka ${order.cropName}.`,
        link: '/orders',
        metadata: { orderId: order._id, deliveryStatus: 'rejected' },
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Reject transport request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/orders/:id/transport/status — carrier starts or completes the trip
router.patch('/:id/transport/status', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['in_transit', 'delivered'].includes(status)) {
      return res.status(400).json({ message: 'Hali ya usafiri si sahihi' });
    }
    const order = await Order.findById(req.params.id);
    if (!order || !order.deliveryProvider) {
      return res.status(404).json({ message: 'Ombi la usafiri halipo' });
    }
    if (!(await isOrderCarrier(order, req.user))) {
      return res.status(403).json({ message: 'Ombi hili si la gari lako' });
    }
    if (status === 'in_transit' && order.deliveryStatus !== 'accepted') {
      return res.status(400).json({ message: 'Kubali ombi kwanza kabla ya kuanza safari' });
    }
    if (status === 'delivered' &&
        !['accepted', 'in_transit'].includes(order.deliveryStatus)) {
      return res.status(400).json({ message: `Ombi hili liko katika hali ya ${order.deliveryStatus}` });
    }

    order.deliveryStatus = status;
    if (status === 'delivered') {
      order.status = 'delivered';
    }
    order.respondedAt = new Date();
    await order.save();

    await notify(req, order.buyer, {
      title: status === 'delivered' ? 'Mzigo Umefika' : 'Mzigo Uko Njiani',
      message: status === 'delivered'
        ? `${order.deliveryProviderName || 'Mtoa usafiri'} amewasilisha ${order.cropName}. Thibitisha kupokea mzigo.`
        : `${order.deliveryProviderName || 'Mtoa usafiri'} ameanza safari kuelekea ${order.deliveryLocation || 'Mpanda'}.`,
      link: '/orders',
      metadata: { orderId: order._id, deliveryStatus: status },
    });

    res.json(order);
  } catch (error) {
    console.error('Update transport status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/orders/:id/transport/location — carrier pushes its live GPS position
router.patch('/:id/transport/location', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Kuratibu si sahihi' });
    }
    const order = await Order.findById(req.params.id).select(
      'deliveryProvider deliveryStatus'
    );
    if (!order || !order.deliveryProvider) {
      return res.status(404).json({ message: 'Ombi la usafiri halipo' });
    }
    if (!(await isOrderCarrier(order, req.user))) {
      return res.status(403).json({ message: 'Ombi hili si la gari lako' });
    }
    if (!['accepted', 'in_transit'].includes(order.deliveryStatus)) {
      return res.status(400).json({ message: 'Usafiri haujaanza' });
    }

    order.deliveryLat = lat;
    order.deliveryLng = lng;
    order.deliveryLocationAt = new Date();
    await order.save();

    res.json({
      location: { lat, lng, at: order.deliveryLocationAt },
    });
  } catch (error) {
    console.error('Update transport location error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/orders/:id - single order (with remainder link if any)
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    const isParty = String(order.buyer) === String(req.user._id) ||
      String(order.farmer) === String(req.user._id);
    const isStaff = ['admin', 'support', 'content_moderator', 'finance_officer']
      .includes(req.user.role);
    if (!isParty && !isStaff && !(await isOrderCarrier(order, req.user))) {
      return res.status(403).json({ message: 'Huna ruhusa kuona agizo hili' });
    }

    if (order.status === 'partially_approved') {
      const remainder = await Order.findOne({ parentOrder: order._id });
      order.remainderOrder = remainder || null;
    }
    res.json(withAmount(order));
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
      paymentMethod: order.paymentMethod || 'cod',
      buyer: req.user._id,
      buyerName: req.user.name,
    });

    if (cropDoc.farmer) {
      await notify(req, cropDoc.farmer, {
        title: 'Ombi la Ziada',
        message: `${req.user.name} ameomba ziada ya ${offer.offered} ${cropDoc.unit || 'kg'} ya ${cropDoc.name}.`,
        link: '/farmer/orders',
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
    if (['paid', 'processing'].includes(order.paymentStatus)) {
      return res.status(400).json({ message: 'Agizo lililolipwa haliwezi kufutwa' });
    }

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
    if (isDeliveryOrder(order)) {
      order.deliveryStatus = 'cancelled';
    }
    await order.save();
    await sendNotification(order.buyer, {
      title: 'Agizo Limeisha Muda',
      message: `Mkulima hakuweza kujibu kwa wakati, agizo la ${order.requestedQuantity} ${order.unit || 'kg'} ya ${order.cropName} limeisha muda. Hisa yako imetolewa.`,
      type: 'order',
      link: '/buyer/orders',
      metadata: { orderId: order._id, status: 'expired' },
    });
    released++;
  }
  return released;
};

// ──────────────────────────────────────────────
// Dispute Resolution (user-facing)
// ──────────────────────────────────────────────

// POST /api/v1/orders/:id/dispute — buyer/farmer raises a dispute on their order
router.post('/:id/dispute', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    const isParty = String(order.buyer) === String(req.user._id) || String(order.farmer) === String(req.user._id);
    if (!isParty) return res.status(403).json({ message: 'Huna ruhusa ya kuripoti mgogoro huu' });

    if (['rejected', 'expired', 'disputed'].includes(order.status)) {
      return res.status(400).json({ message: `Agizo tayari liko katika hali ya ${order.status}, haiwezi kufunguliwa mgogoro` });
    }

    const { reason, description } = req.body;
    if (!reason) return res.status(400).json({ message: 'Sababu ya mgogoro inahitajika' });

    order.status = 'disputed';
    order.resolution = `[${reason}] ${description || ''}`;
    order.respondedAt = new Date();
    await order.save();

    // Release stock reservation if pending
    if (order.crop) {
      await Crop.updateOne(
        { _id: order.crop, reservedQuantity: { $gte: order.requestedQuantity } },
        { $inc: { reservedQuantity: -order.requestedQuantity } }
      );
    }

    // Notify the other party
    const reporterIsBuyer = String(order.buyer) === String(req.user._id);
    const otherPartyId = reporterIsBuyer ? order.farmer : order.buyer;
    const reporter = reporterIsBuyer ? 'Mnunuzi' : 'Mkulima';
    await notify(req, otherPartyId, {
      title: 'Mgogoro Umefunguliwa',
      message: `${reporter} amefunguliwa mgogoro kwenye agizo la ${order.cropName}: ${reason}`,
      link: reporterIsBuyer ? '/farmer/orders' : '/buyer/orders',
      metadata: { orderId: order._id, status: 'disputed' },
    });

    // Notify admin/support
    try {
      const admins = await require('../models/User').find({ role: { $in: ['admin', 'support'] } }).select('_id');
      for (const admin of admins) {
        await sendNotification(admin._id, {
          title: 'Mgogoro Mpya',
          message: `Mgogoro mpya umefunguliwa: ${reason}. Agizo: ${order.cropName}`,
          type: 'dispute',
          link: '/admin/dashboard',
          metadata: { orderId: order._id, reason, reporter: req.user.name },
        });
      }
    } catch (e) { /* best effort */ }

    res.json({ message: 'Mgogoro umefunguliwa', order });
  } catch (error) {
    console.error('Dispute error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/orders/disputes/my — user's disputed orders
router.get('/disputes/my', auth, async (req, res) => {
  try {
    const disputes = await Order.find({
      $or: [{ buyer: req.user._id }, { farmer: req.user._id }],
      status: 'disputed',
    }).sort({ createdAt: -1 });
    res.json(disputes);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
