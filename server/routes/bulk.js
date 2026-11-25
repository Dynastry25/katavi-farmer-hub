const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { BulkRequest, BulkCommitment } = require('../models/BulkRequest');
const { auth } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const cache = require('../services/cache.service');
const {
  round2,
  remainingQuantity,
  progressPct,
  effectiveBulkStatus,
  commitBlocker,
} = require('../services/bulk.service');

const escapeRegex = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const bulkView = (request, now = new Date()) => ({
  ...request,
  status: effectiveBulkStatus(request, now),
  remainingKg: remainingQuantity(request),
  progressPct: progressPct(request),
});

// Rewrites the denormalised totals from the live commitments and flips the
// request between open and fulfilled as the total crosses the target.
const recalcTotals = async (request) => {
  const [row] = await BulkCommitment.aggregate([
    { $match: { request: request._id, status: 'committed' } },
    { $group: { _id: null, kg: { $sum: '$quantityKg' }, count: { $sum: 1 } } },
  ]);
  request.committedKg = round2(row?.kg);
  request.commitmentCount = row?.count || 0;
  const target = Number(request.quantityKg) || 0;

  if (request.committedKg >= target && request.status === 'open') {
    request.status = 'fulfilled';
    request.fulfilledAt = new Date();
  } else if (request.status === 'fulfilled' && request.committedKg < target) {
    request.status = effectiveBulkStatus({ ...request.toObject(), status: 'open' });
    request.fulfilledAt = null;
  }
  await request.save();
  return request;
};

