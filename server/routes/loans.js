const express = require('express');
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
    const application = await LoanApplication.create({ ...req.body, user: req.user._id });

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

// PUT /api/loans/applications/:id — owner (or staff) only
router.put('/applications/:id', auth, async (req, res) => {
  try {
    const existing = await LoanApplication.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Ombi hili halipatikani' });
    const isOwner = existing.user && existing.user.toString() === req.user._id.toString();
    if (!isOwner && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kubadilisha ombi hili' });
    }
    const application = await LoanApplication.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
