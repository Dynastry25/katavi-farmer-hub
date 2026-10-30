const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { sendNotification } = require('../services/notification.service');
const { TransportProvider, TransportBooking } = require('../models/Transport');

const BOOKING_STATUSES = ['pending', 'accepted', 'in_transit', 'completed', 'cancelled'];

const STATUS_MESSAGES = {
  accepted: 'Ombi la usafiri limekubaliwa',
  in_transit: 'Mzigo uko njiani',
  completed: 'Usafiri umekamilika',
  cancelled: 'Ombi la usafiri limeghairiwa',
};

// GET /api/v1/transport/providers
router.get('/providers', async (req, res) => {
  try {
    const providers = await TransportProvider.find().sort({ createdAt: -1 });
    res.json(providers);
  } catch (error) {
    console.error('Get transport providers error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/transport/bookings
router.get('/bookings', auth, async (req, res) => {
  try {
    const bookings = await TransportBooking.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Get transport bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/transport/bookings
router.post('/bookings', auth, async (req, res) => {
  try {
    const booking = await TransportBooking.create({ ...req.body, user: req.user._id });
    res.status(201).json({ booking });
  } catch (error) {
    console.error('Create transport booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/transport/bookings/all — all requests (logistics / admin)
router.get('/bookings/all', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const bookings = await TransportBooking.find()
      .populate('user', 'name phone location district')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Get all transport bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/transport/bookings/:id
router.delete('/bookings/:id', auth, async (req, res) => {
  try {
    await TransportBooking.deleteOne({ _id: req.params.id, user: req.user._id });
    res.json({ message: 'Ombi limeghairiwa' });
  } catch (error) {
    console.error('Cancel transport booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/transport/bookings/:id/status — logistics / admin
router.patch('/bookings/:id/status', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!BOOKING_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Hali ya ombi si sahihi' });
    }

    const booking = await TransportBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Ombi halipo' });

    booking.status = status;
    await booking.save();

    const title = STATUS_MESSAGES[status];
    if (title) {
      await sendNotification(booking.user, {
        title,
        message: `${booking.transportProviderName || 'Msafirishaji'}: ${booking.pickupLocation} → ${booking.dropoffLocation}`,
        type: 'order',
        link: '/transport',
      });
    }

    res.json({ booking });
  } catch (error) {
    console.error('Update transport booking status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
module.exports.expirePendingOrders = async () => 0;
