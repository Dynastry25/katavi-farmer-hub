const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { StorageBooking } = require('../models/Warehouse');

// GET /api/v1/warehouse-bookings
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await StorageBooking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Get storage bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/warehouse-bookings
router.post('/', auth, async (req, res) => {
  try {
    const booking = await StorageBooking.create({
      user: req.user._id,
      warehouse: req.body.warehouse,
      warehouseName: req.body.warehouseName || '',
      bags: Number(req.body.bags) || 0,
      months: Number(req.body.months) || 0,
      days: Number(req.body.days) || 0,
      totalFee: Number(req.body.totalFee) || 0,
      status: 'pending',
    });
    res.status(201).json({ booking });
  } catch (error) {
    console.error('Create storage booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
module.exports.expirePendingOrders = async () => 0;
