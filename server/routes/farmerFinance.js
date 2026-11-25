const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { requireRole } = require('../middleware/roleCheck');
const FarmerExpense = require('../models/FarmerExpense');
const FarmerBudget = require('../models/FarmerBudget');
const FarmerDebt = require('../models/FarmerDebt');
const Order = require('../models/Order');
const { computePL, parseAmount } = require('../services/farmerFinance.service');
const {
  EXPENSE_CATEGORIES,
  monthKey,
  monthBounds,
  budgetVariance,
  debtSummary,
  debtTotals,
  round2,
} = require('../services/financePlan.service');

const numeric = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

const dateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

// GET /api/v1/farmer-finance/summary?months=6
router.get('/summary', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const months = Math.max(1, Math.min(24, parseInt(req.query.months) || 6));
    const result = await computePL(req.user._id, { months });
    res.json(result);
  } catch (error) {
    console.error('Farmer finance summary error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farmer-finance/expenses
router.get('/expenses', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const expenses = await FarmerExpense.find({ user: req.user._id }).sort({ date: -1 }).limit(500).lean();
    res.json(expenses);
  } catch (error) {
    console.error('List expenses error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farmer-finance/expenses  { category, amount, description, date }
router.post('/expenses', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Kiasi sahihi kinahitajika' });
    }
    const validCategory = EXPENSE_CATEGORIES.includes(category) ? category : 'other';

    const expense = await FarmerExpense.create({
      user: req.user._id,
      category: validCategory,
      amount: numericAmount,
      description: description || '',
      date: date ? new Date(date) : new Date(),
    });
    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/farmer-finance/expenses/:id
router.delete('/expenses/:id', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const expense = await FarmerExpense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ message: 'Gharama haipatikani' });
    res.json({ message: 'Gharama imefutwa' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farmer-finance/budget?month=YYYY-MM
router.get('/budget', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const { key, from, to } = monthBounds(req.query.month);
    const [budget, actualRows] = await Promise.all([
      FarmerBudget.findOne({ user: req.user._id, month: key }).lean(),
      FarmerExpense.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(String(req.user._id)), date: { $gte: from, $lt: to } } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
      ]),
    ]);
    const actualByCategory = {};
    for (const row of actualRows) actualByCategory[row._id] = row.total;
    const variance = budgetVariance(budget?.items || [], actualByCategory);

    res.json({
      month: key,
      planned: budget?.items || [],
      note: budget?.note || '',
      items: variance.items,
      totals: variance.totals,
    });
  } catch (error) {
    console.error('Farmer budget error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/farmer-finance/budget  { month, items: [{ category, amount }], note }
router.put('/budget', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const { key } = monthBounds(req.body.month);
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const clean = items
      .filter((item) => EXPENSE_CATEGORIES.includes(item?.category))
      .map((item) => ({ category: item.category, amount: numeric(item.amount) }));

    const budget = await FarmerBudget.findOneAndUpdate(
      { user: req.user._id, month: key },
      { $set: { items: clean, note: String(req.body.note || '').slice(0, 500) } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    res.json(budget);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Bajeti si sahihi' });
    }
    console.error('Save farmer budget error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farmer-finance/debts?status=open|settled|overdue
router.get('/debts', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const filter = { user: req.user._id };
    if (['open', 'settled'].includes(req.query.status)) filter.status = req.query.status;

    const debts = await FarmerDebt.find(filter).sort({ status: 1, dueDate: 1 }).limit(300).lean();
    let items = debts.map((debt) => ({ ...debt, summary: debtSummary(debt) }));
    if (req.query.status === 'overdue') {
      items = items.filter((row) => row.summary.status === 'overdue');
    }

    res.json({
      items,
      totals: debtTotals(debts),
    });
  } catch (error) {
    console.error('List farmer debts error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farmer-finance/debts  { creditor, type, principal, dueDate, note }
router.post('/debts', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const creditor = String(req.body.creditor || '').trim();
    if (creditor.length < 2) {
      return res.status(400).json({ message: 'Jina la mdeni au mdai linahitajika' });
    }
    const principal = numeric(req.body.principal);
    if (principal <= 0) {
      return res.status(400).json({ message: 'Kiasi cha deni kinahitajika' });
    }

    const debt = await FarmerDebt.create({
      user: req.user._id,
      creditor: creditor.slice(0, 120),
      type: req.body.type === 'receivable' ? 'receivable' : 'payable',
      principal,
      dueDate: dateOrNull(req.body.dueDate),
      note: String(req.body.note || '').slice(0, 500),
    });
    res.status(201).json({ ...debt.toObject(), summary: debtSummary(debt) });
  } catch (error) {
    console.error('Create farmer debt error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farmer-finance/debts/:id/payments  { amount, date, note }
router.post('/debts/:id/payments', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const debt = mongoose.isValidObjectId(req.params.id)
      ? await FarmerDebt.findOne({ _id: req.params.id, user: req.user._id })
      : null;
    if (!debt) return res.status(404).json({ message: 'Deni halipatikani' });
    if (debt.status === 'settled') {
      return res.status(400).json({ message: 'Deni hili limekwisha kulipwa' });
    }

    const amount = numeric(req.body.amount);
    if (amount <= 0) {
      return res.status(400).json({ message: 'Kiasi cha malipo kinahitajika' });
    }
    const balance = debtSummary(debt).balance;
    if (amount > balance) {
      return res.status(400).json({ message: 'Kiasi kinazidi salio la deni' });
    }

    debt.payments.push({
      amount,
      date: dateOrNull(req.body.date) || new Date(),
      note: String(req.body.note || '').slice(0, 200),
    });
    const summary = debtSummary(debt);
    if (summary.balance === 0) {
      debt.status = 'settled';
      debt.settledAt = new Date();
    }
    await debt.save();

    res.json({ ...debt.toObject(), summary });
  } catch (error) {
    console.error('Record debt payment error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/farmer-finance/debts/:id — only before any payment is recorded
router.delete('/debts/:id', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const debt = mongoose.isValidObjectId(req.params.id)
      ? await FarmerDebt.findOne({ _id: req.params.id, user: req.user._id })
      : null;
    if (!debt) return res.status(404).json({ message: 'Deni halipatikani' });
    if (debt.payments.length) {
      return res.status(400).json({
        message: 'Deni lenye malipo yaliyorekodiwa haliwezi kufutwa',
      });
    }
    await debt.deleteOne();
    res.json({ message: 'Deni limefutwa' });
  } catch (error) {
    console.error('Delete farmer debt error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farmer-finance/cashflow?months=6 — income, spending, debt flows
router.get('/cashflow', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const months = Math.max(3, Math.min(12, parseInt(req.query.months) || 6));
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

    const [orders, expenses, budgets, debts] = await Promise.all([
      Order.find({ farmer: req.user._id, status: 'completed', createdAt: { $gte: start } })
        .select('price createdAt').lean(),
      FarmerExpense.find({ user: req.user._id, date: { $gte: start } }).lean(),
      FarmerBudget.find({ user: req.user._id }).lean(),
      FarmerDebt.find({ user: req.user._id }).lean(),
    ]);

    const series = {};
    for (let i = 0; i < months; i += 1) {
      const key = monthKey(new Date(start.getFullYear(), start.getMonth() + i, 1));
      series[key] = {
        month: key, income: 0, expenses: 0, debtPaid: 0, debtCollected: 0, planned: 0, net: 0,
      };
    }

    for (const order of orders) {
      const key = monthKey(order.createdAt);
      if (series[key]) series[key].income = round2(series[key].income + parseAmount(order.price));
    }
    for (const expense of expenses) {
      const key = monthKey(expense.date);
      if (series[key]) series[key].expenses = round2(series[key].expenses + (expense.amount || 0));
    }
    for (const budget of budgets) {
      if (!series[budget.month]) continue;
      series[budget.month].planned = round2(
        (budget.items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
      );
    }
    for (const debt of debts) {
      for (const payment of debt.payments || []) {
        const key = monthKey(payment.date);
        if (!series[key]) continue;
        if (debt.type === 'receivable') {
          series[key].debtCollected = round2(series[key].debtCollected + (payment.amount || 0));
        } else {
          series[key].debtPaid = round2(series[key].debtPaid + (payment.amount || 0));
        }
      }
    }

    const rows = Object.values(series).sort((a, b) => a.month.localeCompare(b.month));
    for (const row of rows) {
      row.net = round2(row.income + row.debtCollected - row.expenses - row.debtPaid);
    }

    const totals = rows.reduce((acc, row) => ({
      income: round2(acc.income + row.income),
      expenses: round2(acc.expenses + row.expenses),
      debtPaid: round2(acc.debtPaid + row.debtPaid),
      debtCollected: round2(acc.debtCollected + row.debtCollected),
      net: round2(acc.net + row.net),
    }), { income: 0, expenses: 0, debtPaid: 0, debtCollected: 0, net: 0 });

    const horizon = new Date(now.getTime() + 30 * 86400000);
    const upcoming = debts
      .filter((debt) => debt.status !== 'settled')
      .map((debt) => ({ ...debt, summary: debtSummary(debt) }))
      .filter((debt) => debt.summary.status === 'overdue'
        || (debt.dueDate && new Date(debt.dueDate).getTime() <= horizon.getTime()))
      .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))
      .slice(0, 20);

    res.json({
      period: { from: start, to: now, months },
      months: rows,
      totals,
      debtTotals: debtTotals(debts),
      upcoming,
    });
  } catch (error) {
    console.error('Farmer cashflow error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
