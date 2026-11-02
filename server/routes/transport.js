const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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

// Maps a provider's free-text vehicle type onto the priced rate classes.
const VEHICLE_RATE_KEYS = {
  motorcycle: 'boda', boda: 'boda',
  pickup: 'pickup',
  truck: 'canter', canter: 'canter',
  lorry: 'lori', lori: 'lori',
};

const resolveVehicleRate = async (vehicleType) => {
  const key = VEHICLE_RATE_KEYS[String(vehicleType || '').toLowerCase()] || 'lori';
  const stored = await TransportRate.findOne({ key }).lean();
  const rate = stored || DEFAULT_RATES[key];
  const defaults = DEFAULT_RATES[key];
  return {
    key,
    base: numeric(rate.base, defaults.base),
    perKm: numeric(rate.perKm, defaults.perKm),
    perKg: numeric(rate.perKg, defaults.perKg),
  };
};

const roundFee = (value) => Math.round(value / 500) * 500;

const providerFields = (body) => {
  const data = {};
  if (body.name !== undefined) data.name = String(body.name).trim().slice(0, 120);
  if (body.phone !== undefined) data.phone = String(body.phone).trim().slice(0, 30);
  if (body.location !== undefined) data.location = String(body.location).trim().slice(0, 120);
  if (body.vehicleType !== undefined) data.vehicleType = String(body.vehicleType).slice(0, 30);
  if (body.ratePerKm !== undefined) data.ratePerKm = numeric(body.ratePerKm, 0);
  if (body.capacityKg !== undefined) data.capacityKg = numeric(body.capacityKg, 0);
  if (body.vehiclePlate !== undefined) data.vehiclePlate = String(body.vehiclePlate).trim().slice(0, 30);
  if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 300);
  if (body.available !== undefined) data.available = Boolean(body.available);
  return data;
};

const BOOKING_STATUSES = ['pending', 'accepted', 'in_transit', 'completed', 'cancelled'];

const BOOKING_TRANSITIONS = {
  pending: ['accepted', 'cancelled'],
  accepted: ['in_transit', 'cancelled'],
  in_transit: ['completed'],
  completed: [],
  cancelled: [],
};

const canTransitionBooking = (from, to) =>
  Boolean(BOOKING_TRANSITIONS[from]?.includes(to));

const STATUS_MESSAGES = {
  accepted: 'Ombi la usafiri limekubaliwa',
  in_transit: 'Mzigo uko njiani',
  completed: 'Usafiri umekamilika',
  cancelled: 'Ombi la usafiri limeghairiwa',
};

