const Order = require('../models/Order');
const InputOrder = require('../models/InputOrder');
const InputProduct = require('../models/InputProduct');
const { refundPayment } = require('./payment.service');
const { sendNotification } = require('./notification.service');

// Orders that can no longer be fulfilled: a late successful charge is refunded
// instead of marking the order paid.
const DEAD_STATUSES = {
  order: ['rejected', 'expired', 'cancelled'],
  input: ['cancelled'],
};

const PAYMENT_LINKS = {
  order: '/buyer/orders',
  input: '/buyer/orders?tab=inputs',
};

const amountFor = (order, kind) => {
  const paid = Number(order.paymentAmount) || 0;
  if (paid > 0) return paid;
  return Number(order.totalAmount) || 0;
};

const money = (amount) => `TZS ${Number(amount || 0).toLocaleString('en-US')}`;

const notify = async (userId, payload) => {
  if (!userId) return;
  try {
    await sendNotification(userId, { type: 'order', ...payload });
  } catch (e) { /* best effort */ }
};

const notifyPaymentSettled = async (order, kind) => {
  const amount = money(amountFor(order, kind));
  if (kind === 'order') {
    await notify(order.farmer, {
      title: 'Malipo Yamekamilika',
      message: `${order.buyerName} amelipa ${amount} kwa agizo la ${order.cropName}.`,
      link: '/farmer/orders',
      metadata: { orderId: order._id, paymentStatus: 'paid' },
    });
    return;
  }

  try {
    const owners = await InputProduct.find({
      _id: { $in: order.items.map((item) => item.product) },
      owner: { $ne: null },
    }).distinct('owner');
    for (const ownerId of owners) {
      if (String(ownerId) === String(order.buyer)) continue;
      await notify(ownerId, {
        title: 'Malipo Yamekamilika',
        message: `${order.buyerName} amelipa ${amount} kwa agizo la pembejeo.`,
        link: '/seller/dashboard',
        metadata: { inputOrderId: order._id, paymentStatus: 'paid' },
      });
    }
  } catch (e) { /* best effort */ }
};

// A single checkout can cover several crop orders under one transaction id.
const findPaymentTargets = async (transactionId) => {
  const transaction = String(transactionId || '').trim();
  if (!transaction) return [];

  const orders = await Order.find({ paymentTransactionId: transaction });
  if (orders.length) {
    return orders.map((order) => ({ kind: 'order', order }));
  }

  const inputOrders = await InputOrder.find({ paymentTransactionId: transaction });
  return inputOrders.map((order) => ({ kind: 'input', order }));
};

const paymentSummary = ({ order, kind }) => ({
  transactionId: order.paymentTransactionId || '',
  orderType: kind,
  orderId: order._id,
  orderStatus: order.status,
  paymentStatus: order.paymentStatus,
  paymentMethod: order.paymentMethod,
  paymentProvider: order.paymentProvider || '',
  amount: amountFor(order, kind),
  paidAt: order.paidAt || null,
  refundedAt: order.refundedAt || null,
});

const markRefunded = async (order, kind, { amount, reason, refundId }) => {
  order.paymentStatus = 'refunded';
  order.refundedAt = new Date();
  order.refundReference = refundId || '';
  await order.save();

  await notify(order.buyer, {
    title: 'Malipo Yamerejeshwa',
    message: `Malipo ya ${money(amount)} yamerejeshwa kwenye akaunti yako.` +
      (reason ? ` Sababu: ${reason}.` : ''),
    link: PAYMENT_LINKS[kind],
    metadata: {
      ...(kind === 'order'
        ? { orderId: order._id }
        : { inputOrderId: order._id }),
      paymentStatus: 'refunded',
    },
  });
};

// Reverses a captured mobile-money payment and marks the order refunded.
// Non-mobile-money or unpaid orders are left untouched.
const refundPaidOrder = async ({ order, kind, reason, manualReference = '' }) => {
  if (!order || order.paymentStatus !== 'paid' || order.paymentMethod !== 'mm') {
    return { refunded: false, skipped: true };
  }

  const amount = amountFor(order, kind);
  // Finance can record a refund already reversed in the provider portal.
  const result = manualReference
    ? { success: true, refundId: manualReference, manual: true }
    : await refundPayment({
      transactionId: order.paymentTransactionId,
      amount,
      reason,
    });

  if (!result.success) {
    console.error(
      `[Payment] Refund failed for ${order.paymentTransactionId}: ${result.error}`
    );
    return { refunded: false, error: result.error };
  }

  await markRefunded(order, kind, { amount, reason, refundId: result.refundId });

  return { refunded: true, refundId: result.refundId || '' };
};

