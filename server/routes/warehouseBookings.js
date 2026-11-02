const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { Warehouse, StorageBooking } = require('../models/Warehouse');

const numeric = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

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
    if (!mongoose.isValidObjectId(req.body.warehouse)) {
      return res.status(400).json({ message: 'Chagua ghala' });
    }
    const warehouse = await Warehouse.findById(req.body.warehouse);
    if (!warehouse) return res.status(404).json({ message: 'Ghala halipo' });
    if (warehouse.available === false) {
      return res.status(400).json({ message: 'Ghala hili halipatikani kwa sasa' });
    }

    const bags = Math.max(0, Math.round(numeric(req.body.bags, 0)));
    if (bags <= 0) {
      return res.status(400).json({ message: 'Weka idadi ya gunia' });
    }
    const days = Math.max(0, Math.round(numeric(req.body.days, 0)));
    const months = Math.max(0, Math.round(numeric(req.body.months, 0)));

    let totalFee = 0;
    if (days > 0 && warehouse.feePerBagPerDay > 0) {
      totalFee = warehouse.feePerBagPerDay * bags * days;
    } else if (warehouse.feePerBagPerMonth > 0) {
      totalFee = warehouse.feePerBagPerMonth * bags * Math.max(months, 1);
    } else {
      return res.status(400).json({ message: 'Ghala hili halina bei iliyowekwa' });
    }

    const booking = await StorageBooking.create({
      user: req.user._id,
      warehouse: warehouse._id,
      warehouseName: warehouse.name,
      bags,
      months: days > 0 ? 0 : Math.max(months, 1),
      days,
      totalFee,
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