// GET /api/v1/transport/providers
router.get('/providers', async (req, res) => {
  try {
    const filter = {};
    if (req.query.available === 'true') filter.available = true;
    const providers = await TransportProvider.find(filter).sort({ createdAt: -1 });
    res.json(providers);
  } catch (error) {
    console.error('Get transport providers error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/transport/providers/mine — vehicles registered by the caller.
router.get('/providers/mine', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const providers = await TransportProvider.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(providers);
  } catch (error) {
    console.error('Get my transport providers error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/transport/providers — logistics partner or admin
router.post('/providers', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const data = providerFields(req.body);
    if (!data.name) {
      return res.status(400).json({ message: 'Jina la mtoa huduma linahitajika' });
    }
    if (!data.vehiclePlate) {
      return res.status(400).json({ message: 'Namba ya gari (plate) inahitajika' });
    }
    const provider = await TransportProvider.create({ ...data, owner: req.user._id });
    res.status(201).json({ provider });
  } catch (error) {
    console.error('Create transport provider error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

const canManageProvider = (provider, user) =>
  user.role === 'admin' ||
  (provider.owner && String(provider.owner) === String(user._id));

// PATCH /api/v1/transport/providers/:id — owner or admin
router.patch('/providers/:id', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const provider = await TransportProvider.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Mtoa huduma hayupo' });
    if (!canManageProvider(provider, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kubadilisha gari hili' });
    }
    Object.assign(provider, providerFields(req.body));
    await provider.save();
    res.json({ provider });
  } catch (error) {
    console.error('Update transport provider error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/transport/providers/:id — owner or admin
router.delete('/providers/:id', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const provider = await TransportProvider.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Mtoa huduma hayupo' });
    if (!canManageProvider(provider, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuondoa gari hili' });
    }
    await TransportProvider.deleteOne({ _id: provider._id });
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
    const pickupLocation = String(req.body.pickupLocation || '').trim();
    const dropoffLocation = String(req.body.dropoffLocation || '').trim();
    if (!pickupLocation || !dropoffLocation) {
      return res.status(400).json({ message: 'Chagua mahali pa kuchukua na kupeleka' });
    }
    if (!mongoose.isValidObjectId(req.body.transportProvider)) {
      return res.status(400).json({ message: 'Chagua gari la kutumia' });
    }
    const provider = await TransportProvider.findById(req.body.transportProvider);
    if (!provider) return res.status(404).json({ message: 'Gari hili halipo' });
    if (provider.available === false) {
      return res.status(400).json({ message: 'Gari hili halipatikani kwa sasa' });
    }

    // Fare is derived from the stored rate card plus the provider's own
    // per-km price; client-supplied rates and totals are ignored.
    const rate = await resolveVehicleRate(provider.vehicleType);
    const distanceKm = numeric(req.body.distanceKm, 0);
    const weightKg = numeric(req.body.weightKg, 0);
    const ratePerKm = provider.ratePerKm > 0 ? provider.ratePerKm : rate.perKm;
    const totalAmount = roundFee(
      rate.base + ratePerKm * distanceKm + rate.perKg * weightKg
    );

    const booking = await TransportBooking.create({
      user: req.user._id,
      transportProvider: provider._id,
      transportProviderName: provider.name,
      pickupLocation,
      dropoffLocation,
      distanceKm,
      ratePerKm,
      totalAmount,
      notes: String(req.body.notes || '').trim().slice(0, 300),
      status: 'pending',
    });

    if (provider.owner && String(provider.owner) !== String(req.user._id)) {
      await sendNotification(provider.owner, {
        title: 'Ombi Jipya la Usafiri',
        message: `${req.user.name || 'Mteja'}: ${pickupLocation} → ${dropoffLocation}`,
        type: 'order',
        link: '/logistics',
        metadata: { bookingId: String(booking._id) },
      });
    }

    res.status(201).json({ booking });
  } catch (error) {
    console.error('Create transport booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/transport/bookings/all — requests for the caller's vehicles
// (logistics), or everything for an admin.
router.get('/bookings/all', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    let filter = {};
    if (req.user.role !== 'admin') {
      const owned = await TransportProvider.find({ owner: req.user._id })
        .select('_id')
        .lean();
      filter = { transportProvider: { $in: owned.map((p) => p._id) } };
    }
    const bookings = await TransportBooking.find(filter)
      .populate('user', 'name phone location district')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (error) {
    console.error('Get all transport bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/transport/bookings/:id — the customer cancels until the
// trip starts; the vehicle owner is told so they can free the slot.
router.delete('/bookings/:id', auth, async (req, res) => {
  try {
    const booking = await TransportBooking.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!booking) return res.status(404).json({ message: 'Ombi halipo' });
    if (booking.status === 'in_transit') {
      return res.status(400).json({
        message: 'Mzigo uko njiani; wasiliana na mtoa huduma kughairi',
      });
    }
    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Usafiri umekamilika; huwezi kughairi' });
    }
    if (booking.status === 'cancelled') {
      return res.json({ message: 'Ombi limeghairiwa', booking });
    }

    const reason = String(req.body.reason || '').trim().slice(0, 200);
    booking.status = 'cancelled';
    await booking.save();

    const provider = booking.transportProvider
      ? await TransportProvider.findById(booking.transportProvider).select('owner')
      : null;
    if (provider?.owner && String(provider.owner) !== String(req.user._id)) {
      await sendNotification(provider.owner, {
        title: 'Ombi la Usafiri Limeghairiwa',
        message: `${req.user.name || 'Mteja'}: ${booking.pickupLocation} → ${booking.dropoffLocation}` +
          (reason ? `. Sababu: ${reason}` : ''),
        type: 'order',
        link: '/logistics',
        metadata: { bookingId: String(booking._id) },
      });
    }

    res.json({ message: 'Ombi limeghairiwa', booking });
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

    if (req.user.role !== 'admin') {
      const provider = await TransportProvider.findById(booking.transportProvider);
      if (!provider || !provider.owner || String(provider.owner) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Ombi hili si la gari lako' });
      }
    }

    if (!canTransitionBooking(booking.status, status)) {
      return res.status(400).json({
        message: `Ombi hili haliwezi kubadilishwa kutoka "${booking.status}" kwenda "${status}"`,
      });
    }

    const reason = String(req.body.reason || '').trim().slice(0, 200);
    booking.status = status;
    await booking.save();

    const title = STATUS_MESSAGES[status];
    if (title) {
      await sendNotification(booking.user, {
        title,
        message: `${booking.transportProviderName || 'Msafirishaji'}: ${booking.pickupLocation} → ${booking.dropoffLocation}` +
          (status === 'cancelled' && reason ? `. Sababu: ${reason}` : ''),
        type: 'order',
        link: '/transport',
        metadata: { bookingId: String(booking._id) },
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
module.exports.canTransitionBooking = canTransitionBooking;