// GET /api/v1/bulk — public board of open (or filtered) requests.
router.get('/', async (req, res) => {
  try {
    const now = new Date();
    const status = ['open', 'fulfilled', 'closed', 'expired', 'cancelled'].includes(req.query.status)
      ? req.query.status
      : 'open';
    const district = String(req.query.district || '').trim();
    const crop = String(req.query.crop || '').trim();

    const query = status === 'open'
      ? { status: 'open', deadline: { $gt: now } }
      : status === 'expired'
        ? { status: 'open', deadline: { $lte: now } }
        : { status };
    if (district) query.district = district;
    if (crop) query.cropName = new RegExp(escapeRegex(crop), 'i');

    const key = `bulk:list:${status}:${district.toLowerCase()}:${crop.toLowerCase()}`;
    const requests = await cache.remember(key, cache.TTL.LISTING, () => BulkRequest.find(query)
      .sort({ deadline: 1, createdAt: -1 })
      .limit(60)
      .lean());

    res.json({ requests: requests.map((request) => bulkView(request, now)) });
  } catch (error) {
    console.error('List bulk requests error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/bulk/my — caller's requests (buyer) and commitments (farmer).
router.get('/my', auth, async (req, res) => {
  try {
    const [requests, commitments] = await Promise.all([
      BulkRequest.find({ buyer: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
      BulkCommitment.find({ farmer: req.user._id, status: 'committed' })
        .populate('request', 'cropName district quantityKg committedKg pricePerKg deadline status buyerName')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);
    const now = new Date();
    res.json({
      requests: requests.map((request) => bulkView(request, now)),
      commitments,
    });
  } catch (error) {
    console.error('My bulk activity error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/bulk/:id — request detail with committed farmers.
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Ombi halipo' });
    }
    const request = await BulkRequest.findById(req.params.id).lean();
    if (!request) return res.status(404).json({ message: 'Ombi halipo' });

    const commitments = await BulkCommitment.find({ request: request._id, status: 'committed' })
      .select('farmerName quantityKg pricePerKg note crop createdAt')
      .sort({ createdAt: 1 })
      .lean();

    res.json({ request: bulkView(request), commitments });
  } catch (error) {
    console.error('Bulk request detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/bulk — buyers publish a bulk demand.
router.post('/', requireRole('buyer', 'admin'), auditRoute({
  action: 'create_bulk_request',
  category: 'order',
  targetType: 'BulkRequest',
  details: (req) => ({
    cropName: String(req.body?.cropName || ''),
    quantityKg: Number(req.body?.quantityKg) || 0,
  }),
}), async (req, res) => {
  try {
    const cropName = String(req.body.cropName || '').trim();
    const district = String(req.body.district || '').trim();
    const quantityKg = Number(req.body.quantityKg);
    const pricePerKg = Number(req.body.pricePerKg);
    const deadline = new Date(req.body.deadline || '');

    if (cropName.length < 2) return res.status(400).json({ message: 'Taja zao unalohitaji' });
    if (!district) return res.status(400).json({ message: 'Taja wilaya ya ukusanyaji' });
    if (!Number.isFinite(quantityKg) || quantityKg <= 0) {
      return res.status(400).json({ message: 'Weka kiasi cha kilo unachohitaji' });
    }
    if (!Number.isFinite(pricePerKg) || pricePerKg < 0) {
      return res.status(400).json({ message: 'Bei kwa kilo si sahihi' });
    }
    if (Number.isNaN(deadline.getTime()) || deadline.getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Weka tarehe ya mwisho iliyo mbeleni' });
    }

    const request = await BulkRequest.create({
      buyer: req.user._id,
      buyerName: req.user.name,
      cropName,
      category: String(req.body.category || '').trim(),
      district,
      quantityKg: round2(quantityKg),
      pricePerKg: round2(pricePerKg),
      deadline,
      contact: String(req.body.contact || '').trim(),
      notes: String(req.body.notes || '').trim(),
    });
    await cache.delByPrefix('bulk:list:');
    res.status(201).json({ request: bulkView(request.toObject()) });
  } catch (error) {
    console.error('Create bulk request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/bulk/:id/commit — farmers pledge part of the target quantity.
router.post('/:id/commit', requireRole('farmer', 'admin'), auditRoute({
  action: 'commit_bulk_request',
  category: 'order',
  targetType: 'BulkRequest',
  details: (req) => ({ quantityKg: Number(req.body?.quantityKg) || 0 }),
}), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Ombi halipo' });
    }
    const request = await BulkRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Ombi halipo' });

    const quantityKg = Number(req.body.quantityKg);
    const blocker = commitBlocker(request, quantityKg);
    if (blocker) return res.status(400).json({ message: blocker });

    const existing = await BulkCommitment.findOne({ request: request._id, farmer: req.user._id });
    if (existing?.status === 'committed') {
      return res.status(409).json({ message: 'Umeshaahidi kwa ombi hili; unaweza kuondoa ahadi kwanza' });
    }

    const commitment = existing || new BulkCommitment({ request: request._id, farmer: req.user._id });
    commitment.farmerName = req.user.name || '';
    commitment.crop = mongoose.isValidObjectId(req.body.crop) ? req.body.crop : null;
    commitment.quantityKg = round2(quantityKg);
    commitment.pricePerKg = request.pricePerKg;
    commitment.note = String(req.body.note || '').trim();
    commitment.status = 'committed';
    commitment.withdrawnAt = null;
    await commitment.save();

    await recalcTotals(request);
    await cache.delByPrefix('bulk:list:');

    if (request.status === 'fulfilled' && request.buyer) {
      await sendNotification(request.buyer, {
        title: 'Ombi la ununuzi limekamilika',
        message: `${request.cropName}: kilo ${request.committedKg} zimeahidiwa na wakulima ${request.commitmentCount}.`,
        type: 'order',
        link: '/bulk',
        metadata: { requestId: String(request._id) },
      });
    }

    res.status(201).json({
      message: 'Ahadi yako imerekodiwa',
      request: bulkView(request.toObject()),
      commitment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Umeshaahidi kwa ombi hili' });
    }
    console.error('Commit bulk request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/bulk/:id/commitments/:commitmentId/withdraw — farmer backs out.
router.post('/:id/commitments/:commitmentId/withdraw', auth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.commitmentId)) {
      return res.status(404).json({ message: 'Ahadi haipatikani' });
    }
    const request = await BulkRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Ombi halipo' });

    const commitment = await BulkCommitment.findOne({
      _id: req.params.commitmentId,
      request: request._id,
    });
    if (!commitment) return res.status(404).json({ message: 'Ahadi haipatikani' });
    if (req.user.role !== 'admin' && String(commitment.farmer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kuondoa ahadi hii' });
    }
    if (commitment.status === 'withdrawn') {
      return res.json({ message: 'Ahadi iliondolewa', request: bulkView(request.toObject()) });
    }

    commitment.status = 'withdrawn';
    commitment.withdrawnAt = new Date();
    await commitment.save();

    await recalcTotals(request);
    await cache.delByPrefix('bulk:list:');

    res.json({ message: 'Ahadi imeondolewa', request: bulkView(request.toObject()) });
  } catch (error) {
    console.error('Withdraw bulk commitment error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/bulk/:id/close — buyer (or admin) stops collecting commitments.
router.post('/:id/close', auth, auditRoute({
  action: 'close_bulk_request',
  category: 'order',
  targetType: 'BulkRequest',
}), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Ombi halipo' });
    }
    const request = await BulkRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Ombi halipo' });
    if (req.user.role !== 'admin' && String(request.buyer) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa ya kufunga ombi hili' });
    }
    const status = effectiveBulkStatus(request);
    if (!['open', 'fulfilled'].includes(status)) {
      return res.status(400).json({ message: 'Ombi hili tayari limefungwa' });
    }

    const cancel = req.body.cancel === true;
    request.status = cancel ? 'cancelled' : 'closed';
    request.closedAt = new Date();
    request.cancelReason = cancel ? String(req.body.reason || '').trim().slice(0, 300) : '';
    await request.save();
    await cache.delByPrefix('bulk:list:');

    const farmers = await BulkCommitment.find({ request: request._id, status: 'committed' })
      .select('farmer')
      .lean();
    await Promise.all(farmers.map((row) => sendNotification(row.farmer, {
      title: cancel ? 'Ombi la ununuzi limeghairiwa' : 'Ombi la ununuzi limefungwa',
      message: `${request.cropName} (${request.district}): kilo ${request.committedKg} zilizokuwa zimeahidiwa.`,
      type: 'order',
      link: '/bulk',
      metadata: { requestId: String(request._id) },
    })));

    res.json({ message: cancel ? 'Ombi limeghairiwa' : 'Ombi limefungwa', request: bulkView(request.toObject()) });
  } catch (error) {
    console.error('Close bulk request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
