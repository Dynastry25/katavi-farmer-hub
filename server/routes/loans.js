const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Loan = require('../models/Loan');
const LoanApplication = require('../models/LoanApplication');
const { auth } = require('../middleware/auth');
const { requireRole, STAFF_ROLES } = require('../middleware/roleCheck');

// GET /api/loans
router.get('/', async (req, res) => {
  try {
    const loans = await Loan.find().sort({ createdAt: -1 });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/loans/my
router.get('/my', auth, async (req, res) => {
  try {
    const applications = await LoanApplication.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/loans/apply — farmers (and admins) apply for loans
router.post('/apply', requireRole('farmer', 'admin'), async (req, res) => {
  try {
    const loanName = String(req.body.loanName || '').trim();
    const amount = String(req.body.amount || '').trim();
    const numericAmount = Number(amount.replace(/[^\d.]/g, ''));
    if (!loanName) {
      return res.status(400).json({ message: 'Chagua huduma ya mkopo' });
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Weka kiasi sahihi cha mkopo' });
    }

    // Applicants never choose their own decision or repayment ledger.
    const application = await LoanApplication.create({
      user: req.user._id,
      loan: mongoose.isValidObjectId(req.body.loan) ? req.body.loan : undefined,
      loanName: loanName.slice(0, 160),
      amount,
      status: 'pending',
      repaymentStatus: 'none',
    });

    // Refresh credit/trust data so the score reflects this new activity.
    try {
      const { refreshCreditData } = require('../services/creditScore.service');
      await refreshCreditData(req.user._id);
    } catch (e) {
      console.error('Credit refresh error:', e.message);
    }

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// Fields only staff may change: the decision and the repayment ledger.
const STAFF_ONLY_FIELDS = ['status', 'repaymentStatus', 'remaining', 'nextPayment', 'repayments'];
// Fields an owner may still correct while the application is awaiting a decision.
const OWNER_EDITABLE_FIELDS = ['loan', 'loanName', 'amount'];

// PUT /api/v1/loans/applications/:id — owner (limited fields) or staff only
router.put('/applications/:id', auth, async (req, res) => {
  try {
    const existing = await LoanApplication.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Ombi hili halipatikani' });
    const isStaff = STAFF_ROLES.includes(req.user.role);
    const isOwner = existing.user && existing.user.toString() === req.user._id.toString();
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'Huna ruhusa ya kubadilisha ombi hili' });
    }

    const body = req.body || {};
    const updates = {};
    if (isStaff) {
      for (const [key, value] of Object.entries(body)) {
        if (key === 'user' || key === '_id') continue;
        updates[key] = value;
      }
    } else {
      if (existing.status !== 'pending') {
        return res.status(403).json({ message: 'Ombi lililoanza kushughulikiwa haliwezi kuhaririwa' });
      }
      const blocked = Object.keys(body).filter((key) => !OWNER_EDITABLE_FIELDS.includes(key));
      if (blocked.length) {
        return res.status(403).json({
          message: `Hali ya ombi na rekodi za malipo hurekebishwa na wakala tu (${blocked.join(', ')})`,
        });
      }
      for (const key of OWNER_EDITABLE_FIELDS) {
        if (body[key] !== undefined) updates[key] = body[key];
      }
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'Hakuna mabadiliko yaliyotolewa' });
    }

    const application = await LoanApplication.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
