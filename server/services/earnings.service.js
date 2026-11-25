const Order = require('../models/Order');
const InputOrder = require('../models/InputOrder');
const ServiceBooking = require('../models/ServiceBooking');
const { TransportProvider, TransportBooking } = require('../models/Transport');
const { Warehouse, StorageBooking } = require('../models/Warehouse');
const TrainingEnrollment = require('../models/TrainingEnrollment');
const AgentCommission = require('../models/AgentCommission');
const Supplier = require('../models/Supplier');
const LedgerEntry = require('../models/LedgerEntry');

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

// Mirrors the Order.totalAmount virtual so pending crop sales can be summed
// without hydrating documents.
const orderPayable = (order = {}) => {
  const approved = Number(order.approvedQuantity) || 0;
  const settled = ['approved', 'partially_approved', 'delivered', 'completed'].includes(order.status);
  const quantity = settled && approved > 0 ? approved : (Number(order.requestedQuantity) || 0);
  const price = Number(order.price) || 0;
  const fee = Number(order.deliveryFee) || 0;
  return Math.max(0, quantity * price + fee);
};

// A farm-service booking quotes in stages; the latest agreed amount wins.
const bookingPayable = (booking = {}) => {
  const amount = Number(booking.totalAmount) || Number(booking.quotedAmount)
    || Number(booking.estimatedAmount) || 0;
  return Math.max(0, amount);
};

const sumRows = (rows, pick) => rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);

const totalsFor = (modules) => {
  const totals = modules.reduce((acc, module) => {
    acc.paid += Number(module.paid) || 0;
    acc.pending += Number(module.pending) || 0;
    acc.count += Number(module.count) || 0;
    return acc;
  }, { paid: 0, pending: 0, count: 0 });
  return {
    paid: round2(totals.paid),
    pending: round2(totals.pending),
    count: totals.count,
  };
};

const monthKey = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
};

// Builds a zero-filled month series so charts do not skip quiet months.
const buildMonthlySeries = (rows = [], months = 6, now = new Date()) => {
  const count = Math.max(1, Math.round(Number(months) || 6));
  const series = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
    series.push({ month: monthKey(cursor), payments: 0, refunds: 0, net: 0 });
  }
  const byMonth = new Map(series.map((item) => [item.month, item]));
  for (const row of rows) {
    const month = row._id?.month || row.month;
    const bucket = byMonth.get(month);
    if (!bucket) continue;
    if (row._id?.type === 'refund' || row.type === 'refund') {
      bucket.refunds += Number(row.amount) || 0;
    } else {
      bucket.payments += Number(row.amount) || 0;
    }
  }
  for (const bucket of series) {
    bucket.payments = round2(bucket.payments);
    bucket.refunds = round2(bucket.refunds);
    bucket.net = round2(bucket.payments - bucket.refunds);
  }
  return series;
};

const paidAggregate = (Model, match, field = 'paymentAmount') => Model.aggregate([
  { $match: { ...match, paymentStatus: 'paid' } },
  { $group: { _id: null, amount: { $sum: `$${field}` }, count: { $sum: 1 } } },
]);

const firstTotal = (rows) => ({ amount: round2(rows[0]?.amount), count: rows[0]?.count || 0 });

const cropSales = async (userId) => {
  const [paidRows, pendingRows] = await Promise.all([
    paidAggregate(Order, { farmer: userId }),
    Order.find({
      farmer: userId,
      paymentStatus: 'unpaid',
      status: { $in: ['approved', 'partially_approved'] },
    }).select('requestedQuantity approvedQuantity price deliveryFee status').lean(),
  ]);
  const paid = firstTotal(paidRows);
  return {
    key: 'crops',
    label: 'Mauzo ya mazao',
    role: 'farmer',
    paid: paid.amount,
    pending: round2(sumRows(pendingRows, orderPayable)),
    count: paid.count + pendingRows.length,
  };
};

const inputSales = async (userId) => {
  const supplierIds = await Supplier.find({ owner: userId }).distinct('_id');
  if (!supplierIds.length) {
    return { key: 'inputs', label: 'Mauzo ya pembejeo', role: 'seller', paid: 0, pending: 0, count: 0 };
  }
  const [paidRows, pendingRows] = await Promise.all([
    paidAggregate(InputOrder, { supplier: { $in: supplierIds } }),
    InputOrder.find({
      supplier: { $in: supplierIds },
      paymentStatus: 'unpaid',
      status: { $in: ['pending', 'confirmed', 'shipped'] },
    }).select('totalAmount').lean(),
  ]);
  const paid = firstTotal(paidRows);
  return {
    key: 'inputs',
    label: 'Mauzo ya pembejeo',
    role: 'seller',
    paid: paid.amount,
    pending: round2(sumRows(pendingRows, (row) => row.totalAmount)),
    count: paid.count + pendingRows.length,
  };
};

const serviceJobs = async (userId) => {
  const [paidRows, pendingRows] = await Promise.all([
    paidAggregate(ServiceBooking, { provider: userId }),
    ServiceBooking.find({
      provider: userId,
      paymentStatus: 'unpaid',
      status: { $in: ['requested', 'quoted', 'accepted', 'in_progress'] },
    }).select('totalAmount quotedAmount estimatedAmount').lean(),
  ]);
  const paid = firstTotal(paidRows);
  return {
    key: 'services',
    label: 'Huduma za shamba',
    role: 'expert',
    paid: paid.amount,
    pending: round2(sumRows(pendingRows, bookingPayable)),
    count: paid.count + pendingRows.length,
  };
};

