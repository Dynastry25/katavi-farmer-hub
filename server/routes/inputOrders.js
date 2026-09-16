const express = require('express');
const router = express.Router();
const InputOrder = require('../models/InputOrder');
const InputProduct = require('../models/InputProduct');
const { auth } = require('../middleware/auth');
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

// GET /api/v1/input-orders — seller/staff sees all, buyer sees own
router.get('/', auth, async (req, res) => {
  try {
    const STAFF_ROLES = ['admin', 'support', 'content_moderator', 'finance_officer'];

    let query;
    if (STAFF_ROLES.includes(req.user.role)) {
      query = {};
    } else if (req.user.role === 'seller') {
      const Supplier = require('../models/Supplier');
      const supplierIds = await Supplier.find({ owner: req.user._id }).distinct('_id');
      query = { supplier: { $in: supplierIds } };
    } else {
      query = { buyer: req.user._id };
    }

    const orders = await InputOrder.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/input-orders — place an input order (with payment initiation)
router.post('/', auth, async (req, res) => {
  try {
    const { items, deliveryMethod, deliveryLocation, contact, notes, paymentProvider, paymentPhone } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ message: 'Weka angau bidhaa moja' });
    }

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await InputProduct.findById(item.product);
      if (!product) return res.status(400).json({ message: `Bidhaa ${item.productName || ''} haipatikani` });
      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({ message: `Hisia ya ${product.name} haikutosha. Inapatikana: ${product.stockQuantity} ${product.unit}` });
      }

      const lineTotal = product.price * item.quantity;
      totalAmount += lineTotal;
      validatedItems.push({
        product: product._id,
        productName: product.name,
        quantity: item.quantity,
        price: product.price,
        unit: product.unit,
        image: product.image || '',
      });

      // Decrement stock
      await InputProduct.findByIdAndUpdate(product._id, {
        $inc: { stockQuantity: -item.quantity },
        $set: product.stockQuantity - item.quantity <= 0 ? { status: 'out_of_stock' } : {},
      });
    }

    const order = await InputOrder.create({
      items: validatedItems,
      buyer: req.user._id,
      buyerName: req.user.name,
      totalAmount,
      deliveryMethod: deliveryMethod || 'pickup',
      deliveryLocation: deliveryLocation || '',
      contact: contact || req.user.phone,
      notes: notes || '',
      paymentStatus: 'unpaid',
    });

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
      const isOwner = await Supplier.exists({ _id: order.supplier, owner: req.user._id });
      if (!isOwner) {
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
