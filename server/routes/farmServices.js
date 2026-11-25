const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const FarmServiceOffer = require('../models/FarmServiceOffer');
const ServiceBooking = require('../models/ServiceBooking');
const Rating = require('../models/Rating');
const { auth, optionalAuth } = require('../middleware/auth');
const { STAFF_ROLES } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const { initiatePayment, isPaymentPending } = require('../services/payment.service');
const cache = require('../services/cache.service');
const {
  estimateAmount,
  canTransitionBooking,
  offerRating,
  nextRatingStats,
} = require('../services/farmService.service');

const LIST_PREFIX = 'farm-services:offers:';
const PROVIDER_ROLES = ['farmer', 'seller', 'expert', 'admin'];
const PAYABLE_STATUSES = ['accepted', 'in_progress', 'completed', 'confirmed'];

const listKey = (query) => {
  const signature = JSON.stringify({
    serviceType: query.serviceType || '',
    district: query.district || '',
    q: query.q || '',
    page: query.page || '',
  });
  const digest = crypto.createHash('md5').update(signature).digest('hex');
  return `${LIST_PREFIX}${digest}`;
};

const notify = async (userId, payload) => {
  if (!userId) return;
  try {
    await sendNotification(userId, { type: 'system', ...payload });
  } catch (e) { /* best effort */ }
};

const isProviderOrStaff = (offer, user) => (
  String(offer.provider) === String(user._id) || STAFF_ROLES.includes(user.role)
);

const numberOr = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const dateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const canViewBooking = (booking, user) => (
  String(booking.customer) === String(user._id)
  || String(booking.provider) === String(user._id)
  || STAFF_ROLES.includes(user.role)
);

