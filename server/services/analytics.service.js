const User = require('../models/User');
const Order = require('../models/Order');
const MarketPrice = require('../models/MarketPrice');
const Crop = require('../models/Crop');

// Simple n-point moving average of a numeric series (returns forecast-only tail).
const movingAverage = (values, window = 3) => {
  if (!Array.isArray(values) || values.length === 0) return [];
  const w = Math.max(1, Math.min(window, values.length));
  return values.map((_, i) => {
    const start = Math.max(0, i - w + 1);
    const slice = values.slice(start, i + 1).filter(v => typeof v === 'number' && isFinite(v));
    if (slice.length === 0) return values[i];
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
};

const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const weekKey = (d) => {
  const dt = new Date(d);
  const day = (dt.getDay() + 6) % 7;
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() - day + 3);
  const s = new Date(dt.getFullYear(), 0, 1);
  return `${dt.getFullYear()}-W${Math.ceil(((dt - s) / 86400000 + s.getDay() + 1) / 7)}`;
};

const parseAmount = (v) => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v === null || v === undefined) return 0;
  const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) || 0 : 0;
};

const COMMISSION_RATE = 0.05;

const getAdminAnalytics = async () => {
  const now = new Date();

  // User growth by role (last 12 months)
  const twelveMonthsAgo = new Date(now); twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  const userGrowthRows = await User.aggregate([
    { $match: { createdAt: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: { month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, role: '$role' },
        count: { $sum: 1 },
      },
    },
  ]);
  const growthMap = {};
  userGrowthRows.forEach(r => {
    growthMap[r._id.month] = growthMap[r._id.month] || {};
    growthMap[r._id.month][r._id.role] = r.count;
  });
  const userGrowth = [];
  const d = new Date(twelveMonthsAgo);
  for (let i = 0; i < 12; i++) {
    const k = monthKey(d);
    const row = growthMap[k] || {};
    userGrowth.push({
      month: k,
      farmer: row.farmer || 0,
      buyer: row.buyer || 0,
      expert: row.expert || 0,
      admin: row.admin || 0,
      total: (row.farmer || 0) + (row.buyer || 0) + (row.expert || 0) + (row.admin || 0),
    });
    d.setMonth(d.getMonth() + 1);
  }

  // Revenue (commission) trend from completed orders, last 12 months
  const revenueOrders = await Order.find({ status: 'completed', createdAt: { $gte: twelveMonthsAgo } });
  const revMap = {};
  revenueOrders.forEach(o => {
    const k = monthKey(o.createdAt);
    revMap[k] = (revMap[k] || 0) + parseAmount(o.price);
  });
  const revenueTrend = [];
  const revDate = new Date(twelveMonthsAgo);
  for (let i = 0; i < 12; i++) {
    const k = monthKey(revDate);
    const gross = revMap[k] || 0;
    revenueTrend.push({ month: k, gross: Math.round(gross), commission: Math.round(gross * COMMISSION_RATE) });
    revDate.setMonth(revDate.getMonth() + 1);
  }

  // Price forecast: top crops, 8 weeks of weekly averages -> moving average forecast
  const priceCounts = await MarketPrice.aggregate([
    { $group: { _id: '$cropName', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  const priceForecast = [];
  for (const { _id: cropName } of priceCounts) {
    const eightWeeksAgo = new Date(now); eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const rows = await MarketPrice.find({
      cropName: new RegExp(`^${String(cropName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
      dateRecorded: { $gte: eightWeeksAgo },
    }).lean();
    const byWeek = {};
    rows.forEach(p => {
      const k = weekKey(p.dateRecorded);
      byWeek[k] = byWeek[k] || [];
      byWeek[k].push(p.pricePerUnit);
    });
    const sorted = Object.keys(byWeek).sort();
    const series = sorted.map(k => byWeek[k].reduce((s, v) => s + v, 0) / byWeek[k].length);
    const smooth = movingAverage(series, 3).slice(-4);
    const forecast = smooth.length ? Math.round(smooth[smooth.length - 1]) : null;
    priceForecast.push({ cropName, series: sorted.slice(-8), prices: series.slice(-8), forecast, ma: smooth });
  }

  // Demand: weekly completed order counts (8 weeks) + moving-average forecast
  const eightWeeksAgo = new Date(now); eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  const demandOrders = await Order.find({ status: 'completed', createdAt: { $gte: eightWeeksAgo } }).lean();
  const demandByWeek = {};
  demandOrders.forEach(o => {
    const k = weekKey(o.createdAt);
    demandByWeek[k] = (demandByWeek[k] || 0) + 1;
  });
  const demandSeries = Object.keys(demandByWeek).sort().map(k => ({ week: k, orders: demandByWeek[k] }));
  const demandForecast = movingAverage(demandSeries.map(x => x.orders), 3).slice(-1)[0] || null;

  // Heatmap: completed-orders demand by farmer district/ward (proxy for local demand)
  const populated = await Order.find({ status: 'completed' }).populate('farmer', 'district ward location').lean();
  const heatByArea = {};
  populated.forEach(o => {
    const f = o.farmer || {};
    const key = f.ward || f.district || f.location || 'Hakijulikani';
    if (!heatByArea[key]) heatByArea[key] = { district: f.district || '', ward: f.ward || f.location || '', orders: 0, value: 0 };
    heatByArea[key].orders += 1;
    heatByArea[key].value += parseAmount(o.price);
  });
  const wardDemandHeatmap = Object.entries(heatByArea)
    .map(([area, v]) => ({ area, ...v, value: Math.round(v.value) }))
    .sort((a, b) => b.orders - a.orders);

  // Supply heatmap: crops advertised per area
  const cropsByLocation = await Crop.aggregate([
    { $match: { status: 'available' } },
    { $group: { _id: { $ifNull: ['$location', 'Hakijulikani'] }, crops: { $sum: 1 } } },
    { $sort: { crops: -1 } },
  ]);
  const cropSupplyHeatmap = cropsByLocation.map(c => ({ area: c._id, crops: c.crops }));

  return {
    generatedAt: now.toISOString(),
    userGrowth,
    revenueTrend,
    priceForecast,
    demandTrend: demandSeries,
    demandForecast,
    wardDemandHeatmap,
    cropSupplyHeatmap,
    commissionRate: COMMISSION_RATE,
  };
};

module.exports = { getAdminAnalytics, movingAverage, monthKey, weekKey };