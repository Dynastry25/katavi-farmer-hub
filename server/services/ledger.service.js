const LedgerEntry = require('../models/LedgerEntry');
const Order = require('../models/Order');
const InputOrder = require('../models/InputOrder');

const DAY_MS = 24 * 60 * 60 * 1000;

const paymentReference = ({ transactionId, orderType, orderId }) =>
  `payment:${transactionId}:${orderType}:${orderId}`;

const refundReference = ({ refundId, transactionId, orderType, orderId }) =>
  `refund:${refundId || transactionId || 'manual'}:${orderType}:${orderId}`;

// Ledger writes are idempotent: a duplicate reference means the event was
// already posted, which is success rather than an error for the caller.
const postEntry = async (entry) => {
  try {
    const created = await LedgerEntry.create(entry);
    return { created: true, entry: created };
  } catch (error) {
    if (error.code === 11000) return { created: false, duplicate: true };
    // Never fail a settled payment because the bookkeeping row could not be
    // written; surface it loudly for operations instead.
    console.error(`[ledger] Failed to post ${entry.reference}:`, error.message);
    return { created: false, error: error.message };
  }
};

const recordPayment = ({ order, kind, transactionId, provider, amount }) => postEntry({
  reference: paymentReference({ transactionId, orderType: kind, orderId: order._id }),
  type: 'payment',
  amount: Number(amount) || 0,
  currency: 'TZS',
  transactionId: transactionId || order.paymentTransactionId || '',
  provider: provider || order.paymentProvider || '',
  orderType: kind,
  orderId: order._id,
  payer: order.buyer || null,
  payee: order.farmer || order.seller || null,
  metadata: { orderStatus: order.status, paymentStatus: order.paymentStatus },
});

const recordRefund = ({ order, kind, amount, refundId, reason }) => postEntry({
  reference: refundReference({
    refundId,
    transactionId: order.paymentTransactionId,
    orderType: kind,
    orderId: order._id,
  }),
  type: 'refund',
  amount: Number(amount) || 0,
  currency: 'TZS',
  transactionId: order.paymentTransactionId || '',
  provider: order.paymentProvider || '',
  orderType: kind,
  orderId: order._id,
  payer: order.buyer || null,
  payee: order.farmer || order.seller || null,
  reason: String(reason || '').slice(0, 300),
  metadata: { paymentStatus: order.paymentStatus },
});

const toDate = (value, fallback) => {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const paidOrdersInRange = (Model, start, end, extra = {}) => Model.find({
  ...extra,
  paidAt: { $gte: start, $lte: end },
  paymentStatus: { $in: ['paid', 'refunded'] },
}).select('_id paymentAmount paymentStatus').limit(10000).lean();

// Daily totals plus a check that every paid order in the period has a ledger
// payment entry. Missing entries point at webhook/back-office gaps.
const getReconciliation = async ({ from, to } = {}) => {
  const end = toDate(to, new Date());
  const start = toDate(from, new Date(end.getTime() - 30 * DAY_MS));

  const [totals, byDay, cropOrders, inputOrders] = await Promise.all([
    LedgerEntry.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: '$type', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    LedgerEntry.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            type: '$type',
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]),
    paidOrdersInRange(Order, start, end),
    paidOrdersInRange(InputOrder, start, end),
  ]);

  const totalFor = (type) => {
    const row = totals.find((item) => item._id === type);
    return { count: row?.count || 0, amount: row?.amount || 0 };
  };
  const payments = totalFor('payment');
  const refunds = totalFor('refund');

  const orderIds = [...cropOrders, ...inputOrders].map((order) => order._id);
  const posted = orderIds.length
    ? await LedgerEntry.find({
      type: 'payment',
      orderId: { $in: orderIds },
    }).select('orderType orderId').lean()
    : [];

  const postedIds = new Set(posted.map((entry) => String(entry.orderId)));
  const missingFor = (orders) => orders
    .filter((order) => !postedIds.has(String(order._id)))
    .slice(0, 20)
    .map((order) => String(order._id));

  const days = {};
  for (const row of byDay) {
    const day = row._id.day;
    if (!days[day]) days[day] = { day, payments: 0, refunds: 0, net: 0 };
    if (row._id.type === 'payment') days[day].payments += row.amount;
    if (row._id.type === 'refund') days[day].refunds += row.amount;
    days[day].net = days[day].payments - days[day].refunds;
  }

  return {
    range: { from: start.toISOString(), to: end.toISOString() },
    totals: {
      payments,
      refunds,
      net: payments.amount - refunds.amount,
    },
    mismatches: {
      ordersWithoutLedger: missingFor(cropOrders),
      inputOrdersWithoutLedger: missingFor(inputOrders),
    },
    days: Object.values(days),
  };
};

module.exports = {
  recordPayment,
  recordRefund,
  getReconciliation,
  paymentReference,
  refundReference,
};
