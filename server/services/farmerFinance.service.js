const Order = require('../models/Order');
const LoanApplication = require('../models/LoanApplication');
const FarmerExpense = require('../models/FarmerExpense');
const MarketPrice = require('../models/MarketPrice');

// Convert displayed amounts ("TZS 150,000", "2,450,000", 150000) to a number.
const parseAmount = (v) => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  if (v === null || v === undefined) return 0;
  const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) || 0 : 0;
};

const monthRange = (months) => {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  return { from, to };
};

const prevMonthRange = (months) => {
  const { from, to } = monthRange(months);
  const len = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - len), to: new Date(from.getTime()) };
};

const computePL = async (userId, { months = 6 } = {}) => {
  const { from, to } = monthRange(months);

  // Income: completed orders where the user is the seller.
  const orders = await Order.find({ farmer: userId, status: 'completed', createdAt: { $gte: from, $lte: to } });
  let incomeTotal = 0;
  const byCrop = {};
  for (const o of orders) {
    const a = parseAmount(o.price);
    incomeTotal += a;
    const crop = o.cropName || 'Zao Lisiloonekana';
    byCrop[crop] = (byCrop[crop] || 0) + a;
  }

  // Loan repayments within the period.
  const applications = await LoanApplication.find({ user: userId });
  let loanRepayments = 0;
  for (const app of applications) {
    for (const r of app.repayments || []) {
      if (r && r.date) {
        const d = new Date(r.date);
        if (d >= from && d <= to) loanRepayments += parseAmount(r.amount);
      }
    }
  }

  // Manual expenses the farmer logged.
  const manual = await FarmerExpense.find({ user: userId, date: { $gte: from, $lte: to } }).sort({ date: -1 });
  const manualTotal = manual.reduce((s, e) => s + (e.amount || 0), 0);
  const byCategory = {};
  manual.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  if (loanRepayments > 0) byCategory.loan = (byCategory.loan || 0) + loanRepayments;

  const expensesTotal = manualTotal + loanRepayments;
  const profit = incomeTotal - expensesTotal;

  const recommendations = await buildRecommendations(userId, {
    months, orders, byCrop, incomeTotal, expensesTotal, loanRepayments,
  });

  const trend = await monthlyTrend(userId, { from, to });

  return {
    period: { from, to, months },
    income: { total: incomeTotal, byCrop },
    expenses: { total: expensesTotal, loanRepayments, manual: manualTotal, byCategory, items: manual },
    profit,
    status: profit > 0 ? 'profit' : profit < 0 ? 'loss' : 'break-even',
    recommendations,
    trend,
  };
};

const buildRecommendations = async (userId, { months, orders, byCrop, incomeTotal, expensesTotal }) => {
  const recs = [];

  if (expensesTotal > 0 && incomeTotal === 0) {
    recs.push('Hujauza bado katika kipindi hiki — hujalipa gharama. Weka mazao yako sokoni ili kuongeza mapato.');
  } else if (incomeTotal > expensesTotal && expensesTotal > 0 && (incomeTotal / expensesTotal) < 1.5) {
    recs.push('Faida yako ni ndogo ikilinganishwa na gharama. Fikiria kupunguza matumizi yasiyo ya lazima au kuongeza kiasi cha mazao unayouza.');
  }

  // Price-drop check for top income crops (compare last 30d vs previous 60d).
  const topCrops = Object.entries(byCrop).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c);
  for (const crop of topCrops) {
    const now = new Date();
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
    const d90 = new Date(now); d90.setDate(d90.getDate() - 90);
    try {
      const recent = await MarketPrice.aggregate([
        { $match: { cropName: new RegExp(`^${crop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), dateRecorded: { $gte: d30 } } },
        { $group: { _id: null, avg: { $avg: '$pricePerUnit' } } },
      ]);
      const older = await MarketPrice.aggregate([
        { $match: { cropName: new RegExp(`^${crop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), dateRecorded: { $gte: d90, $lt: d30 } } },
        { $group: { _id: null, avg: { $avg: '$pricePerUnit' } } },
      ]);
      if (recent[0]?.avg && older[0]?.avg && older[0].avg > 0) {
        const change = ((recent[0].avg - older[0].avg) / older[0].avg) * 100;
        if (change <= -5) {
          recs.push(`Bei ya ${crop} imeshuka ~${Math.abs(change).toFixed(1)}% mwezi huu — fikiria kuuza sokoni/eneo lingine au kuongeza thamani (usindikaji).`);
        }
      }
    } catch (e) { /* skip */ }
  }

  // Expense growth check.
  const { from, to } = prevMonthRange(months);
  const prevExpenses = await FarmerExpense.aggregate([
    { $match: { user: userId, date: { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  if (prevExpenses[0]?.total > 0 && expensesTotal > prevExpenses[0].total) {
    const growth = ((expensesTotal - prevExpenses[0].total) / prevExpenses[0].total) * 100;
    if (growth > 10) {
      recs.push(`Gharama zimeongezeka ~${growth.toFixed(1)}% ikilinganishwa na kipindi kilichopita — angalia msambazaji mwingine au punguza matumizi yasiyo ya lazima.`);
    }
  }

  if (recs.length === 0) {
    recs.push('Hakuna mapendekezo maalum — endelea kufuatilia gharama zako na bei za soko kila wiki.');
  }
  return recs.slice(0, 4);
};

const monthlyTrend = async (userId, { from, to }) => {
  const orders = await Order.find({ farmer: userId, status: 'completed', createdAt: { $gte: from, $lte: to } });
  const expenses = await FarmerExpense.find({ user: userId, date: { $gte: from, $lte: to } });
  const applications = await LoanApplication.find({ user: userId });

  const map = {};
  const index = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  for (const o of orders) {
    const k = index(o.createdAt);
    map[k] = map[k] || { month: k, income: 0, expenses: 0 };
    map[k].income += parseAmount(o.price);
  }
  for (const e of expenses) {
    const k = index(e.date);
    map[k] = map[k] || { month: k, income: 0, expenses: 0 };
    map[k].expenses += e.amount || 0;
  }
  for (const app of applications) {
    for (const r of app.repayments || []) {
      if (r && r.date) {
        const d = new Date(r.date);
        const k = index(d);
        map[k] = map[k] || { month: k, income: 0, expenses: 0 };
        map[k].expenses += parseAmount(r.amount);
      }
    }
  }

  return Object.values(map)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({ ...m, profit: m.income - m.expenses }));
};

module.exports = { computePL, parseAmount, monthRange, monthlyTrend };