// GET /api/v1/farm-services/offers — public service listings
router.get('/offers', optionalAuth, async (req, res) => {
  try {
    const filter = { status: 'active' };
    if (req.query.serviceType) filter.serviceType = String(req.query.serviceType);
    if (req.query.district) filter.district = String(req.query.district);

    const search = String(req.query.q || '').trim();
    if (search) {
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: pattern }, { description: pattern }, { equipment: pattern }];
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);

    const load = async () => {
      const [items, total] = await Promise.all([
        FarmServiceOffer.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        FarmServiceOffer.countDocuments(filter),
      ]);
      return {
        items: items.map((offer) => ({ ...offer, averageRating: offerRating(offer) })),
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
      };
    };

    const result = req.user
      ? await load()
      : await cache.remember(listKey(req.query), cache.TTL.LISTING, load);
    res.json(result);
  } catch (error) {
    console.error('List farm services error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farm-services/offers/my — the provider's own listings
router.get('/offers/my', auth, async (req, res) => {
  try {
    const offers = await FarmServiceOffer.find({ provider: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(offers.map((offer) => ({ ...offer, averageRating: offerRating(offer) })));
  } catch (error) {
    console.error('My farm services error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farm-services/offers/:id
router.get('/offers/:id', optionalAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Huduma haipatikani' });
    }
    const offer = await FarmServiceOffer.findById(req.params.id).lean();
    if (!offer) return res.status(404).json({ message: 'Huduma haipatikani' });

    const [completed, reviews] = await Promise.all([
      ServiceBooking.countDocuments({ offer: offer._id, status: 'confirmed' }),
      Rating.countDocuments({ ratedServiceBooking: { $ne: null }, ratedUser: offer.provider }),
    ]);

    res.json({
      ...offer,
      averageRating: offerRating(offer),
      completedBookingsCount: completed,
      reviewsCount: reviews,
      isProvider: req.user ? String(offer.provider) === String(req.user._id) : false,
    });
  } catch (error) {
    console.error('Farm service detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farm-services/offers — verified providers list a service
router.post('/offers', auth, auditRoute({
  action: 'create_farm_service',
  category: 'booking',
  targetType: 'FarmServiceOffer',
}), async (req, res) => {
  try {
    const user = req.user;
    if (!PROVIDER_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa kutangaza huduma za kilimo' });
    }
    if (!(user.phoneVerified || user.isVerified || STAFF_ROLES.includes(user.role))) {
      return res.status(403).json({
        message: 'Thibitisha namba yako ya simu kabla ya kutangaza huduma',
      });
    }

    const body = req.body || {};
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    if (title.length < 6) return res.status(400).json({ message: 'Jina la huduma lifafanue kazi' });
    if (description.length < 20) {
      return res.status(400).json({ message: 'Maelezo yahitaji angalau herufi 20' });
    }

    const offer = await FarmServiceOffer.create({
      provider: user._id,
      providerName: user.name || '',
      providerRole: user.role || '',
      title: title.slice(0, 160),
      description: description.slice(0, 2000),
      serviceType: body.serviceType || 'other',
      equipment: String(body.equipment || '').slice(0, 300),
      priceAmount: numberOr(body.priceAmount),
      priceUnit: body.priceUnit || 'per_acre',
      district: String(body.district || user.district || 'Katavi'),
      ward: String(body.ward || user.ward || ''),
      villages: String(body.villages || '').slice(0, 300),
      availability: String(body.availability || '').slice(0, 300),
    });

    await cache.delByPrefix(LIST_PREFIX);
    res.status(201).json(offer);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za huduma si sahihi' });
    }
    console.error('Create farm service error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/farm-services/offers/:id
router.put('/offers/:id', auth, auditRoute({
  action: 'update_farm_service',
  category: 'booking',
  targetType: 'FarmServiceOffer',
}), async (req, res) => {
  try {
    const offer = mongoose.isValidObjectId(req.params.id)
      ? await FarmServiceOffer.findById(req.params.id)
      : null;
    if (!offer) return res.status(404).json({ message: 'Huduma haipatikani' });
    if (!isProviderOrStaff(offer, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kubadilisha huduma hii' });
    }

    const body = req.body || {};
    if (body.title !== undefined) offer.title = String(body.title).trim().slice(0, 160);
    if (body.description !== undefined) offer.description = String(body.description).trim().slice(0, 2000);
    if (body.serviceType !== undefined) offer.serviceType = body.serviceType;
    if (body.equipment !== undefined) offer.equipment = String(body.equipment).slice(0, 300);
    if (body.priceAmount !== undefined) offer.priceAmount = numberOr(body.priceAmount, offer.priceAmount);
    if (body.priceUnit !== undefined) offer.priceUnit = body.priceUnit;
    if (body.district !== undefined) offer.district = String(body.district);
    if (body.ward !== undefined) offer.ward = String(body.ward);
    if (body.villages !== undefined) offer.villages = String(body.villages).slice(0, 300);
    if (body.availability !== undefined) offer.availability = String(body.availability).slice(0, 300);
    if (body.status !== undefined) {
      if (!['active', 'paused', 'closed'].includes(body.status)) {
        return res.status(400).json({ message: 'Hali ya huduma si sahihi' });
      }
      offer.status = body.status;
    }

    await offer.save();
    await cache.delByPrefix(LIST_PREFIX);
    res.json(offer);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za huduma si sahihi' });
    }
    console.error('Update farm service error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/farm-services/offers/:id/bookings — customer requests the service
router.post('/offers/:id/bookings', auth, auditRoute({
  action: 'create_service_booking',
  category: 'booking',
  targetType: 'ServiceBooking',
}), async (req, res) => {
  try {
    const offer = mongoose.isValidObjectId(req.params.id)
      ? await FarmServiceOffer.findById(req.params.id)
      : null;
    if (!offer) return res.status(404).json({ message: 'Huduma haipatikani' });
    if (offer.status !== 'active') {
      return res.status(400).json({ message: 'Huduma hii haipokei maombi kwa sasa' });
    }
    if (String(offer.provider) === String(req.user._id)) {
      return res.status(400).json({ message: 'Hauwezi kuomba huduma yako mwenyewe' });
    }

    const scheduledDate = dateOrNull(req.body.scheduledDate);
    if (req.body.scheduledDate && !scheduledDate) {
      return res.status(400).json({ message: 'Tarehe uliyochagua si sahihi' });
    }

    const acres = numberOr(req.body.acres);
    const booking = await ServiceBooking.create({
      offer: offer._id,
      provider: offer.provider,
      providerName: offer.providerName,
      customer: req.user._id,
      customerName: req.user.name || '',
      title: offer.title,
      serviceType: offer.serviceType,
      scheduledDate,
      location: String(req.body.location || '').slice(0, 300),
      acres,
      notes: String(req.body.notes || '').slice(0, 1000),
      estimatedAmount: estimateAmount(offer, {
        acres,
        hours: numberOr(req.body.hours),
        days: numberOr(req.body.days),
        trips: numberOr(req.body.trips),
      }),
    });

    await notify(offer.provider, {
      title: 'Ombi Jipya la Huduma',
      message: `${booking.customerName} ameomba "${offer.title}". Tuma bei.`,
      link: '/services',
      metadata: { bookingId: booking._id, offerId: offer._id },
    });

    res.status(201).json(booking);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za ombi si sahihi' });
    }
    console.error('Create service booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farm-services/bookings/my — bookings the caller made
router.get('/bookings/my', auth, async (req, res) => {
  try {
    const bookings = await ServiceBooking.find({ customer: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(bookings);
  } catch (error) {
    console.error('My service bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farm-services/bookings/provider — jobs for the caller's services
router.get('/bookings/provider', auth, async (req, res) => {
  try {
    const bookings = await ServiceBooking.find({ provider: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(bookings);
  } catch (error) {
    console.error('Provider bookings error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/farm-services/bookings/:id
router.get('/bookings/:id', auth, async (req, res) => {
  try {
    const booking = mongoose.isValidObjectId(req.params.id)
      ? await ServiceBooking.findById(req.params.id).lean()
      : null;
    if (!booking) return res.status(404).json({ message: 'Ombi halipatikani' });
    if (!canViewBooking(booking, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kuona ombi hili' });
    }
    res.json(booking);
  } catch (error) {
    console.error('Service booking detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

/* Booking lifecycle actions. Each loads the booking, checks who is acting
 * and that the transition is legal before saving. */

const loadBooking = async (id, user, role) => {
  const booking = mongoose.isValidObjectId(id) ? await ServiceBooking.findById(id) : null;
  if (!booking) return { error: { status: 404, message: 'Ombi halipatikani' } };

  if (role === 'provider' && String(booking.provider) !== String(user._id)
    && !STAFF_ROLES.includes(user.role)) {
    return { error: { status: 403, message: 'Huna ruhusa kwa ombi hili' } };
  }
  if (role === 'customer' && String(booking.customer) !== String(user._id)) {
    return { error: { status: 403, message: 'Huna ruhusa kwa ombi hili' } };
  }
  if (role === 'either' && !canViewBooking(booking, user)) {
    return { error: { status: 403, message: 'Huna ruhusa kwa ombi hili' } };
  }
  return { booking };
};

// POST /bookings/:id/quote — provider names the price
router.post('/bookings/:id/quote', auth, auditRoute({
  action: 'quote_service_booking',
  category: 'booking',
  targetType: 'ServiceBooking',
}), async (req, res) => {
  try {
    const { booking, error } = await loadBooking(req.params.id, req.user, 'provider');
    if (error) return res.status(error.status).json({ message: error.message });
    if (!canTransitionBooking(booking.status, 'quoted')) {
      return res.status(400).json({ message: 'Ombi hili haliwezi kupigiwa bei sasa' });
    }

    const quotedAmount = Number(req.body.quotedAmount);
    if (!Number.isFinite(quotedAmount) || quotedAmount < 0) {
      return res.status(400).json({ message: 'Weka bei sahihi' });
    }

    booking.quotedAmount = quotedAmount;
    booking.quoteNote = String(req.body.quoteNote || '').slice(0, 500);
    booking.status = 'quoted';
    await booking.save();

    await notify(booking.customer, {
      title: 'Bei ya Huduma Imepokelewa',
      message: `Bei ya "${booking.title}": TZS ${quotedAmount.toLocaleString('en-US')}.`,
      link: '/services',
      metadata: { bookingId: booking._id },
    });

    res.json(booking);
  } catch (error) {
    console.error('Quote booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /bookings/:id/accept — customer accepts the quote
router.post('/bookings/:id/accept', auth, auditRoute({
  action: 'accept_service_booking',
  category: 'booking',
  targetType: 'ServiceBooking',
}), async (req, res) => {
  try {
    const { booking, error } = await loadBooking(req.params.id, req.user, 'customer');
    if (error) return res.status(error.status).json({ message: error.message });
    if (!canTransitionBooking(booking.status, 'accepted')) {
      return res.status(400).json({ message: 'Ombi hili haliwezi kukubaliwa sasa' });
    }

    const paymentMethod = req.body.paymentMethod === 'mm' ? 'mm' : 'cash';
    booking.status = 'accepted';
    booking.totalAmount = booking.quotedAmount;
    booking.paymentMethod = paymentMethod;
    await booking.save();

    await notify(booking.provider, {
      title: 'Huduma Imekubaliwa',
      message: `${booking.customerName} amekubali bei ya "${booking.title}".`,
      link: '/services',
      metadata: { bookingId: booking._id },
    });

    res.json(booking);
  } catch (error) {
    console.error('Accept booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /bookings/:id/start — provider begins the work
router.post('/bookings/:id/start', auth, auditRoute({
  action: 'start_service_booking',
  category: 'booking',
  targetType: 'ServiceBooking',
}), async (req, res) => {
  try {
    const { booking, error } = await loadBooking(req.params.id, req.user, 'provider');
    if (error) return res.status(error.status).json({ message: error.message });
    if (!canTransitionBooking(booking.status, 'in_progress')) {
      return res.status(400).json({ message: 'Huduma hii haiwezi kuanza sasa' });
    }

    booking.status = 'in_progress';
    await booking.save();

    await notify(booking.customer, {
      title: 'Huduma Imeanza',
      message: `${booking.providerName} ameanza "${booking.title}".`,
      link: '/services',
      metadata: { bookingId: booking._id },
    });

    res.json(booking);
  } catch (error) {
    console.error('Start booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /bookings/:id/complete — provider marks the work done
router.post('/bookings/:id/complete', auth, auditRoute({
  action: 'complete_service_booking',
  category: 'booking',
  targetType: 'ServiceBooking',
}), async (req, res) => {
  try {
    const { booking, error } = await loadBooking(req.params.id, req.user, 'provider');
    if (error) return res.status(error.status).json({ message: error.message });
    if (!canTransitionBooking(booking.status, 'completed')) {
      return res.status(400).json({ message: 'Huduma hii haiwezi kukamilishwa sasa' });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    await booking.save();

    await notify(booking.customer, {
      title: 'Huduma Imekamilika',
      message: `${booking.providerName} amekamilisha "${booking.title}". Thibitisha.`,
      link: '/services',
      metadata: { bookingId: booking._id },
    });

    res.json(booking);
  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /bookings/:id/confirm — customer accepts the completed work
router.post('/bookings/:id/confirm', auth, auditRoute({
  action: 'confirm_service_booking',
  category: 'booking',
  targetType: 'ServiceBooking',
}), async (req, res) => {
  try {
    const { booking, error } = await loadBooking(req.params.id, req.user, 'customer');
    if (error) return res.status(error.status).json({ message: error.message });
    if (!canTransitionBooking(booking.status, 'confirmed')) {
      return res.status(400).json({ message: 'Huduma hii haiwezi kuthibitishwa sasa' });
    }

    booking.status = 'confirmed';
    booking.confirmedAt = new Date();
    await booking.save();

    await FarmServiceOffer.updateOne(
      { _id: booking.offer },
      { $inc: { completedBookings: 1 } }
    );

    await notify(booking.provider, {
      title: 'Kazi Imethibitishwa',
      message: `${booking.customerName} amethibitisha "${booking.title}".`,
      link: '/services',
      metadata: { bookingId: booking._id },
    });

    res.json(booking);
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /bookings/:id/cancel — either party before the work starts
router.post('/bookings/:id/cancel', auth, auditRoute({
  action: 'cancel_service_booking',
  category: 'booking',
  targetType: 'ServiceBooking',
}), async (req, res) => {
  try {
    const { booking, error } = await loadBooking(req.params.id, req.user, 'either');
    if (error) return res.status(error.status).json({ message: error.message });
    if (!canTransitionBooking(booking.status, 'cancelled')) {
      return res.status(400).json({ message: 'Ombi hili haliwezi kufutwa sasa' });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelReason = String(req.body.reason || '').slice(0, 300);
    await booking.save();

    const other = String(req.user._id) === String(booking.customer)
      ? booking.provider
      : booking.customer;
    await notify(other, {
      title: 'Ombi la Huduma Limefutwa',
      message: `"${booking.title}" limefutwa. Sababu: ${booking.cancelReason || 'haijatajwa'}.`,
      link: '/services',
      metadata: { bookingId: booking._id },
    });

    res.json(booking);
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /bookings/:id/pay — customer pays the agreed amount by mobile money
router.post('/bookings/:id/pay', auth, auditRoute({
  action: 'pay_service_booking',
  category: 'payment',
  targetType: 'ServiceBooking',
}), async (req, res) => {
  try {
    const { booking, error } = await loadBooking(req.params.id, req.user, 'customer');
    if (error) return res.status(error.status).json({ message: error.message });
    if (!PAYABLE_STATUSES.includes(booking.status)) {
      return res.status(400).json({ message: 'Ombi hili haliwezi kulipwa sasa' });
    }
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Huduma hii imekwisha lipwa' });
    }
    if (isPaymentPending(booking)) {
      return res.status(409).json({
        message: 'Malipo yanasubiri uthibitisho; subiri dakika 10 kabla ya kujaribu tena',
        transactionId: booking.paymentTransactionId || '',
      });
    }
    if (booking.totalAmount <= 0) {
      return res.status(400).json({ message: 'Hakuna kiasi kilichokubaliwa kulipwa' });
    }

    const { provider, phone } = req.body;
    if (!provider || !phone) {
      return res.status(400).json({ message: 'Chagua mtoa huduma na namba ya simu' });
    }

    const result = await initiatePayment({
      provider,
      phone,
      amount: booking.totalAmount,
      reference: `SERVICE-BOOKING-${booking._id}`,
      customerName: req.user.name,
    });
    if (!result.success) {
      return res.status(400).json({ message: result.error || 'Malipo hayakuanza' });
    }

    booking.paymentStatus = 'processing';
    booking.paymentMethod = 'mm';
    booking.paymentProvider = provider;
    booking.paymentTransactionId = result.transactionId || '';
    booking.paymentAmount = booking.totalAmount;
    booking.paymentInitiatedAt = new Date();
    await booking.save();

    res.status(201).json({ ...result, amount: booking.totalAmount, bookingId: String(booking._id) });
  } catch (error) {
    console.error('Pay booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /bookings/:id/rate — customer rates a confirmed service (once)
router.post('/bookings/:id/rate', auth, auditRoute({
  action: 'rate_service_booking',
  category: 'booking',
  targetType: 'ServiceBooking',
}), async (req, res) => {
  try {
    const { booking, error } = await loadBooking(req.params.id, req.user, 'customer');
    if (error) return res.status(error.status).json({ message: error.message });
    if (booking.status !== 'confirmed') {
      return res.status(400).json({ message: 'Unaweza kutathmini huduma iliyothibitishwa tu' });
    }
    if (booking.customerRating > 0) {
      return res.status(409).json({ message: 'Umeshatathmini huduma hii' });
    }

    const rating = Math.round(Number(req.body.rating));
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Toa alama kati ya 1 na 5' });
    }

    const offer = await FarmServiceOffer.findById(booking.offer);
    if (offer) {
      const stats = nextRatingStats(offer, rating);
      offer.ratingSum = stats.ratingSum;
      offer.ratingCount = stats.ratingCount;
      await offer.save();
    }

    booking.customerRating = rating;
    await booking.save();

    await Rating.create({
      rater: req.user._id,
      raterName: req.user.name || '',
      ratedUser: booking.provider,
      ratedServiceBooking: booking._id,
      rating,
      comment: String(req.body.comment || '').slice(0, 500),
      type: 'customer_to_provider',
    });

    await notify(booking.provider, {
      title: 'Tathmini Mpya',
      message: `${booking.customerName} ametathmini "${booking.title}" kwa alama ${rating}/5.`,
      link: '/services',
      metadata: { bookingId: booking._id, rating },
    });

    res.status(201).json({ message: 'Asante kwa tathmini yako', rating });
  } catch (error) {
    console.error('Rate booking error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
