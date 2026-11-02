const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole, STAFF_ROLES } = require('../middleware/roleCheck');
const InputProduct = require('../models/InputProduct');
const Order = require('../models/Order');
const { orderAmount, canPayOrder } = require('../services/order.service');
const { initiatePayment } = require('../services/payment.service');
const {
  findPaymentTargets,
  paymentSummary,
  applyPaymentResult,
  refundTransaction,
} = require('../services/paymentFlow.service');

const normalizeEvent = (value) => {
  const event = String(value || '').trim().toLowerCase();
  if (['paid', 'success', 'succeeded', 'completed', 'confirmed'].includes(event)) {
    return 'paid';
  }
  if (['failed', 'failure', 'cancelled', 'canceled', 'rejected', 'expired'].includes(event)) {
    return 'failed';
  }
  return null;
};

const transactionFromBody = (body = {}) =>
  body.transactionId || body.transaction_id || body.reference || '';

// A checkout transaction can cover several orders, each with its own amount.
const summarizeTransaction = (targets) => {
  const orders = targets.map(paymentSummary);
  const statuses = [...new Set(orders.map((order) => order.paymentStatus))];
  return {
    ...orders[0],
    paymentStatus: statuses.length === 1 ? statuses[0] : 'mixed',
    amount: orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0),
    orders,
  };
};

const canViewTarget = async (target, user) => {
  if (STAFF_ROLES.includes(user.role)) return true;
  const { order, kind } = target;
  if (String(order.buyer) === String(user._id)) return true;
  if (kind === 'order' && String(order.farmer) === String(user._id)) return true;
  if (kind === 'input') {
    return Boolean(await InputProduct.exists({
      _id: { $in: order.items.map((item) => item.product) },
      owner: user._id,
    }));
  }
  return false;
};

// POST /api/v1/payments/initiate — starts mobile-money collection for one crop
// order. The amount always comes from the order, never from the client.
router.post('/initiate', auth, async (req, res) => {
  try {
    const { provider, phone, orderId } = req.body;
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(400).json({ message: 'Chagua agizo la kulipia' });
    }
    if (!provider || !phone) {
      return res.status(400).json({ message: 'Chagua mtoa huduma na namba ya simu' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Agizo halipatikani' });
    if (req.user.role !== 'admin' &&
        String(order.buyer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa kulipia agizo hili' });
    }
    if (!canPayOrder(order)) {
      return res.status(400).json({
        message: order.paymentStatus === 'paid'
          ? 'Agizo limekwisha lipwa'
          : `Agizo hili haliko kwenye hali ya kulipiwa (${order.status})`,
      });
    }

    const amount = orderAmount(order);
    const result = await initiatePayment({
      provider,
      phone,
      amount,
      reference: `CROP-ORDER-${order._id}`,
      customerName: req.user.name,
    });
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }

    order.paymentStatus = 'processing';
    order.paymentMethod = 'mm';
    order.paymentProvider = provider;
    order.paymentTransactionId = result.transactionId || '';
    order.paymentAmount = amount;
    await order.save();

    res.status(201).json({ ...result, amount, orderId: String(order._id) });
  } catch (error) {
    console.error('Payment initiate error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/payments/callback — gateway webhook. The shared secret keeps
// arbitrary callers from marking orders as paid.
router.post('/callback', async (req, res) => {
  try {
    const secret = process.env.PAYMENT_CALLBACK_SECRET;
    if (!secret) {
      return res.status(503).json({ message: 'Callback ya malipo haijasanidiwa' });
    }
    const provided = req.get('x-payment-secret') || '';
    const expected = Buffer.from(secret);
    const actual = Buffer.from(provided);
    if (actual.length !== expected.length ||
        !crypto.timingSafeEqual(actual, expected)) {
      return res.status(401).json({ message: 'Siri ya callback si sahihi' });
    }

    const transactionId = transactionFromBody(req.body);
    const status = normalizeEvent(req.body.status || req.body.event);
    if (!transactionId || !status) {
      return res.status(400).json({ message: 'Taarifa ya malipo haijakamilika' });
    }

    const result = await applyPaymentResult({
      transactionId,
      status,
      reason: req.body.reason || '',
    });
    if (!result.found) {
      return res.status(404).json({ message: 'Muamala haupatikani' });
    }

    res.json({
      message: 'Hali ya malipo imesasishwa',
      payment: paymentSummary({ order: result.order, kind: result.kind }),
      payments: result.payments,
      refunded: Boolean(result.refunded),
    });
  } catch (error) {
    console.error('Payment callback error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/payments/:transactionId/confirm — manual reconciliation by
// finance staff (e.g. when the gateway callback never arrives).
router.post('/:transactionId/confirm', requireRole('admin', 'finance_officer'), async (req, res) => {
  try {
    const status = normalizeEvent(req.body.status || 'paid');
    if (!status) {
      return res.status(400).json({ message: 'Hali ya malipo si sahihi' });
    }

    const result = await applyPaymentResult({
      transactionId: req.params.transactionId,
      status,
      reason: req.body.reason || '',
    });
    if (!result.found) {
      return res.status(404).json({ message: 'Muamala haupatikani' });
    }

    res.json({
      message: status === 'paid'
        ? 'Malipo yamethibitishwa'
        : 'Malipo yamewekwa kama yaliyoshindikana',
      payment: paymentSummary({ order: result.order, kind: result.kind }),
      payments: result.payments,
      refunded: Boolean(result.refunded),
      duplicate: Boolean(result.duplicate),
    });
  } catch (error) {
    console.error('Payment confirm error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/payments/:transactionId/refund — finance reverses a captured
// charge. `manualReference` records a refund already done in the provider
// portal when no refund API is configured.
router.post('/:transactionId/refund', requireRole('admin', 'finance_officer'), async (req, res) => {
  try {
    const targets = await findPaymentTargets(req.params.transactionId);
    if (!targets.length) {
      return res.status(404).json({ message: 'Muamala haupatikani' });
    }

    const result = await refundTransaction(targets, {
      reason: req.body.reason || 'Mrejesho wa malipo',
      manualReference: String(req.body.manualReference || '').trim(),
    });

    if (result.skipped) {
      return res.status(400).json({
        message: 'Malipo haya hayajalipwa kwa pesa ya simu; hakuna cha kurejesha',
        payments: targets.map(paymentSummary),
      });
    }
    if (!result.refunded) {
      return res.status(502).json({
        message: result.error || 'Marejesho hayakufanikiwa',
        payments: targets.map(paymentSummary),
      });
    }

    res.json({
      message: result.alreadyRefunded
        ? 'Malipo yamerejeshwa awali'
        : 'Malipo yamerejeshwa',
      payment: summarizeTransaction(targets),
      refunded: true,
    });
  } catch (error) {
    console.error('Payment refund error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/payments/:transactionId — DB-backed status for the parties.
router.get('/:transactionId', auth, async (req, res) => {
  try {
    const targets = await findPaymentTargets(req.params.transactionId);
    if (!targets.length) {
      return res.status(404).json({ message: 'Muamala haupatikani' });
    }

    const visible = [];
    for (const target of targets) {
      if (await canViewTarget(target, req.user)) visible.push(target);
    }
    if (!visible.length) {
      return res.status(403).json({ message: 'Huna ruhusa kuona malipo haya' });
    }

    res.json(summarizeTransaction(visible));
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
