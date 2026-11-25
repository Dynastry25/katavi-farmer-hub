const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const {
  ProcessingOffer,
  ProcessingBooking,
  PROCESSING_SERVICE_TYPES,
} = require('../models/Processing');
const { auth } = require('../middleware/auth');
const { requireRole, requireOwnershipOrAdmin } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const cache = require('../services/cache.service');
const {
  SERVICE_LABELS,
  round2,
  quoteProcessing,
  canTransitionBooking,
  ACTION_TARGETS,
} = require('../services/processing.service');

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const offerOwnerId = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  const offer = await ProcessingOffer.findById(req.params.id).select('provider');
  return offer?.provider || null;
};

const offerView = (offer) => ({ ...offer, serviceLabel: SERVICE_LABELS[offer.serviceType] || offer.serviceType });

// GET /api/v1/processing/offers — public directory of processors.
router.get('/offers', async (req, res) => {
  try {
    const query = { status: 'active' };
    if (PROCESSING_SERVICE_TYPES.includes(req.query.serviceType)) query.serviceType = req.query.serviceType;
    if (req.query.district) query.district = String(req.query.district).trim();
    if (req.query.crop) query.crops = new RegExp(escapeRegex(req.query.crop), 'i');
    if (req.query.q) query.businessName = new RegExp(escapeRegex(req.query.q), 'i');

    const key = ['processing', req.query.serviceType, req.query.district, req.query.crop, req.query.q]
      .map((value) => String(value || '').trim().toLowerCase())
      .join(':');
    const offers = await cache.remember(key, cache.TTL.LISTING, () => ProcessingOffer.find(query)
      .sort({ rating: -1, createdAt: -1 })
      .limit(60)
      .lean());

    res.json({ offers: offers.map(offerView) });
  } catch (error) {
    console.error('List processing offers error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/processing/offers/:id
router.get('/offers/:id', async (req, res) => {
  try {
    const offer = mongoose.isValidObjectId(req.params.id)
      ? await ProcessingOffer.findById(req.params.id).lean()
      : null;
    if (!offer) return res.status(404).json({ message: 'Huduma hii haipatikani' });
    res.json({ offer: offerView(offer) });
  } catch (error) {
    console.error('Processing offer detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/processing/offers — processors publish their service.
router.post('/offers', requireRole('farmer', 'seller', 'expert', 'admin'), auditRoute({
  action: 'create_processing_offer',
  category: 'content',
  targetType: 'ProcessingOffer',
}), async (req, res) => {
  try {
    const businessName = String(req.body.businessName || '').trim();
    if (businessName.length < 3) return res.status(400).json({ message: 'Taja jina la biashara' });
    if (!PROCESSING_SERVICE_TYPES.includes(req.body.serviceType)) {
      return res.status(400).json({ message: 'Chagua aina ya huduma ya usindikaji' });
    }
    const pricePerKg = Number(req.body.pricePerKg);
    if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      return res.status(400).json({ message: 'Weka bei kwa kilo' });
    }

    const offer = await ProcessingOffer.create({
      provider: req.user._id,
      providerName: req.user.name || '',
      businessName,
      serviceType: req.body.serviceType,
      crops: Array.isArray(req.body.crops)
        ? req.body.crops.map((crop) => String(crop).trim()).filter(Boolean).slice(0, 10)
        : [],
      description: String(req.body.description || '').trim(),
      location: String(req.body.location || '').trim(),
      district: String(req.body.district || req.user.district || '').trim(),
      pricePerKg: round2(pricePerKg),
      minQuantityKg: Math.max(0, Number(req.body.minQuantityKg) || 0),
      capacityKgPerDay: Math.max(0, Number(req.body.capacityKgPerDay) || 0),
      turnaroundDays: Math.max(0, Math.min(90, Number(req.body.turnaroundDays) || 1)),
      contactPhone: String(req.body.contactPhone || '').trim(),
    });
    await cache.delByPrefix('processing:');
    res.status(201).json({ offer: offerView(offer.toObject()) });
  } catch (error) {
    console.error('Create processing offer error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/processing/offers/:id — owner edits or pauses the offer.
router.put('/offers/:id', requireOwnershipOrAdmin(offerOwnerId), async (req, res) => {
  try {
    const offer = await ProcessingOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Huduma hii haipatikani' });

    if (req.body.businessName !== undefined) offer.businessName = String(req.body.businessName).trim();
    if (req.body.serviceType !== undefined) {
      if (!PROCESSING_SERVICE_TYPES.includes(req.body.serviceType)) {
        return res.status(400).json({ message: 'Aina ya huduma si sahihi' });
      }
      offer.serviceType = req.body.serviceType;
    }
    if (req.body.crops !== undefined) {
      offer.crops = Array.isArray(req.body.crops)
        ? req.body.crops.map((crop) => String(crop).trim()).filter(Boolean).slice(0, 10)
        : [];
    }
    if (req.body.pricePerKg !== undefined) offer.pricePerKg = Math.max(0, Number(req.body.pricePerKg) || 0);
    if (req.body.minQuantityKg !== undefined) offer.minQuantityKg = Math.max(0, Number(req.body.minQuantityKg) || 0);
    if (req.body.capacityKgPerDay !== undefined) {
      offer.capacityKgPerDay = Math.max(0, Number(req.body.capacityKgPerDay) || 0);
    }
    if (req.body.turnaroundDays !== undefined) {
      offer.turnaroundDays = Math.max(0, Math.min(90, Number(req.body.turnaroundDays) || 0));
    }
    if (req.body.description !== undefined) offer.description = String(req.body.description).trim();
    if (req.body.location !== undefined) offer.location = String(req.body.location).trim();
    if (req.body.district !== undefined) offer.district = String(req.body.district).trim();
    if (req.body.contactPhone !== undefined) offer.contactPhone = String(req.body.contactPhone).trim();
    if (req.body.status !== undefined) {
      if (!['active', 'paused'].includes(req.body.status)) {
        return res.status(400).json({ message: 'Hali ya huduma si sahihi' });
      }
      offer.status = req.body.status;
    }

    await offer.save();
    await cache.delByPrefix('processing:');
    res.json({ offer: offerView(offer.toObject()) });
  } catch (error) {
    console.error('Update processing offer error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/processing/bookings/my — bookings as customer and provider.
router.get('/bookings/my', auth, async (req, res) => {
  try {
    const [asCustomer, asProvider] = await Promise.all([
      ProcessingBooking.find({ customer: req.user._id }).sort({ createdAt: -1 }).limit(40).lean(),
      ProcessingBooking.find({ provider: req.user._id }).sort({ createdAt: -1 }).limit(40).lean(),
    ]);
    res.json({ asCustomer, asProvider });
  } catch (error) {
    console.error('My processing bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/processing/offers/:id/bookings — farmer books a lot.
router.post('/offers/:id/bookings', auth, auditRoute({
  action: 'create_processing_booking',
  category: 'booking',
  targetType: 'ProcessingBooking',
}), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Huduma hii haipatikani' });
    }
    const offer = await ProcessingOffer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Huduma hii haipatikani' });
    if (offer.status !== 'active') return res.status(400).json({ message: 'Huduma hii imesimamishwa' });

    const cropName = String(req.body.cropName || '').trim();
    if (cropName.length < 2) return res.status(400).json({ message: 'Taja zao unalosindika' });
    const { fee, blocker } = quoteProcessing(offer, req.body.quantityKg);
    if (blocker) return res.status(400).json({ message: blocker });

    const scheduledDate = req.body.scheduledDate ? new Date(req.body.scheduledDate) : null;
    if (scheduledDate && Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ message: 'Tarehe si sahihi' });
    }

    const booking = await ProcessingBooking.create({
      offer: offer._id,
      provider: offer.provider,
      providerName: offer.providerName,
      customer: req.user._id,
      customerName: req.user.name || '',
      businessName: offer.businessName,
      serviceType: offer.serviceType,
      cropName,
      quantityKg: round2(req.body.quantityKg),
      pricePerKg: offer.pricePerKg,
      feeAmount: fee,
      scheduledDate,
      notes: String(req.body.notes || '').trim(),
    });

    await sendNotification(offer.provider, {
      title: 'Ombi jipya la kusindika',
      message: `${req.user.name || 'Mkulima'}: ${cropName} kilo ${booking.quantityKg} — ${SERVICE_LABELS[offer.serviceType] || offer.serviceType}.`,
      type: 'booking',
      link: '/processing',
      metadata: { bookingId: String(booking._id) },
    });

    res.status(201).json({ booking });
  } catch (error) {
    console.error('Create processing booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/processing/bookings/:id/status — accept, start or complete.
router.post('/bookings/:id/status', auth, auditRoute({
  action: 'update_processing_booking',
  category: 'booking',
  targetType: 'ProcessingBooking',
  details: (req) => ({ action: String(req.body?.action || '') }),
}), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Ombi halipo' });
    }
    const booking = await ProcessingBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Ombi halipo' });

    const target = ACTION_TARGETS[req.body.action];
    if (!target) return res.status(400).json({ message: 'Hatua si sahihi' });
    if (!canTransitionBooking(booking.status, target)) {
      return res.status(400).json({ message: `Ombi haliwezi kubadilishwa kutoka "${booking.status}" kwenda "${target}"` });
    }

    const isProvider = String(booking.provider) === String(req.user._id);
    const isCustomer = String(booking.customer) === String(req.user._id);
    if (req.user.role !== 'admin') {
      const allowed = target === 'cancelled' ? (isCustomer || isProvider) : isProvider;
      if (!allowed) return res.status(403).json({ message: 'Huna ruhusa ya kubadilisha ombi hili' });
    }
    if (target === 'rejected' && !String(req.body.reason || '').trim()) {
      return res.status(400).json({ message: 'Toa sababu ya kukataa ombi' });
    }

    booking.status = target;
    if (target === 'completed') booking.completedAt = new Date();
    if (target === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancelReason = String(req.body.reason || '').trim().slice(0, 300);
    }
    await booking.save();

    const notifyUser = isProvider ? booking.customer : booking.provider;
    const titles = {
      accepted: 'Ombi lako la kusindika limekubaliwa',
      rejected: 'Ombi lako la kusindika limekataliwa',
      in_progress: 'Kusindika kumeanza',
      completed: 'Kusindika kumekamilika',
      cancelled: 'Ombi la kusindika limeghairiwa',
    };
    await sendNotification(notifyUser, {
      title: titles[target],
      message: `${booking.cropName} kilo ${booking.quantityKg} — ${booking.businessName || 'Kituo cha usindikaji'}.`,
      type: 'booking',
      link: '/processing',
      metadata: { bookingId: String(booking._id) },
    });

    res.json({ message: 'Hali imesasishwa', booking });
  } catch (error) {
    console.error('Update processing booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/processing/bookings/:id/rating — customer rates a finished job.
router.post('/bookings/:id/rating', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Ombi halipo' });
    }
    const booking = await ProcessingBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Ombi halipo' });
    if (String(booking.customer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Mteja pekee anaweza kutathmini' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Tathmini baada ya huduma kukamilika tu' });
    }
    if (booking.customerRating > 0) {
      return res.status(409).json({ message: 'Umeshatathmini ombi hili' });
    }
    const rating = Number(req.body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Toa alama kati ya 1 na 5' });
    }

    booking.customerRating = Math.round(rating);
    await booking.save();

    const offer = await ProcessingOffer.findById(booking.offer);
    if (offer) {
      const total = offer.rating * offer.reviews + booking.customerRating;
      offer.reviews += 1;
      offer.rating = Math.round((total / offer.reviews) * 10) / 10;
      await offer.save();
      await cache.delByPrefix('processing:');
    }

    res.status(201).json({ message: 'Asante kwa tathmini yako', booking });
  } catch (error) {
    console.error('Rate processing booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
