const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole, STAFF_ROLES } = require('../middleware/roleCheck');
const InputProduct = require('../models/InputProduct');
const LedgerEntry = require('../models/LedgerEntry');
const Order = require('../models/Order');
const { orderAmount, canPayOrder } = require('../services/order.service');
const { initiatePayment, isPaymentPending } = require('../services/payment.service');
const {
  findPaymentTargets,
  paymentSummary,
  applyPaymentResult,
  refundTransaction,
} = require('../services/paymentFlow.service');
const { verifyCallbackSignature } = require('../services/paymentSignature.service');
const { getReconciliation } = require('../services/ledger.service');
const { auditRoute } = require('../services/audit.service');

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
router.post('/initiate', auth, auditRoute({
  action: 'initiate_payment',
  category: 'payment',
  targetType: 'Order',
  targetId: (req) => req.body?.orderId,
  details: (req) => ({ provider: req.body?.provider || '' }),
}), async (req, res) => {
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
    if (isPaymentPending(order)) {
      return res.status(409).json({
        message: 'Malipo yameanzishwa hivi punde; subiri uthibitisho kabla ya kujaribu tena',
        transactionId: order.paymentTransactionId || '',
      });
    }
    if (order.paymentStatus !== 'processing' && !canPayOrder(order)) {
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
    order.paymentInitiatedAt = new Date();
    await order.save();

    res.status(201).json({ ...result, amount, orderId: String(order._id) });
  } catch (error) {
    console.error('Payment initiate error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/payments/callback — gateway webhook. Signed with HMAC-SHA256
// (x-payment-signature) so arbitrary callers cannot mark orders as paid.
router.post('/callback', auditRoute({
  action: 'payment_callback',
  category: 'payment',
  targetType: 'Order',
  actorName: 'payment-gateway',
  actorRole: 'system',
  details: (req) => ({
    transactionId: transactionFromBody(req.body),
    status: normalizeEvent(req.body.status || req.body.event) || '',
  }),
}), async (req, res) => {
  try {
    const verification = verifyCallbackSignature({
      hmacSecret: process.env.PAYMENT_WEBHOOK_SECRET,
      legacySecret: process.env.PAYMENT_CALLBACK_SECRET,
      legacyProvided: req.get('x-payment-secret') || '',
      rawBody: req.rawBody,
      body: req.body,
      signature: req.get('x-payment-signature') || '',
    });
    if (!verification.configured) {
      return res.status(503).json({ message: 'Callback ya malipo haijasanidiwa' });
    }
    if (!verification.ok) {
      return res.status(401).json({ message: 'Sahihi ya callback si sahihi' });
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
router.post('/:transactionId/confirm', requireRole('admin', 'finance_officer'), auditRoute({
  action: 'confirm_payment',
  category: 'payment',
  targetType: 'Order',
  targetId: () => undefined,
  details: (req) => ({
    transactionId: String(req.params.transactionId || ''),
    status: normalizeEvent(req.body.status || 'paid') || '',
  }),
}), async (req, res) => {
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
router.post('/:transactionId/refund', requireRole('admin', 'finance_officer'), auditRoute({
  action: 'refund_payment',
  category: 'payment',
  targetType: 'Order',
  targetId: () => undefined,
  details: (req) => ({
    transactionId: String(req.params.transactionId || ''),
    reason: String(req.body?.reason || '').slice(0, 200),
  }),
}), async (req, res) => {
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

// GET /api/v1/payments/reconciliation — finance checks totals from the ledger
// against paid orders for a period (default: last 30 days).
router.get('/reconciliation', requireRole('admin', 'finance_officer'), async (req, res) => {
  try {
    const report = await getReconciliation({
      from: req.query.from,
      to: req.query.to,
    });
    res.json(report);
  } catch (error) {
    console.error('Payment reconciliation error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/payments/ledger — paginated ledger entries for finance review.
router.get('/ledger', requireRole('admin', 'finance_officer'), async (req, res) => {
  try {
    const filter = {};
    if (['payment', 'refund', 'adjustment'].includes(req.query.type)) {
      filter.type = req.query.type;
    }
    for (const key of ['from', 'to']) {
      const value = req.query[key];
      if (!value) continue;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) continue;
      filter.createdAt = { ...(filter.createdAt || {}), [key === 'from' ? '$gte' : '$lte']: date };
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const entries = await LedgerEntry.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(entries);
  } catch (error) {
    console.error('Payment ledger error:', error);
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
