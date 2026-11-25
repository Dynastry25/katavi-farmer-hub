const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { sendNotification } = require('../services/notification.service');
const { TransportProvider, TransportBooking } = require('../models/Transport');
const TransportRate = require('../models/TransportRate');
const Rating = require('../models/Rating');
const cache = require('../services/cache.service');
const { auditRoute } = require('../services/audit.service');
const {
  transportFare,
  exceedsCapacity,
  makeTrackingCode,
} = require('../services/transport.service');
const { rankCarriers } = require('../services/matching.service');

const PROVIDERS_PREFIX = 'transport:providers';

const providersKey = (availableOnly) => `${PROVIDERS_PREFIX}:${availableOnly ? 'available' : 'all'}`;

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
    const availableOnly = req.query.available === 'true';
    const key = providersKey(availableOnly);
    const providers = await cache.remember(key, cache.TTL.LISTING, () => {
      const filter = availableOnly ? { available: true } : {};
      return TransportProvider.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    });
    res.json(providers);
  } catch (error) {
    console.error('Get transport providers error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

const publicCarrier = (provider) => ({
  id: provider._id,
  name: provider.name,
  phone: provider.phone,
  location: provider.location,
  vehicleType: provider.vehicleType,
  ratePerKm: provider.ratePerKm,
  capacityKg: provider.capacityKg,
  vehiclePlate: provider.vehiclePlate,
  description: provider.description,
  averageRating: provider.averageRating,
  totalReviews: provider.totalReviews,
});

// GET /api/v1/transport/match — rank available carriers for a load.
router.get('/match', async (req, res) => {
  try {
    const weightKg = numeric(req.query.weightKg, 0);
    const distanceKm = numeric(req.query.distanceKm, 0);
    if (weightKg <= 0) {
      return res.status(400).json({ message: 'Uzito wa mzigo unahitajika' });
    }
    const limit = Math.min(Math.max(Math.floor(numeric(req.query.limit, 5)) || 5, 1), 10);

    const providers = await TransportProvider.find({ available: true }).limit(200).lean();
    const rateCache = {};
    const carriers = [];
    for (const provider of providers) {
      const cacheKey = String(provider.vehicleType || '').toLowerCase();
      if (!rateCache[cacheKey]) {
        rateCache[cacheKey] = await resolveVehicleRate(provider.vehicleType);
      }
      const { totalAmount } = transportFare({
        rate: rateCache[cacheKey],
        providerRatePerKm: provider.ratePerKm,
        distanceKm,
        weightKg,
      });
      carriers.push({ ...publicCarrier(provider), fare: totalAmount });
    }

    const matches = rankCarriers(carriers, { weightKg, limit });
    res.json({ matches, criteria: { weightKg, distanceKm, limit } });
  } catch (error) {
    console.error('Match transport carriers error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/transport/providers/mine — vehicles registered by the caller.
router.get('/providers/mine', requireRole('logistics', 'admin'), async (req, res) => {
  try {
    const providers = await TransportProvider.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json(providers);
  } catch (error) {
    console.error('Get my transport providers error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/transport/providers — logistics partner or admin
router.post('/providers', requireRole('logistics', 'admin'), auditRoute({ action: 'create_transport_provider', category: 'transport', targetType: 'TransportProvider', targetId: () => undefined }), async (req, res) => {
  try {
    const data = providerFields(req.body);
    if (!data.name) {
      return res.status(400).json({ message: 'Jina la mtoa huduma linahitajika' });
    }
    if (!data.vehiclePlate) {
      return res.status(400).json({ message: 'Namba ya gari (plate) inahitajika' });
    }
    const provider = await TransportProvider.create({ ...data, owner: req.user._id });
    await cache.delByPrefix(PROVIDERS_PREFIX);
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
router.patch('/providers/:id', requireRole('logistics', 'admin'), auditRoute({ action: 'update_transport_provider', category: 'transport', targetType: 'TransportProvider' }), async (req, res) => {
  try {
    const provider = await TransportProvider.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Mtoa huduma hayupo' });
    if (!canManageProvider(provider, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kubadilisha gari hili' });
    }
    Object.assign(provider, providerFields(req.body));
    await provider.save();
    await cache.delByPrefix(PROVIDERS_PREFIX);
    res.json({ provider });
  } catch (error) {
    console.error('Update transport provider error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/transport/providers/:id — owner or admin
router.delete('/providers/:id', requireRole('logistics', 'admin'), auditRoute({ action: 'delete_transport_provider', category: 'transport', targetType: 'TransportProvider' }), async (req, res) => {
  try {
    const provider = await TransportProvider.findById(req.params.id);
    if (!provider) return res.status(404).json({ message: 'Mtoa huduma hayupo' });
    if (!canManageProvider(provider, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuondoa gari hili' });
    }
    await TransportProvider.deleteOne({ _id: provider._id });
    await cache.delByPrefix(PROVIDERS_PREFIX);
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
router.put('/rates/:key', requireRole('admin'), auditRoute({
  action: 'update_transport_rates',
  category: 'settings',
  details: (req) => ({ key: String(req.params.key || '') }),
}), async (req, res) => {
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
router.post('/rates/reset', requireRole('admin'), auditRoute({ action: 'reset_transport_rates', category: 'settings' }), async (req, res) => {
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
    const bookings = await TransportBooking.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ bookings });
  } catch (error) {
    console.error('Get transport bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/transport/bookings
router.post('/bookings', auth, auditRoute({
  action: 'create_transport_booking',
  category: 'booking',
  targetType: 'TransportBooking',
  targetId: () => undefined,
  details: (req) => ({
    vehicleType: String(req.body?.vehicleType || '').slice(0, 30),
    pickup: String(req.body?.pickupLocation || '').slice(0, 120),
    dropoff: String(req.body?.dropoffLocation || '').slice(0, 120),
  }),
}), async (req, res) => {
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
    if (exceedsCapacity({ capacityKg: provider.capacityKg, weightKg })) {
      return res.status(400).json({
        message: `Mzigo ni mzito kuliko uwezo wa gari (${provider.capacityKg} kg)`,
      });
    }

    const { perKm: ratePerKm, totalAmount } = transportFare({
      rate,
      providerRatePerKm: provider.ratePerKm,
      distanceKm,
      weightKg,
    });

    const scheduledDate = req.body.scheduledDate ? new Date(req.body.scheduledDate) : null;
    if (scheduledDate && Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ message: 'Tarehe ya safari si sahihi' });
    }

    const booking = await TransportBooking.create({
      user: req.user._id,
      transportProvider: provider._id,
      transportProviderName: provider.name,
      pickupLocation,
      dropoffLocation,
      goodsType: String(req.body.goodsType || '').trim().slice(0, 120),
      distanceKm,
      weightKg,
      ratePerKm,
      totalAmount,
      scheduledDate,
      trackingCode: makeTrackingCode(),
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
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ bookings });
  } catch (error) {
    console.error('Get all transport bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/transport/bookings/:id — customer, vehicle owner or admin.
router.get('/bookings/:id', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Ombi halipo' });
    }
    const booking = await TransportBooking.findById(req.params.id).lean();
    if (!booking) return res.status(404).json({ message: 'Ombi halipo' });

    if (req.user.role !== 'admin' && String(booking.user) !== String(req.user._id)) {
      const provider = booking.transportProvider
        ? await TransportProvider.findById(booking.transportProvider).select('owner').lean()
        : null;
      if (!provider?.owner || String(provider.owner) !== String(req.user._id)) {
        return res.status(403).json({ message: 'Huna ruhusa kuona ombi hili' });
      }
    }

    res.json({ booking });
  } catch (error) {
    console.error('Get transport booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/transport/bookings/:id/rate — customer rates a completed trip.
router.post('/bookings/:id/rate', auth, auditRoute({
  action: 'rate_transport_booking',
  category: 'booking',
  targetType: 'TransportBooking',
}), async (req, res) => {
  try {
    const booking = mongoose.isValidObjectId(req.params.id)
      ? await TransportBooking.findById(req.params.id)
      : null;
    if (!booking) return res.status(404).json({ message: 'Ombi halipo' });
    if (String(booking.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa kutathmini ombi hili' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Unaweza kutathmini safari iliyokamilika tu' });
    }
    if (booking.carrierRating > 0) {
      return res.status(409).json({ message: 'Umeshatathmini safari hii' });
    }

    const rating = Math.round(Number(req.body.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Toa alama kati ya 1 na 5' });
    }

    booking.carrierRating = rating;
    await booking.save();

    const provider = await TransportProvider.findById(booking.transportProvider);
    if (provider) {
      const reviews = Number(provider.totalReviews) || 0;
      const total = (Number(provider.averageRating) || 0) * reviews + rating;
      provider.totalReviews = reviews + 1;
      provider.averageRating = Math.round((total / provider.totalReviews) * 10) / 10;
      await provider.save();
      await cache.delByPrefix(PROVIDERS_PREFIX);
    }

    await Rating.create({
      rater: req.user._id,
      raterName: req.user.name || '',
      ratedTransportProvider: booking.transportProvider,
      rating,
      comment: String(req.body.comment || '').slice(0, 500),
      type: 'buyer_to_carrier',
    });

    if (provider?.owner) {
      await sendNotification(provider.owner, {
        title: 'Tathmini Mpya',
        message: `${req.user.name || 'Mteja'} ametathmini safari yako kwa alama ${rating}/5.`,
        type: 'system',
        link: '/logistics',
        metadata: { bookingId: String(booking._id), rating },
      });
    }

    res.status(201).json({ message: 'Asante kwa tathmini yako', rating });
  } catch (error) {
    console.error('Rate transport booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/transport/bookings/:id — the customer cancels until the
// trip starts; the vehicle owner is told so they can free the slot.
router.delete('/bookings/:id', auth, auditRoute({ action: 'cancel_transport_booking', category: 'booking', targetType: 'TransportBooking' }), async (req, res) => {
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
    booking.cancelledAt = new Date();
    booking.cancelReason = reason;
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
router.patch('/bookings/:id/status', requireRole('logistics', 'admin'), auditRoute({
  action: 'update_transport_booking_status',
  category: 'booking',
  targetType: 'TransportBooking',
  details: (req) => ({ status: String(req.body?.status || '') }),
}), async (req, res) => {
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
