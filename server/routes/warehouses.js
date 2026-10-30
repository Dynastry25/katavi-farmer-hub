const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { sendNotification } = require('../services/notification.service');
const { Warehouse, StorageBooking } = require('../models/Warehouse');

const BOOKING_STATUSES = ['pending', 'active', 'completed', 'cancelled'];

const STATUS_MESSAGES = {
  active: 'Uhifadhi wako umeanza',
  completed: 'Uhifadhi umekamilika',
  cancelled: 'Uhifadhi umeghairiwa',
};

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

// GET /api/v1/warehouses/bookings/all — all storage requests (logistics / admin)
router.get('/bookings/all', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const bookings = await StorageBooking.find()
      .populate('user', 'name phone location district')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Get all storage bookings error:', error);
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

// PATCH /api/v1/warehouses/bookings/:id/status — logistics / admin
router.patch('/bookings/:id/status', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Hali ya uhifadhi si sahihi' });
    }

    const booking = await StorageBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Uhifadhi haupo' });

    booking.status = status;
    await booking.save();

    const title = STATUS_MESSAGES[status];
    if (title) {
      await sendNotification(booking.user, {
        title,
        message: `${booking.warehouseName || 'Ghala'} · gunia ${booking.bags} kwa miezi ${booking.months}`,
        type: 'order',
        link: '/transport',
      });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Update storage booking status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
module.exports.expirePendingOrders = async () => 0;
