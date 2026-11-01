const express = require('express');
const router = express.Router();
const InputOrder = require('../models/InputOrder');
const InputProduct = require('../models/InputProduct');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { sendNotification } = require('../services/notification.service');
const { initiatePayment } = require('../services/payment.service');

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

// POST /api/v1/input-orders — buyers/farmers place an input order (with payment initiation)
router.post('/', requireRole('buyer', 'farmer', 'seller', 'admin'), async (req, res) => {
  try {
    const {
      items, deliveryMethod, deliveryLocation, contact, notes,
      paymentProvider, paymentPhone, deliveryFee, deliveryProviderName,
      deliveryVehicleType,
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: 'Weka angau bidhaa moja' });
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

    // Decrement stock only once every line is valid.
    for (const { product, quantity } of reservations) {
      await InputProduct.findByIdAndUpdate(product._id, {
        $inc: { stockQuantity: -quantity },
        $set: product.stockQuantity - quantity <= 0 ? { status: 'out_of_stock' } : {},
      });
    }

    const fee = Math.max(0, Number(deliveryFee) || 0);
    const totalAmount = itemsTotal + fee;

    const order = await InputOrder.create({
      items: validatedItems,
      buyer: req.user._id,
      buyerName: req.user.name,
      itemsTotal,
      deliveryFee: fee,
      deliveryProviderName: deliveryProviderName || '',
      deliveryVehicleType: deliveryVehicleType || '',
      totalAmount,
      deliveryMethod: deliveryMethod || 'pickup',
      deliveryLocation: deliveryLocation || '',
      contact: contact || req.user.phone,
      notes: notes || '',
      paymentStatus: 'unpaid',
    });

    // Notify the owners of the ordered products (farmers or sellers).
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
    const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
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

    if (status === 'cancelled' && order.status !== 'cancelled') {
      // Restore stock
      for (const item of order.items) {
        await InputProduct.findByIdAndUpdate(item.product, { $inc: { stockQuantity: item.quantity }, $set: { status: 'available' } });
      }
    }

    order.status = status;
    await order.save();

    await sendNotification(order.buyer, {
      title: 'Sasisha ya Agizo la Pembejeo',
      message: `Agizo lako la pembejeo limebadilisha hadi: ${status}`,
      type: 'order',
      link: '/buyer-dashboard',
      metadata: { inputOrderId: order._id, status },
    });

    res.json(order);
  } catch (error) {
    console.error('Update input order status error:', error);
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

    const result = await initiatePayment({
      provider, phone, amount: order.totalAmount,
      reference: `INPUT-ORDER-${order._id}`, customerName: req.user.name,
    });

    if (result.success) {
      order.paymentStatus = 'processing';
      order.paymentTransactionId = result.transactionId || '';
      order.paymentProvider = provider;
      await order.save();
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
