const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const InputOrder = require('../models/InputOrder');
const InputProduct = require('../models/InputProduct');
const { TransportProvider } = require('../models/Transport');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { sendNotification } = require('../services/notification.service');
const { initiatePayment } = require('../services/payment.service');
const { refundPaidOrder } = require('../services/paymentFlow.service');
const {
  isInputStatus,
  canTransitionInputOrder,
  inputPaymentMethod,
} = require('../services/inputOrder.service');

const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];

const STATUS_LABELS = {
  pending: 'Imetumwa',
  confirmed: 'Imethibitishwa',
  shipped: 'Imesafirishwa',
  delivered: 'Imefikishwa',
  cancelled: 'Imeghairiwa',
  expired: 'Imeisha muda',
};

const EXPIRY_DAYS = 3;
const expiryDate = () => new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

const isDelivery = (order) => order.deliveryMethod === 'delivery';

// The logistics user who registered the carrier vehicle (or an admin).
const isInputOrderCarrier = async (order, user) => {
  if (user.role === 'admin') return true;
  if (!order.deliveryProvider) return false;
  const provider = await TransportProvider.findById(order.deliveryProvider)
    .select('owner')
    .lean();
  return Boolean(provider && provider.owner &&
    String(provider.owner) === String(user._id));
};

// Owners of the products in this order, excluding the buyer.
const inputSellerIds = async (order) => {
  const owners = await InputProduct.find({
    _id: { $in: order.items.map((item) => item.product) },
    owner: { $ne: null },
  }).distinct('owner');
  return owners.filter((id) => String(id) !== String(order.buyer));
};

const notifyInputSellers = async (order, payload) => {
  try {
    for (const ownerId of await inputSellerIds(order)) {
      await sendNotification(ownerId, {
        ...payload,
        type: 'order',
        metadata: { ...(payload.metadata || {}), inputOrderId: order._id },
      });
    }
  } catch (e) { /* best effort */ }
};

const notifyInputCarrier = async (order, payload) => {
  try {
    if (!order.deliveryProvider) return;
    const provider = await TransportProvider.findById(order.deliveryProvider)
      .select('owner')
      .lean();
    if (!provider || !provider.owner) return;
    await sendNotification(provider.owner, {
      ...payload,
      type: 'order',
      link: '/logistics?tab=orders',
      metadata: {
        ...(payload.metadata || {}),
        inputOrderId: order._id,
        kind: 'input_delivery_request',
      },
    });
  } catch (e) { /* best effort */ }
};

