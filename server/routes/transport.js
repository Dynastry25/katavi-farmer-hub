const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { sendNotification } = require('../services/notification.service');
const { TransportProvider, TransportBooking } = require('../models/Transport');
const TransportRate = require('../models/TransportRate');

const RATE_KEYS = ['boda', 'pickup', 'canter', 'lori'];
const DEFAULT_RATES = {
  boda: { base: 2000, perKm: 120, perKg: 5, capacityKg: 100 },
  pickup: { base: 8000, perKm: 150, perKg: 3, capacityKg: 1000 },
  canter: { base: 15000, perKm: 220, perKg: 2, capacityKg: 3000 },
  lori: { base: 30000, perKm: 350, perKg: 1.5, capacityKg: 7000 },
};

const numeric = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

const providerFields = (body) => {
  const data = {};
  if (body.name !== undefined) data.name = String(body.name).trim().slice(0, 120);
  if (body.phone !== undefined) data.phone = String(body.phone).trim().slice(0, 30);
  if (body.location !== undefined) data.location = String(body.location).trim().slice(0, 120);
  if (body.vehicleType !== undefined) data.vehicleType = String(body.vehicleType).slice(0, 30);
  if (body.ratePerKm !== undefined) data.ratePerKm = numeric(body.ratePerKm, 0);
  if (body.vehiclePlate !== undefined) data.vehiclePlate = String(body.vehiclePlate).trim().slice(0, 30);
  if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 300);
  if (body.available !== undefined) data.available = Boolean(body.available);
  return data;
};

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

// POST /api/v1/transport/providers — admin
router.post('/providers', requireRole('admin'), async (req, res) => {
  try {
    const data = providerFields(req.body);
    if (!data.name) {
      return res.status(400).json({ message: 'Jina la mtoa huduma linahitajika' });
    }
    const provider = await TransportProvider.create(data);
    res.status(201).json({ provider });
  } catch (error) {
    console.error('Create transport provider error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PATCH /api/v1/transport/providers/:id — admin
router.patch('/providers/:id', requireRole('admin'), async (req, res) => {
  try {
    const provider = await TransportProvider.findByIdAndUpdate(
      req.params.id,
      { $set: providerFields(req.body) },
      { new: true }
    );
    if (!provider) return res.status(404).json({ message: 'Mtoa huduma hayupo' });
    res.json({ provider });
  } catch (error) {
    console.error('Update transport provider error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/transport/providers/:id — admin
router.delete('/providers/:id', requireRole('admin'), async (req, res) => {
  try {
    const deleted = await TransportProvider.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Mtoa huduma hayupo' });
    res.json({ message: 'Mtoa huduma ameondolewa' });
  } catch (error) {
    console.error('Delete transport provider error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/transport/rates — public vehicle pricing
router.get('/rates', async (req, res) => {
  try {
    const stored = await TransportRate.find().lean();
    const byKey = new Map(stored.map((rate) => [rate.key, rate]));
    const rates = RATE_KEYS.map((key) => {
      const rate = byKey.get(key) || DEFAULT_RATES[key];
      return {
        key,
        base: rate.base,
        perKm: rate.perKm,
        perKg: rate.perKg,
        capacityKg: rate.capacityKg,
      };
    });
    res.json({ rates });
  } catch (error) {
    console.error('Get transport rates error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/transport/rates/:key — admin
router.put('/rates/:key', requireRole('admin'), async (req, res) => {
  try {
    const { key } = req.params;
    if (!RATE_KEYS.includes(key)) {
      return res.status(400).json({ message: 'Aina ya gari si sahihi' });
    }
    const defaults = DEFAULT_RATES[key];
    const rate = await TransportRate.findOneAndUpdate(
      { key },
      {
        $set: {
          base: numeric(req.body.base, defaults.base),
          perKm: numeric(req.body.perKm, defaults.perKm),
          perKg: numeric(req.body.perKg, defaults.perKg),
          capacityKg: numeric(req.body.capacityKg, defaults.capacityKg),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.json({ rate });
  } catch (error) {
    console.error('Update transport rate error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/transport/rates/reset — admin
router.post('/rates/reset', requireRole('admin'), async (req, res) => {
  try {
    await TransportRate.deleteMany({});
    const rates = await TransportRate.insertMany(
      RATE_KEYS.map((key) => ({ key, ...DEFAULT_RATES[key] }))
    );
    res.json({ rates });
  } catch (error) {
    console.error('Reset transport rates error:', error);
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