const transportTrips = async (userId) => {
  const providerIds = await TransportProvider.find({ owner: userId }).distinct('_id');
  if (!providerIds.length) {
    return { key: 'transport', label: 'Usafirishaji', role: 'logistics', paid: 0, pending: 0, count: 0 };
  }
  const [paidRows, pendingRows] = await Promise.all([
    TransportBooking.aggregate([
      { $match: { transportProvider: { $in: providerIds }, status: 'completed' } },
      { $group: { _id: null, amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    TransportBooking.find({
      transportProvider: { $in: providerIds },
      status: { $in: ['pending', 'accepted', 'in_transit'] },
    }).select('totalAmount').lean(),
  ]);
  const paid = firstTotal(paidRows);
  return {
    key: 'transport',
    label: 'Usafirishaji',
    role: 'logistics',
    paid: paid.amount,
    pending: round2(sumRows(pendingRows, (row) => row.totalAmount)),
    count: paid.count + pendingRows.length,
  };
};

const trainingFees = async (userId) => {
  const [paidRows, pendingRows] = await Promise.all([
    paidAggregate(TrainingEnrollment, { instructor: userId }),
    TrainingEnrollment.find({
      instructor: userId,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
    }).select('amount').lean(),
  ]);
  const paid = firstTotal(paidRows);
  return {
    key: 'training',
    label: 'Ada za mafunzo',
    role: 'expert',
    paid: paid.amount,
    pending: round2(sumRows(pendingRows, (row) => row.amount)),
    count: paid.count + pendingRows.length,
  };
};

const storageFees = async (userId) => {
  const warehouseIds = await Warehouse.find({ owner: userId }).distinct('_id');
  if (!warehouseIds.length) {
    return { key: 'warehouse', label: 'Ghala', role: 'warehouse', paid: 0, pending: 0, count: 0 };
  }
  const [paidRows, pendingRows] = await Promise.all([
    StorageBooking.aggregate([
      { $match: { warehouse: { $in: warehouseIds }, status: 'completed' } },
      { $group: { _id: null, amount: { $sum: '$totalFee' }, count: { $sum: 1 } } },
    ]),
    StorageBooking.find({
      warehouse: { $in: warehouseIds },
      status: { $in: ['pending', 'active'] },
    }).select('totalFee').lean(),
  ]);
  const paid = firstTotal(paidRows);
  return {
    key: 'warehouse',
    label: 'Ghala',
    role: 'warehouse',
    paid: paid.amount,
    pending: round2(sumRows(pendingRows, (row) => row.totalFee)),
    count: paid.count + pendingRows.length,
  };
};

const agentCommissions = async (userId) => {
  const [paidRows, pendingRows] = await Promise.all([
    AgentCommission.aggregate([
      { $match: { agent: userId, status: 'paid' } },
      { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    AgentCommission.find({ agent: userId, status: { $in: ['pending', 'approved'] } })
      .select('amount').lean(),
  ]);
  const paid = firstTotal(paidRows);
  return {
    key: 'agent',
    label: 'Kamisheni za wakala',
    role: 'agent',
    paid: paid.amount,
    pending: round2(sumRows(pendingRows, (row) => row.amount)),
    count: paid.count + pendingRows.length,
  };
};

const recentTransactions = async (userId, limit = 20) => {
  const entries = await LedgerEntry.find({ payee: userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 20, 1), 100))
    .lean();
  return entries.map((entry) => ({
    id: String(entry._id),
    type: entry.type,
    amount: round2(entry.amount),
    currency: entry.currency,
    orderType: entry.orderType,
    transactionId: entry.transactionId,
    reason: entry.reason,
    createdAt: entry.createdAt,
  }));
};

const monthlyEarnings = async (userId, months = 6, now = new Date()) => {
  const count = Math.min(Math.max(Number(months) || 6, 1), 12);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1), 1));
  const rows = await LedgerEntry.aggregate([
    { $match: { payee: userId, createdAt: { $gte: start } } },
    {
      $group: {
        _id: {
          month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          type: '$type',
        },
        amount: { $sum: '$amount' },
      },
    },
  ]);
  return buildMonthlySeries(rows, count, now);
};

// Only modules the user actually participates in are returned, so a farmer
// does not see empty transport or warehouse cards.
const getEarningsSummary = async (userId) => {
  const modules = await Promise.all([
    cropSales(userId),
    inputSales(userId),
    serviceJobs(userId),
    transportTrips(userId),
    trainingFees(userId),
    storageFees(userId),
    agentCommissions(userId),
  ]);
  const active = modules.filter((module) => module.count > 0 || module.paid > 0 || module.pending > 0);
  return {
    totals: totalsFor(active),
    modules: active,
    recent: await recentTransactions(userId, 10),
    monthly: await monthlyEarnings(userId, 6),
  };
};

module.exports = {
  round2,
  orderPayable,
  bookingPayable,
  totalsFor,
  buildMonthlySeries,
  getEarningsSummary,
  recentTransactions,
  monthlyEarnings,
};
