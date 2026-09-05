const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { initiatePayment, getPaymentStatus } = require('../services/payment.service');

// POST /api/v1/payments/initiate
router.post('/initiate', auth, async (req, res) => {
  try {
    const { provider, phone, amount, reference, customerName } = req.body;
    const result = await initiatePayment({
      provider,
      phone,
      amount,
      reference,
      customerName: customerName || req.user?.name,
    });
    if (!result.success) {
      return res.status(400).json({ message: result.error });
    }
    res.status(201).json(result);
  } catch (error) {
    console.error('Payment initiate error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/payments/:transactionId
router.get('/:transactionId', auth, async (req, res) => {
  try {
    const result = await getPaymentStatus(req.params.transactionId);
    res.json(result);
  } catch (error) {
    console.error('Payment status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;