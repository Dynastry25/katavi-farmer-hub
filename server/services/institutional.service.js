const User = require('../models/User');
const Crop = require('../models/Crop');
const Order = require('../models/Order');
const LedgerEntry = require('../models/LedgerEntry');
const TrainingEnrollment = require('../models/TrainingEnrollment');
const InsuranceApplication = require('../models/InsuranceApplication');
const ServiceBooking = require('../models/ServiceBooking');
const { TransportBooking } = require('../models/Transport');

const DAY_MS = 24 * 60 * 60 * 1000;

const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;

// Null when there is no baseline to compare against; a partner dashboard
// should show "new" rather than a misleading 100% jump.
const percentageChange = (current, previous) => {
  const now = Number(current) || 0;
  const before = Number(previous) || 0;
  if (before <= 0) return now > 0 ? null : 0;
  return round1(((now - before) / before) * 100);
};

const clampDays = (days, fallback = 30, max = 365) => {
  const numeric = Number(days);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.min(Math.max(Math.round(numeric), 1), max);
};

const periodFor = (days, now = new Date()) => {
  const end = new Date(now);
  const start = new Date(end.getTime() - clampDays(days) * DAY_MS);
  const previousEnd = new Date(start);
  const previousStart = new Date(previousEnd.getTime() - clampDays(days) * DAY_MS);
  return { start, end, previousStart, previousEnd };
};

const inRange = (start, end) => ({ $gte: start, $lte: end });

const countFor = async (start, end) => {
  const range = inRange(start, end);
  const [
    farmers,
    listings,
    completedOrders,
    gmvRows,
    trainingsCompleted,
    insuranceRows,
    transportBookings,
    serviceBookings,
  ] = await Promise.all([
    User.countDocuments({ role: 'farmer', createdAt: range }),
    Crop.countDocuments({ createdAt: range }),
    Order.countDocuments({ status: 'completed', createdAt: range }),
    LedgerEntry.aggregate([
      { $match: { type: 'payment', createdAt: range } },
      { $group: { _id: null, amount: { $sum: '$amount' } } },
    ]),
    TrainingEnrollment.countDocuments({ status: 'completed', completedAt: range }),
    InsuranceApplication.aggregate([
      { $match: { status: 'active', activatedAt: range } },
      { $group: { _id: null, count: { $sum: 1 }, referrals: { $sum: '$referralFee' } } },
    ]),
    TransportBooking.countDocuments({ createdAt: range }),
    ServiceBooking.countDocuments({ createdAt: range }),
  ]);

  return {
    farmers,
    listings,
    completedOrders,
    transactionValue: gmvRows[0]?.amount || 0,
    trainingsCompleted,
    insuranceReferrals: insuranceRows[0]?.count || 0,
    insuranceReferralValue: insuranceRows[0]?.referrals || 0,
    transportBookings,
    serviceBookings,
  };
};

// Public impact snapshot: aggregate counts only, never names or contact data.
const getOverview = async ({ days = 30, now = new Date() } = {}) => {
  const { start, end, previousStart, previousEnd } = periodFor(days, now);
  const [current, previous, totalFarmers, verifiedFarmers] = await Promise.all([
    countFor(start, end),
    countFor(previousStart, previousEnd),
    User.countDocuments({ role: 'farmer' }),
    User.countDocuments({ role: 'farmer', isVerified: true }),
  ]);

  const metric = (key) => ({
    value: current[key],
    previous: previous[key],
    change: percentageChange(current[key], previous[key]),
  });

  return {
    range: { from: start.toISOString(), to: end.toISOString(), days: clampDays(days) },
    totals: { farmers: totalFarmers, verifiedFarmers },
    metrics: {
      newFarmers: metric('farmers'),
      listings: metric('listings'),
      completedOrders: metric('completedOrders'),
      transactionValue: metric('transactionValue'),
      trainingsCompleted: metric('trainingsCompleted'),
      insuranceReferrals: metric('insuranceReferrals'),
      insuranceReferralValue: metric('insuranceReferralValue'),
      transportBookings: metric('transportBookings'),
      serviceBookings: metric('serviceBookings'),
    },
    generatedAt: new Date().toISOString(),
  };
};