// GET /api/v1/input-orders/my
router.get('/my', auth, async (req, res) => {
  try {
    const orders = await InputOrder.find({ buyer: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/input-orders?view=buyer|seller
// Staff sees all; everyone else sees orders they placed and orders for
// products/suppliers they own.
router.get('/', auth, async (req, res) => {
  try {
    const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];
    const { view } = req.query;

    let query;
    if (STAFF_ROLES.includes(req.user.role)) {
      query = {};
    } else {
      const Supplier = require('../models/Supplier');
      const ownedProducts = await InputProduct.find({ owner: req.user._id })
        .distinct('_id');
      const supplierIds = await Supplier.find({ owner: req.user._id })
        .distinct('_id');

      const sellerFilters = [];
      if (ownedProducts.length) {
        sellerFilters.push({ 'items.product': { $in: ownedProducts } });
      }
      if (supplierIds.length) {
        sellerFilters.push({ supplier: { $in: supplierIds } });
      }

      if (view === 'buyer') {
        query = { buyer: req.user._id };
      } else if (view === 'seller') {
        query = sellerFilters.length ? { $or: sellerFilters } : { _id: null };
      } else {
        query = { $or: [{ buyer: req.user._id }, ...sellerFilters] };
      }
    }

    const orders = await InputOrder.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/input-orders/transport/requests — input delivery jobs for the
// vehicles registered by the caller.
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
    const orders = await InputOrder.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    res.json(orders);
  } catch (error) {
    console.error('Get input transport requests error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/input-orders/:id — buyer, product owner, carrier or staff
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await InputOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    const isBuyer = String(order.buyer) === String(req.user._id);
    if (!isBuyer && !STAFF_ROLES.includes(req.user.role) &&
        !(await isInputOrderCarrier(order, req.user))) {
      const Supplier = require('../models/Supplier');
      const productIds = order.items.map((item) => item.product);
      const ownsProduct = productIds.length
        ? await InputProduct.exists({ _id: { $in: productIds }, owner: req.user._id })
        : false;
      const ownsSupplier = order.supplier
        ? await Supplier.exists({ _id: order.supplier, owner: req.user._id })
        : false;
      if (!ownsProduct && !ownsSupplier) {
        return res.status(403).json({ message: 'Huna ruhusa ya kuona agizo hili' });
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/input-orders — buyers/farmers place an input order (with payment initiation)
router.post('/', requireRole('buyer', 'farmer', 'admin'), async (req, res) => {
  try {
    const {
      items, deliveryMethod, deliveryLocation, contact, notes,
      paymentMethod, paymentProvider, paymentPhone, deliveryFee,
      deliveryProviderName, deliveryVehicleType, deliveryProvider,
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: 'Weka angau bidhaa moja' });
    }

    const method = deliveryMethod === 'delivery' ? 'delivery' : 'pickup';
    let provider = null;
    if (method === 'delivery') {
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

    let itemsTotal = 0;
    const validatedItems = [];
    const reservations = [];

    // Validate the whole cart before touching stock.
    for (const item of items) {
      const quantity = Number(item.quantity);
      const product = await InputProduct.findById(item.product);
      if (!product) return res.status(400).json({ message: `Bidhaa ${item.productName || ''} haipatikani` });
      if (!Number.isFinite(quantity) || quantity < 1) {
        return res.status(400).json({ message: `Kiasi cha ${product.name} si sahihi` });
      }
      if (product.owner && String(product.owner) === String(req.user._id)) {
        return res.status(400).json({ message: `Hauwezi kununua ${product.name} yako mwenyewe` });
      }
      if (product.stockQuantity < quantity) {
        return res.status(400).json({ message: `Hisia ya ${product.name} haikutosha. Inapatikana: ${product.stockQuantity} ${product.unit}` });
      }

      itemsTotal += product.price * quantity;
      reservations.push({ product, quantity });
      validatedItems.push({
        product: product._id,
        productName: product.name,
        quantity,
        price: product.price,
        unit: product.unit,
        image: product.image || '',
      });
    }

    // Decrement atomically so two buyers cannot claim the same stock.
    const reserved = [];
    for (const { product, quantity } of reservations) {
      const updated = await InputProduct.findOneAndUpdate(
        { _id: product._id, stockQuantity: { $gte: quantity } },
        { $inc: { stockQuantity: -quantity } },
        { new: true }
      );
      if (!updated) {
        for (const done of reserved) {
          await InputProduct.findByIdAndUpdate(done._id, {
            $inc: { stockQuantity: done.quantity },
          });
        }
        return res.status(409).json({
          message: `Hisa ya ${product.name} haikutosha. Inapatikana: ${product.stockQuantity} ${product.unit}`,
        });
      }
      if (updated.stockQuantity <= 0) {
        await InputProduct.findByIdAndUpdate(updated._id, {
          $set: { status: 'out_of_stock' },
        });
      }
      reserved.push({ _id: product._id, quantity });
    }

    const fee = Math.max(0, Number(deliveryFee) || 0);
    const totalAmount = itemsTotal + fee;

    const order = await InputOrder.create({
      items: validatedItems,
      buyer: req.user._id,
      buyerName: req.user.name,
      itemsTotal,
      deliveryFee: fee,
      deliveryProvider: provider ? provider._id : null,
      deliveryProviderName: provider ? provider.name : (deliveryProviderName || ''),
      deliveryVehicleType: provider ? provider.vehicleType : (deliveryVehicleType || ''),
      deliveryStatus: provider ? 'requested' : 'none',
      totalAmount,
      expiresAt: expiryDate(),
      deliveryMethod: method,
      pickupLocation: reservations[0]?.product.location || '',
      deliveryLocation: deliveryLocation || '',
      contact: contact || req.user.phone,
      notes: notes || '',
      paymentMethod: inputPaymentMethod({ paymentMethod, paymentProvider }),
      paymentStatus: 'unpaid',
    });

    // Notify the owners of the ordered products.
    try {
      const owners = await InputProduct.find({
        _id: { $in: validatedItems.map((item) => item.product) },
        owner: { $ne: null },
      }).distinct('owner');
      for (const ownerId of owners) {
        if (String(ownerId) === String(req.user._id)) continue;
        await sendNotification(ownerId, {
          title: 'Agizo Jipya la Pembejeo',
          message: `${req.user.name} ameagiza bidhaa kutoka duka lako.`,
          type: 'order',
          link: '/seller/dashboard',
          metadata: { inputOrderId: order._id },
        });
      }
    } catch (e) { /* best effort */ }

    // If payment provider selected, initiate payment
    let paymentResult = null;
    if (paymentProvider && paymentPhone) {
      paymentResult = await initiatePayment({
        provider: paymentProvider,
        phone: paymentPhone,
        amount: totalAmount,
        reference: `INPUT-ORDER-${order._id}`,
        customerName: req.user.name,
      });
      if (paymentResult.success) {
        order.paymentStatus = 'processing';
        order.paymentTransactionId = paymentResult.transactionId || '';
        order.paymentProvider = paymentProvider;
        order.paymentAmount = totalAmount;
        await order.save();
      }
    }

    res.status(201).json({ order, payment: paymentResult });
  } catch (error) {
    console.error('Create input order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/input-orders/:id/status — seller/staff updates order status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!isInputStatus(status)) {
      return res.status(400).json({ message: 'Hali ya agizo siyo sahihi' });
    }

    const order = await InputOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    if (!STAFF_ROLES.includes(req.user.role)) {
      const Supplier = require('../models/Supplier');
      const ownsSupplier = order.supplier
        ? await Supplier.exists({ _id: order.supplier, owner: req.user._id })
        : false;
      const productIds = order.items.map((item) => item.product);
      const ownsProduct = productIds.length
        ? await InputProduct.exists({ _id: { $in: productIds }, owner: req.user._id })
        : false;
      if (!ownsSupplier && !ownsProduct) {
        return res.status(403).json({ message: 'Huna ruhusa ya kusasisha agizo hili' });
      }
    }

    if (!canTransitionInputOrder(order.status, status)) {
      return res.status(400).json({
        message: `Hali ya agizo haiwezi kubadilika kutoka ${order.status} hadi ${status}`,
      });
    }

    if (status === 'delivered' && isDelivery(order) &&
        ['accepted', 'in_transit'].includes(order.deliveryStatus)) {
      return res.status(400).json({
        message: 'Mzigo uko kwa msafirishaji; mtoa usafiri ndiye anathibitisha kuwasilisha.',
      });
    }

    if (status === 'cancelled') {
      // Restore stock
      for (const item of order.items) {
        await InputProduct.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity }, $set: { status: 'available' } });
      }
      if (isDelivery(order) && order.deliveryProvider) {
        order.deliveryStatus = 'cancelled';
      }
    }

    order.status = status;
    if (status === 'cancelled') {
      // A confirmed charge is reversed; a still-processing request is settled
      // (and refunded) by the gateway callback if it later succeeds.
      await refundPaidOrder({
        order,
        kind: 'input',
        reason: 'Agizo la pembejeo limeghairiwa',
      });
    }
    if (status === 'confirmed' && isDelivery(order) &&
        order.deliveryProvider && order.deliveryStatus === 'requested') {
      // The seller accepted the order, so the carrier can now take the job.
      order.deliveryStatus = 'pending';
    }
    if (status === 'delivered' && isDelivery(order) &&
        order.deliveryStatus !== 'rejected') {
      order.deliveryStatus = 'delivered';
    }
    await order.save();

    await sendNotification(order.buyer, {
      title: 'Sasisha ya Agizo la Pembejeo',
      message: `Agizo lako la pembejeo: ${STATUS_LABELS[status] || status}`,
      type: 'order',
      link: '/buyer/orders?tab=inputs',
      metadata: { inputOrderId: order._id, status },
    });

    if (status === 'confirmed' && order.deliveryStatus === 'pending') {
      await notifyInputCarrier(order, {
        title: 'Ombi la Usafiri',
        message: `${order.buyerName} ameagiza pembejeo. ${order.pickupLocation || 'Mpanda'} → ${order.deliveryLocation || 'Mpanda'}.`,
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Update input order status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/input-orders/:id/transport/provider — buyer or seller picks a
// new carrier after the previous one declined (or before the trip starts).
router.patch('/:id/transport/provider', auth, async (req, res) => {
  try {
    const order = await InputOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });

    const isBuyer = String(order.buyer) === String(req.user._id);
    const isSeller = !isBuyer &&
      (await inputSellerIds(order)).some(
        (id) => String(id) === String(req.user._id)
      );
    if (!isBuyer && !isSeller && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Huna ruhusa ya kubadilisha msafirishaji' });
    }
    if (!isDelivery(order)) {
      return res.status(400).json({ message: 'Agizo hili halihitaji usafirishaji' });
    }
    if (!['requested', 'pending', 'rejected'].includes(order.deliveryStatus)) {
      return res.status(400).json({
        message: 'Safari imeshaanza; huwezi kubadilisha msafirishaji',
      });
    }
    if (!mongoose.isValidObjectId(req.body.deliveryProvider)) {
      return res.status(400).json({ message: 'Chagua mtoa huduma wa usafiri' });
    }

    const provider = await TransportProvider.findById(req.body.deliveryProvider);
    if (!provider) {
      return res.status(404).json({ message: 'Mtoa huduma wa usafiri hayupo' });
    }
    if (provider.available === false) {
      return res.status(400).json({ message: 'Gari hili halipatikani kwa sasa' });
    }

    order.deliveryProvider = provider._id;
    order.deliveryProviderName = provider.name;
    order.deliveryVehicleType = provider.vehicleType;
    order.deliveryStatus = 'pending';
    order.deliveryRejectedReason = '';
    order.deliveryAcceptedAt = null;
    order.deliveryLat = null;
    order.deliveryLng = null;
    order.deliveryLocationAt = null;
    const fee = Number(req.body.deliveryFee);
    order.deliveryFee = Number.isFinite(fee) && fee >= 0 ? fee : 0;
    order.totalAmount = (Number(order.itemsTotal) || 0) + order.deliveryFee;
    await order.save();

    await notifyInputCarrier(order, {
      title: 'Ombi la Usafiri',
      message: `${order.buyerName} amechagua gari lako kupeleka pembejeo. ${order.pickupLocation || 'Mpanda'} → ${order.deliveryLocation || 'Mpanda'}.`,
      metadata: { inputOrderId: order._id },
    });
    if (isBuyer) {
      await notifyInputSellers(order, {
        title: 'Msafirishaji Amechaguliwa',
        message: `${provider.name} amechaguliwa kupeleka pembejeo za agizo la ${order.buyerName}.`,
        link: '/seller/dashboard',
        metadata: { deliveryStatus: 'pending' },
      });
    } else {
      try {
        await sendNotification(order.buyer, {
          title: 'Msafirishaji Amechaguliwa',
          message: `${provider.name} amechaguliwa kupeleka pembejeo zako.`,
          type: 'order',
          link: '/buyer/orders?tab=inputs',
          metadata: { inputOrderId: order._id, deliveryStatus: 'pending' },
        });
      } catch (e) { /* best effort */ }
    }

    res.json(order);
  } catch (error) {
    console.error('Reassign input transport provider error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/input-orders/:id/transport/accept — carrier takes the job
router.patch('/:id/transport/accept', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const order = await InputOrder.findById(req.params.id);
    if (!order || !order.deliveryProvider) {
      return res.status(404).json({ message: 'Ombi la usafiri halipo' });
    }
    if (!(await isInputOrderCarrier(order, req.user))) {
      return res.status(403).json({ message: 'Ombi hili si la gari lako' });
    }
    if (order.deliveryStatus !== 'pending') {
      return res.status(400).json({ message: `Ombi hili liko katika hali ya ${order.deliveryStatus}` });
    }

    order.deliveryStatus = 'accepted';
    order.deliveryAcceptedAt = new Date();
    await order.save();

    const route = `${order.pickupLocation || 'Mpanda'} → ${order.deliveryLocation || 'Mpanda'}`;
    await sendNotification(order.buyer, {
      title: 'Usafiri Umekubaliwa',
      message: `${order.deliveryProviderName || 'Mtoa usafiri'} atapeleka pembejeo zako (${route}). Fuatilia gari kwenye ramani.`,
      type: 'order',
      link: '/buyer/orders?tab=inputs',
      metadata: { inputOrderId: order._id, deliveryStatus: 'accepted' },
    });
    await notifyInputSellers(order, {
      title: 'Mtoa Usafiri Amekubali',
      message: `${order.deliveryProviderName || 'Mtoa usafiri'} atachukua pembejeo za agizo la ${order.buyerName} (${route}).`,
      link: '/seller/dashboard',
      metadata: { deliveryStatus: 'accepted' },
    });

    res.json(order);
  } catch (error) {
    console.error('Accept input transport request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/input-orders/:id/transport/reject — carrier declines the job
router.patch('/:id/transport/reject', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const order = await InputOrder.findById(req.params.id);
    if (!order || !order.deliveryProvider) {
      return res.status(404).json({ message: 'Ombi la usafiri halipo' });
    }
    if (!(await isInputOrderCarrier(order, req.user))) {
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
    order.totalAmount = order.itemsTotal;
    await order.save();

    await sendNotification(order.buyer, {
      title: 'Usafiri Umekataliwa',
      message: `${order.deliveryProviderName || 'Mtoa usafiri'} hawezi kupeleka pembejeo zako. Unaweza kuchukua mzigo mwenyewe ${order.pickupLocation || 'Mpanda'}.`,
      type: 'order',
      link: '/buyer/orders?tab=inputs',
      metadata: { inputOrderId: order._id, deliveryStatus: 'rejected' },
    });
    await notifyInputSellers(order, {
      title: 'Usafiri Umekataliwa',
      message: `${order.deliveryProviderName || 'Mtoa usafiri'} amekataa kupeleka pembejeo za agizo la ${order.buyerName}.`,
      link: '/seller/dashboard',
      metadata: { deliveryStatus: 'rejected' },
    });

    res.json(order);
  } catch (error) {
    console.error('Reject input transport request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/input-orders/:id/transport/status — carrier starts or completes
router.patch('/:id/transport/status', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['in_transit', 'delivered'].includes(status)) {
      return res.status(400).json({ message: 'Hali ya usafiri si sahihi' });
    }
    const order = await InputOrder.findById(req.params.id);
    if (!order || !order.deliveryProvider) {
      return res.status(404).json({ message: 'Ombi la usafiri halipo' });
    }
    if (!(await isInputOrderCarrier(order, req.user))) {
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
    if (status === 'in_transit' && order.status === 'confirmed') {
      order.status = 'shipped';
    }
    if (status === 'delivered') {
      order.status = 'delivered';
    }
    order.respondedAt = new Date();
    await order.save();

    await sendNotification(order.buyer, {
      title: status === 'delivered' ? 'Mzigo Umefika' : 'Mzigo Uko Njiani',
      message: status === 'delivered'
        ? `${order.deliveryProviderName || 'Mtoa usafiri'} amewasilisha pembejeo zako. Thibitisha kupokea mzigo.`
        : `${order.deliveryProviderName || 'Mtoa usafiri'} ameanza safari kuelekea ${order.deliveryLocation || 'Mpanda'}.`,
      type: 'order',
      link: '/buyer/orders?tab=inputs',
      metadata: { inputOrderId: order._id, deliveryStatus: status },
    });
    if (status === 'delivered') {
      await notifyInputSellers(order, {
        title: 'Mzigo Umewasilishwa',
        message: `${order.deliveryProviderName || 'Mtoa usafiri'} amewasilisha pembejeo za agizo la ${order.buyerName}.`,
        link: '/seller/dashboard',
        metadata: { deliveryStatus: status },
      });
    }

    res.json(order);
  } catch (error) {
    console.error('Update input transport status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/input-orders/:id/transport/location — carrier pushes its GPS
router.patch('/:id/transport/location', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ message: 'Kuratibu si sahihi' });
    }
    const order = await InputOrder.findById(req.params.id)
      .select('deliveryProvider deliveryStatus');
    if (!order || !order.deliveryProvider) {
      return res.status(404).json({ message: 'Ombi la usafiri halipo' });
    }
    if (!(await isInputOrderCarrier(order, req.user))) {
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
    console.error('Update input transport location error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/input-orders/:id/pay — initiate payment for existing order
router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { provider, phone } = req.body;
    const order = await InputOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });
    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa' });
    }

    const method = order.paymentMethod || (order.paymentProvider ? 'mm' : 'cod');
    if (method !== 'mm') {
      return res.status(400).json({ message: 'Agizo hili linatumia njia nyingine ya malipo' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Agizo hili limekwisha lipwa' });
    }
    if (order.paymentStatus === 'processing') {
      return res.status(400).json({ message: 'Malipo yanasubiri uthibitisho' });
    }
    if (['cancelled', 'expired', 'delivered'].includes(order.status)) {
      return res.status(400).json({ message: 'Agizo hili haliwezi kulipwa' });
    }
    if (!provider || !phone) {
      return res.status(400).json({ message: 'Chagua mtoa huduma na namba ya simu' });
    }

    const result = await initiatePayment({
      provider, phone, amount: order.totalAmount,
      reference: `INPUT-ORDER-${order._id}`, customerName: req.user.name,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.error || 'Malipo hayakuanza' });
    }

    order.paymentStatus = 'processing';
    order.paymentMethod = 'mm';
    order.paymentTransactionId = result.transactionId || '';
    order.paymentProvider = provider;
    order.paymentAmount = order.totalAmount;
    await order.save();

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/input-orders/:id/receive — buyer confirms delivery
router.post('/:id/receive', auth, async (req, res) => {
  try {
    const order = await InputOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });
    if (String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa' });
    }
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Agizo bado halijafikishwa' });
    }

    if (!order.receivedAt) order.receivedAt = new Date();
    if (order.paymentMethod === 'mm') {
      // Mobile money must be confirmed before the goods are released; only
      // cash/bank settle when the buyer confirms receipt.
      if (order.paymentStatus !== 'paid') {
        return res.status(400).json({
          message: 'Malipo ya pesa ya simu hayajathibitishwa. Kamilisha malipo kwanza.',
        });
      }
    } else {
      order.paymentStatus = 'paid';
    }
    await order.save();

    try {
      const owners = await InputProduct.find({
        _id: { $in: order.items.map((item) => item.product) },
        owner: { $ne: null },
      }).distinct('owner');
      for (const ownerId of owners) {
        if (String(ownerId) === String(req.user._id)) continue;
        await sendNotification(ownerId, {
          title: 'Mzigo Umepokelewa',
          message: `${req.user.name} amethibitisha kupokea agizo la pembejeo.`,
          type: 'order',
          link: '/seller/dashboard',
          metadata: { inputOrderId: order._id },
        });
      }
    } catch (e) { /* best effort */ }

    res.json(order);
  } catch (error) {
    console.error('Receive input order error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// Expose helper for the auto-expiry cron job: the seller never confirmed, so
// the reserved stock goes back and any up-front charge is reversed.
router.expirePendingInputOrders = async () => {
  const now = new Date();
  const expired = await InputOrder.find({
    status: 'pending',
    expiresAt: { $lte: now },
  });

  for (const order of expired) {
    for (const item of order.items) {
      await InputProduct.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: item.quantity },
        $set: { status: 'available' },
      });
    }

    order.status = 'expired';
    order.respondedAt = now;
    if (isDelivery(order) && order.deliveryProvider) {
      order.deliveryStatus = 'cancelled';
    }
    await order.save();

    await refundPaidOrder({
      order,
      kind: 'input',
      reason: 'Agizo la pembejeo limeisha muda bila kukubaliwa',
    });

    await sendNotification(order.buyer, {
      title: 'Agizo Limeisha Muda',
      message: 'Muuzaji hakukubali agizo lako la pembejeo kwa wakati; hisa yako imetolewa.',
      type: 'order',
      link: '/buyer/orders?tab=inputs',
      metadata: { inputOrderId: order._id, status: 'expired' },
    });
    await notifyInputSellers(order, {
      title: 'Agizo Limeisha Muda',
      message: `Agizo la ${order.buyerName} limeisha muda bila kukubaliwa.`,
      link: '/seller/dashboard',
      metadata: { status: 'expired' },
    });
  }

  return expired.length;
};

module.exports = router;
