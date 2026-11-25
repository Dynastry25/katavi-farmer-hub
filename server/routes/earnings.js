const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getEarningsSummary,
  recentTransactions,
  monthlyEarnings,
} = require('../services/earnings.service');

// GET /api/v1/earnings/summary — consolidated income across every role a user
// plays (farmer, supplier, provider, carrier, instructor, agent).
router.get('/summary', auth, async (req, res) => {
  try {
    const summary = await getEarningsSummary(req.user._id);
    res.json(summary);
  } catch (error) {
    console.error('Earnings summary error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/earnings/transactions?limit=20 — settled payments paid to me.
router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await recentTransactions(req.user._id, req.query.limit);
    res.json({ transactions });
  } catch (error) {
    console.error('Earnings transactions error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/earnings/monthly?months=6 — paid vs refunded per month.
router.get('/monthly', auth, async (req, res) => {
  try {
    const monthly = await monthlyEarnings(req.user._id, req.query.months);
    res.json({ monthly });
  } catch (error) {
    console.error('Earnings monthly error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