// District rows merge four aggregations so each row stays one place.
const getDistricts = async ({ days = 30, limit = 50, now = new Date() } = {}) => {
  const { start, end } = periodFor(days, now);
  const range = inRange(start, end);

  const [farmerRows, listingRows, orderRows, valueRows] = await Promise.all([
    User.aggregate([
      { $match: { role: 'farmer', district: { $nin: ['', null] } } },
      {
        $group: {
          _id: '$district',
          farmers: { $sum: 1 },
          verifiedFarmers: { $sum: { $cond: ['$isVerified', 1, 0] } },
        },
      },
    ]),
    Crop.aggregate([
      { $match: { status: 'available' } },
      { $lookup: { from: 'users', localField: 'farmer', foreignField: '_id', as: 'owner' } },
      { $project: { district: { $arrayElemAt: ['$owner.district', 0] } } },
      { $match: { district: { $nin: ['', null] } } },
      { $group: { _id: '$district', listings: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: 'completed', createdAt: range } },
      { $lookup: { from: 'users', localField: 'farmer', foreignField: '_id', as: 'owner' } },
      { $project: { district: { $arrayElemAt: ['$owner.district', 0] } } },
      { $match: { district: { $nin: ['', null] } } },
      { $group: { _id: '$district', completedOrders: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { paymentStatus: 'paid', createdAt: range } },
      { $lookup: { from: 'users', localField: 'farmer', foreignField: '_id', as: 'owner' } },
      { $project: { district: { $arrayElemAt: ['$owner.district', 0] }, amount: '$paymentAmount' } },
      { $match: { district: { $nin: ['', null] } } },
      { $group: { _id: '$district', transactionValue: { $sum: '$amount' } } },
    ]),
  ]);

  const rows = {};
  const rowFor = (district) => {
    if (!rows[district]) {
      rows[district] = {
        district,
        farmers: 0,
        verifiedFarmers: 0,
        listings: 0,
        completedOrders: 0,
        transactionValue: 0,
      };
    }
    return rows[district];
  };

  farmerRows.forEach((row) => {
    const entry = rowFor(row._id);
    entry.farmers = row.farmers;
    entry.verifiedFarmers = row.verifiedFarmers;
  });
  listingRows.forEach((row) => { rowFor(row._id).listings = row.listings; });
  orderRows.forEach((row) => { rowFor(row._id).completedOrders = row.completedOrders; });
  valueRows.forEach((row) => { rowFor(row._id).transactionValue = row.transactionValue || 0; });

  return Object.values(rows)
    .sort((a, b) => b.farmers - a.farmers || b.listings - a.listings)
    .slice(0, Math.min(Math.max(Number(limit) || 50, 1), 200));
};

const monthsBack = (now, months) => {
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - (months - 1));
  return start;
};

const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthly = async ({ months = 12, now = new Date() } = {}) => {
  const span = Math.min(Math.max(Number(months) || 12, 1), 24);
  const start = monthsBack(now, span);
  const range = { $gte: start, $lte: now };

  const [farmerRows, listingRows, orderRows, gmvRows, trainingRows] = await Promise.all([
    User.aggregate([
      { $match: { role: 'farmer', createdAt: range } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    Crop.aggregate([
      { $match: { createdAt: range } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { status: 'completed', createdAt: range } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
    ]),
    LedgerEntry.aggregate([
      { $match: { type: 'payment', createdAt: range } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, amount: { $sum: '$amount' } } },
    ]),
    TrainingEnrollment.aggregate([
      { $match: { status: 'completed', completedAt: range } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$completedAt' } }, count: { $sum: 1 } } },
    ]),
  ]);

  const toMap = (rows) => rows.reduce((map, row) => {
    map[row._id] = row.count ?? row.amount ?? 0;
    return map;
  }, {});

  const farmers = toMap(farmerRows);
  const listings = toMap(listingRows);
  const orders = toMap(orderRows);
  const gmv = toMap(gmvRows);
  const trainings = toMap(trainingRows);

  const series = [];
  const cursor = new Date(start);
  for (let i = 0; i < span; i += 1) {
    const key = monthKey(cursor);
    series.push({
      month: key,
      farmers: farmers[key] || 0,
      listings: listings[key] || 0,
      completedOrders: orders[key] || 0,
      transactionValue: Math.round(gmv[key] || 0),
      trainingsCompleted: trainings[key] || 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return series;
};

module.exports = {
  DAY_MS,
  percentageChange,
  clampDays,
  periodFor,
  getOverview,
  getDistricts,
  getMonthly,
};
