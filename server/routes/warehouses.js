const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { Warehouse, StorageBooking } = require('../models/Warehouse');

// GET /api/v1/warehouses
router.get('/', async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/warehouse-bookings
router.get('/bookings', auth, async (req, res) => {
  try {
    const bookings = await StorageBooking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Get storage bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/warehouse-bookings
router.post('/bookings', auth, async (req, res) => {
  try {
    const booking = await StorageBooking.create({ ...req.body, user: req.user._id });
    res.status(201).json({ booking });
  } catch (error) {
    console.error('Create storage booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
module.exports.expirePendingOrders = async () => 0;
