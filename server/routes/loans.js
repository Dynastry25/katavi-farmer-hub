const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const LoanApplication = require('../models/LoanApplication');
const { auth } = require('../middleware/auth');

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

// POST /api/loans/apply
router.post('/apply', auth, async (req, res) => {
  try {
    const application = await LoanApplication.create({ ...req.body, user: req.user._id });
    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/loans/applications/:id
router.put('/applications/:id', auth, async (req, res) => {
  try {
    const application = await LoanApplication.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!application) return res.status(404).json({ message: 'Ombi hili halipatikani' });
    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
