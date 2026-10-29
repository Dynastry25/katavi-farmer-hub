const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { TransportProvider, TransportBooking } = require('../models/Transport');

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

module.exports = router;
module.exports.expirePendingOrders = async () => 0;