// A checkout transaction is charged once for all its orders, so it must be
// reversed with a single refund for the combined amount.
const refundTransaction = async (targets, { reason, manualReference = '' } = {}) => {
  const payable = targets.filter(
    ({ order }) => order.paymentStatus === 'paid' && order.paymentMethod === 'mm'
  );
  if (!payable.length) {
    const alreadyRefunded = targets.length > 0 &&
      targets.every(({ order }) => order.paymentStatus === 'refunded');
    return { refunded: alreadyRefunded, skipped: !alreadyRefunded, alreadyRefunded };
  }

  const amount = payable.reduce(
    (sum, target) => sum + amountFor(target.order, target.kind),
    0
  );
  const result = manualReference
    ? { success: true, refundId: manualReference, manual: true }
    : await refundPayment({
      transactionId: payable[0].order.paymentTransactionId,
      amount,
      reason,
    });

  if (!result.success) {
    console.error(
      `[Payment] Refund failed for ${payable[0].order.paymentTransactionId}: ${result.error}`
    );
    return { refunded: false, error: result.error };
  }

  for (const { order, kind } of payable) {
    const orderAmount = amountFor(order, kind);
    await markRefunded(order, kind, {
      amount: orderAmount,
      reason,
      refundId: result.refundId,
    });
  }

  return { refunded: true, refundId: result.refundId || '' };
};

const applyToTarget = async ({ order, kind }, { status, reason }) => {
  if (status === 'failed') {
    if (['unpaid', 'processing'].includes(order.paymentStatus)) {
      order.paymentStatus = 'failed';
      await order.save();
    }
    return {
      kind,
      order,
      paymentStatus: order.paymentStatus,
      refunded: false,
    };
  }

  if (order.paymentStatus === 'refunded') {
    // A second capture on an already-refunded charge must go back to the buyer.
    const result = await refundPayment({
      transactionId: order.paymentTransactionId,
      amount: amountFor(order, kind),
      reason: reason || 'Malipo yalirejeshwa awali',
    });
    if (result.success) {
      order.refundedAt = new Date();
      order.refundReference = result.refundId || order.refundReference || '';
      await order.save();
    } else {
      console.error(
        `[Payment] Duplicate refund failed for ${order.paymentTransactionId}: ${result.error}`
      );
    }
    return {
      kind,
      order,
      paymentStatus: 'refunded',
      refunded: Boolean(result.success),
      duplicate: true,
    };
  }

  const alreadyPaid = order.paymentStatus === 'paid';
  if (!alreadyPaid) {
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    if (!(Number(order.paymentAmount) > 0)) {
      order.paymentAmount = amountFor(order, kind);
    }
    await order.save();
  }

  if (DEAD_STATUSES[kind].includes(order.status)) {
    const refund = await refundPaidOrder({
      order,
      kind,
      reason: reason || 'Agizo lilikwisha kughairiwa',
    });
    return {
      kind,
      order,
      paymentStatus: order.paymentStatus,
      refunded: refund.refunded,
    };
  }

  if (!alreadyPaid) {
    await notifyPaymentSettled(order, kind);
  }

  return {
    kind,
    order,
    paymentStatus: order.paymentStatus,
    refunded: false,
  };
};

// Applies a gateway/admin result to every order owned by the transaction.
// Idempotent: a payment that is already settled only gets refunded again if
// money was captured after the order had been closed.
const applyPaymentResult = async ({ transactionId, status = 'paid', reason = '' }) => {
  const targets = await findPaymentTargets(transactionId);
  if (!targets.length) return { found: false };

  const results = [];
  for (const target of targets) {
    results.push(await applyToTarget(target, { status, reason }));
  }

  const primary = results[0];
  return {
    found: true,
    kind: primary.kind,
    order: primary.order,
    paymentStatus: primary.paymentStatus,
    refunded: results.some((result) => result.refunded),
    duplicate: results.every((result) => result.duplicate),
    payments: results.map(paymentSummary),
  };
};

module.exports = {
  findPaymentTargets,
  paymentSummary,
  refundPaidOrder,
  refundTransaction,
  applyPaymentResult,
};
