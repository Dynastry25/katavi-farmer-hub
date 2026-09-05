const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const FarmerExpense = require('../models/FarmerExpense');
const { computePL } = require('../services/farmerFinance.service');

const EXPENSE_CATEGORIES = ['inputs', 'labor', 'seeds', 'transport', 'equipment', 'other'];

// GET /api/v1/farmer-finance/summary?months=6
router.get('/summary', auth, async (req, res) => {
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
router.get('/expenses', auth, async (req, res) => {
  try {
    const expenses = await FarmerExpense.find({ user: req.user._id }).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    console.error('List expenses error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farmer-finance/expenses  { category, amount, description, date }
router.post('/expenses', auth, async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    const numeric = Number(amount);
    if (isNaN(numeric) || numeric <= 0) {
      return res.status(400).json({ message: 'Kiasi sahihi kinahitajika' });
    }
    const validCategory = EXPENSE_CATEGORIES.includes(category) ? category : 'other';

    const expense = await FarmerExpense.create({
      user: req.user._id,
      category: validCategory,
      amount: numeric,
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
router.delete('/expenses/:id', auth, async (req, res) => {
  try {
    const expense = await FarmerExpense.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!expense) return res.status(404).json({ message: 'Gharama haipatikani' });
    res.json({ message: 'Gharama imefutwa' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;