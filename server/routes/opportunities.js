const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Opportunity = require('../models/Opportunity');
const OpportunityApplication = require('../models/OpportunityApplication');
const Rating = require('../models/Rating');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const { STAFF_ROLES, requirePermission } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const { recalcUserRating } = require('../services/rating.service');
const cache = require('../services/cache.service');
const {
  buildListFilter,
  isExpired,
  ageFromDateOfBirth,
  canTransition,
  canApplicantTransition,
  canRateApplication,
  paymentError,
  nextOpportunityStatus,
  PAYMENT_METHODS,
} = require('../services/opportunity.service');

const LIST_PREFIX = 'opportunities:list:';
const PAGE_LIMIT = 30;

const listKey = (query) => {
  const signature = JSON.stringify({
    kind: query.kind || '',
    category: query.category || '',
    employmentType: query.employmentType || '',
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

const isOwnerOrStaff = (opportunity, user) => (
  String(opportunity.owner) === String(user._id) || STAFF_ROLES.includes(user.role)
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

// GET /api/v1/opportunities — public job and business feed
router.get('/', optionalAuth, async (req, res) => {
  try {
    const filter = buildListFilter(req.query);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || PAGE_LIMIT, 1), 50);

    const load = async () => {
      const [items, total] = await Promise.all([
        Opportunity.find(filter)
          .sort({ posterVerified: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Opportunity.countDocuments(filter),
      ]);
      return { items, total, page, pages: Math.ceil(total / limit) || 1 };
    };

    // Anonymous feeds are cached; a signed-in response carries per-user flags.
    const result = req.user ? await load() : await cache.remember(listKey(req.query), cache.TTL.LISTING, load);

    if (!req.user || !result.items.length) return res.json(result);

    const applied = await OpportunityApplication.find({
      applicant: req.user._id,
      opportunity: { $in: result.items.map((item) => item._id) },
    }).select('opportunity status').lean();
    const byOpportunity = new Map(applied.map((row) => [String(row.opportunity), row.status]));

    res.json({
      ...result,
      items: result.items.map((item) => ({
        ...item,
        applied: byOpportunity.get(String(item._id)) || '',
        isOwner: String(item.owner) === String(req.user._id),
      })),
    });
  } catch (error) {
    console.error('List opportunities error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/opportunities/my — postings created by the caller
router.get('/my', auth, async (req, res) => {
  try {
    const items = await Opportunity.find({ owner: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(items);
  } catch (error) {
    console.error('My opportunities error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/opportunities/applications/my — applications the caller sent
router.get('/applications/my', auth, async (req, res) => {
  try {
    const applications = await OpportunityApplication.find({ applicant: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    if (!applications.length) return res.json([]);

    const opportunities = await Opportunity.find({
      _id: { $in: applications.map((row) => row.opportunity) },
    }).select('title kind category status district payAmount payUnit ownerName').lean();
    const byId = new Map(opportunities.map((row) => [String(row._id), row]));

    res.json(applications.map((row) => ({
      ...row,
      opportunity: byId.get(String(row.opportunity)) || null,
    })));
  } catch (error) {
    console.error('My applications error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/opportunities — verified accounts post jobs or business needs
router.post('/', auth, auditRoute({
  action: 'create_opportunity',
  category: 'employment',
  targetType: 'Opportunity',
}), async (req, res) => {
  try {
    const user = req.user;
    const verified = user.phoneVerified || user.isVerified || STAFF_ROLES.includes(user.role);
    if (!verified) {
      return res.status(403).json({
        message: 'Thibitisha namba yako ya simu kabla ya kutangaza fursa',
      });
    }

    const body = req.body || {};
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    if (title.length < 6) {
      return res.status(400).json({ message: 'Kichwa cha fursa kifafanue kazi kwa ufasaha' });
    }
    if (description.length < 20) {
      return res.status(400).json({ message: 'Maelezo ya fursa yahitaji angalau herufi 20' });
    }
    const deadline = dateOrNull(body.deadline);
    if (deadline && isExpired(deadline)) {
      return res.status(400).json({ message: 'Tarehe ya mwisho imekwisha' });
    }

    const opportunity = await Opportunity.create({
      owner: user._id,
      ownerName: user.name || '',
      ownerRole: user.role || '',
      kind: body.kind === 'business' ? 'business' : 'job',
      category: body.category || 'other',
      title: title.slice(0, 160),
      description: description.slice(0, 3000),
      employmentType: body.employmentType || 'seasonal',
      district: String(body.district || user.district || 'Katavi'),
      ward: String(body.ward || user.ward || ''),
      village: String(body.village || user.village || ''),
      payAmount: numberOr(body.payAmount),
      payUnit: body.payUnit || 'task',
      positions: Math.min(Math.max(Number(body.positions) || 1, 1), 1000),
      requirements: String(body.requirements || '').slice(0, 1000),
      contactPhone: String(body.contactPhone || user.phone || '').slice(0, 20),
      startDate: dateOrNull(body.startDate),
      deadline,
      posterVerified: verified,
      posterVerifiedAt: verified ? new Date() : null,
    });

    await cache.delByPrefix(LIST_PREFIX);
    res.status(201).json(opportunity);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za fursa si sahihi' });
    }
    console.error('Create opportunity error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/opportunities/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Fursa haipatikani' });
    }
    const opportunity = await Opportunity.findById(req.params.id).lean();
    if (!opportunity) return res.status(404).json({ message: 'Fursa haipatikani' });

    const payload = { ...opportunity };
    if (req.user) {
      payload.isOwner = String(opportunity.owner) === String(req.user._id);
      const application = await OpportunityApplication.findOne({
        opportunity: opportunity._id,
        applicant: req.user._id,
      }).select('status createdAt').lean();
      payload.myApplication = application || null;
    }
    res.json(payload);
  } catch (error) {
    console.error('Opportunity detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/opportunities/:id — owner edits or opens/closes a posting
router.put('/:id', auth, auditRoute({
  action: 'update_opportunity',
  category: 'employment',
  targetType: 'Opportunity',
}), async (req, res) => {
  try {
    const opportunity = mongoose.isValidObjectId(req.params.id)
      ? await Opportunity.findById(req.params.id)
      : null;
    if (!opportunity) return res.status(404).json({ message: 'Fursa haipatikani' });
    if (!isOwnerOrStaff(opportunity, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kubadilisha fursa hii' });
    }

    const body = req.body || {};
    if (body.title !== undefined) opportunity.title = String(body.title).trim().slice(0, 160);
    if (body.description !== undefined) {
      opportunity.description = String(body.description).trim().slice(0, 3000);
    }
    if (body.category !== undefined) opportunity.category = body.category;
    if (body.employmentType !== undefined) opportunity.employmentType = body.employmentType;
    if (body.district !== undefined) opportunity.district = String(body.district);
    if (body.ward !== undefined) opportunity.ward = String(body.ward);
    if (body.village !== undefined) opportunity.village = String(body.village);
    if (body.payAmount !== undefined) opportunity.payAmount = numberOr(body.payAmount, opportunity.payAmount);
    if (body.payUnit !== undefined) opportunity.payUnit = body.payUnit;
    if (body.positions !== undefined) {
      opportunity.positions = Math.min(Math.max(Number(body.positions) || 1, 1), 1000);
    }
    if (body.requirements !== undefined) {
      opportunity.requirements = String(body.requirements).slice(0, 1000);
    }
    if (body.contactPhone !== undefined) {
      opportunity.contactPhone = String(body.contactPhone).slice(0, 20);
    }
    if (body.startDate !== undefined) opportunity.startDate = dateOrNull(body.startDate);
    if (body.deadline !== undefined) opportunity.deadline = dateOrNull(body.deadline);
    if (body.status !== undefined) {
      if (!['open', 'filled', 'closed'].includes(body.status)) {
        return res.status(400).json({ message: 'Hali ya fursa si sahihi' });
      }
      opportunity.status = body.status;
    }

    await opportunity.save();
    await cache.delByPrefix(LIST_PREFIX);
    res.json(opportunity);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za fursa si sahihi' });
    }
    console.error('Update opportunity error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/opportunities/:id — closes the posting, keeps applications
router.delete('/:id', auth, auditRoute({
  action: 'close_opportunity',
  category: 'employment',
  targetType: 'Opportunity',
}), async (req, res) => {
  try {
    const opportunity = mongoose.isValidObjectId(req.params.id)
      ? await Opportunity.findById(req.params.id)
      : null;
    if (!opportunity) return res.status(404).json({ message: 'Fursa haipatikani' });
    if (!isOwnerOrStaff(opportunity, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kufunga fursa hii' });
    }

    opportunity.status = 'closed';
    await opportunity.save();
    await cache.delByPrefix(LIST_PREFIX);
    res.json({ message: 'Fursa imefungwa' });
  } catch (error) {
    console.error('Close opportunity error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/opportunities/:id/apply
router.post('/:id/apply', auth, auditRoute({
  action: 'apply_opportunity',
  category: 'employment',
  targetType: 'Opportunity',
}), async (req, res) => {
  try {
    const opportunity = mongoose.isValidObjectId(req.params.id)
      ? await Opportunity.findById(req.params.id)
      : null;
    if (!opportunity) return res.status(404).json({ message: 'Fursa haipatikani' });
    if (String(opportunity.owner) === String(req.user._id)) {
      return res.status(400).json({ message: 'Hauwezi kuomba fursa yako mwenyewe' });
    }
    if (opportunity.status !== 'open') {
      return res.status(400).json({ message: 'Fursa hii haifunguliwa kwa maombi' });
    }
    if (isExpired(opportunity.deadline)) {
      return res.status(400).json({ message: 'Muda wa maombi umekwisha' });
    }

    const age = ageFromDateOfBirth(req.user.dateOfBirth);
    if (age !== null && age < (opportunity.minimumAge || 18)) {
      return res.status(403).json({
        message: `Fursa hii inahitaji umri wa miaka ${opportunity.minimumAge || 18} au zaidi`,
      });
    }

    const existing = await OpportunityApplication.findOne({
      opportunity: opportunity._id,
      applicant: req.user._id,
    });
    if (existing) {
      return res.status(409).json({ message: 'Tayari umetuma maombi kwa fursa hii' });
    }

    let application;
    try {
      application = await OpportunityApplication.create({
        opportunity: opportunity._id,
        applicant: req.user._id,
        applicantName: req.user.name || '',
        message: String(req.body.message || '').slice(0, 1000),
        experience: String(req.body.experience || '').slice(0, 500),
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Tayari umetuma maombi kwa fursa hii' });
      }
      throw error;
    }

    await Opportunity.updateOne({ _id: opportunity._id }, { $inc: { applicationsCount: 1 } });
    await notify(opportunity.owner, {
      title: 'Maombi Mapya ya Fursa',
      message: `${application.applicantName} ameomba "${opportunity.title}".`,
      link: '/opportunities',
      metadata: { opportunityId: opportunity._id, applicationId: application._id },
    });

    res.status(201).json(application);
  } catch (error) {
    console.error('Apply opportunity error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/opportunities/:id/applications — owner or staff review
router.get('/:id/applications', auth, async (req, res) => {
  try {
    const opportunity = mongoose.isValidObjectId(req.params.id)
      ? await Opportunity.findById(req.params.id).lean()
      : null;
    if (!opportunity) return res.status(404).json({ message: 'Fursa haipatikani' });
    if (!isOwnerOrStaff(opportunity, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kuona maombi haya' });
    }

    const applications = await OpportunityApplication.find({ opportunity: opportunity._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    if (!applications.length) return res.json([]);

    const applicants = await User.find({
      _id: { $in: applications.map((row) => row.applicant) },
    }).select('name phone district ward village phoneVerified isVerified trustScore').lean();
    const byId = new Map(applicants.map((row) => [String(row._id), row]));

    const ratings = await Rating.find({
      ratedApplication: { $in: applications.map((row) => row._id) },
    }).select('ratedApplication type rating comment rater raterName createdAt').lean();
    const ratingsByApplication = new Map();
    for (const rating of ratings) {
      const key = String(rating.ratedApplication);
      if (!ratingsByApplication.has(key)) ratingsByApplication.set(key, []);
      ratingsByApplication.get(key).push(rating);
    }

    res.json(applications.map((row) => {
      const profile = byId.get(String(row.applicant)) || {};
      return {
        ...row,
        applicantProfile: {
          name: profile.name || row.applicantName,
          phone: profile.phone || '',
          district: profile.district || '',
          ward: profile.ward || '',
          village: profile.village || '',
          phoneVerified: Boolean(profile.phoneVerified),
          isVerified: Boolean(profile.isVerified),
          trustScore: profile.trustScore || 0,
        },
        ratings: ratingsByApplication.get(String(row._id)) || [],
      };
    }));
  } catch (error) {
    console.error('Opportunity applications error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/opportunities/applications/:id — owner moves the application,
// applicant may only withdraw.
router.put('/applications/:id', auth, auditRoute({
  action: 'update_opportunity_application',
  category: 'employment',
  targetType: 'OpportunityApplication',
}), async (req, res) => {
  try {
    const application = mongoose.isValidObjectId(req.params.id)
      ? await OpportunityApplication.findById(req.params.id)
      : null;
    if (!application) return res.status(404).json({ message: 'Maombi hayapatikani' });

    const opportunity = await Opportunity.findById(application.opportunity);
    if (!opportunity) return res.status(404).json({ message: 'Fursa haipatikani' });

    const next = String(req.body.status || '');
    const isApplicant = String(application.applicant) === String(req.user._id);
    const isOwner = String(opportunity.owner) === String(req.user._id) || STAFF_ROLES.includes(req.user.role);
    if (!isApplicant && !isOwner) {
      return res.status(403).json({ message: 'Huna ruhusa kubadilisha maombi haya' });
    }
    if (isApplicant && !isOwner && !canApplicantTransition(application.status, next)) {
      return res.status(403).json({
        message: 'Mwombaji anaweza tu kuondoa maombi au kuwasilisha kukamilika kwa kazi',
      });
    }
    if (!canTransition(application.status, next)) {
      return res.status(400).json({
        message: `Maombi yenye hali "${application.status}" hayawezi kuwa "${next}"`,
      });
    }

    application.status = next;
    application.statusUpdatedAt = new Date();
    if (next === 'completion_requested') application.completionRequestedAt = new Date();
    if (next === 'completed') application.completedAt = new Date();
    await application.save();

    if (next === 'accepted') {
      opportunity.acceptedCount += 1;
      opportunity.status = nextOpportunityStatus({
        status: opportunity.status,
        positions: opportunity.positions,
        acceptedCount: opportunity.acceptedCount,
      });
      await opportunity.save();
    }

    if (next === 'completed') {
      opportunity.completedCount += 1;
      await opportunity.save();
    }

    if (next === 'completion_requested') {
      await notify(opportunity.owner, {
        title: 'Kazi Yawasilishwa Kukamilika',
        message: `${application.applicantName} amewasilisha kuwa kazi ya "${opportunity.title}" imekamilika. Thibitisha na rekodi malipo.`,
        link: '/opportunities',
        metadata: { opportunityId: opportunity._id, applicationId: application._id, status: next },
      });
    } else if (next !== 'withdrawn') {
      const labels = {
        shortlisted: 'umeorodheshwa kwa mahojiano',
        accepted: 'umekubaliwa',
        rejected: 'haukufanikiwa',
        completed: 'umekamilisha kazi',
      };
      await notify(application.applicant, {
        title: 'Hali ya Maombi Yako Imebadilika',
        message: `Maombi yako ya "${opportunity.title}": ${labels[next] || next}.`,
        link: '/opportunities',
        metadata: { opportunityId: opportunity._id, applicationId: application._id, status: next },
      });
    }

    res.json({
      application,
      opportunity: {
        status: opportunity.status,
        acceptedCount: opportunity.acceptedCount,
        completedCount: opportunity.completedCount,
      },
    });
  } catch (error) {
    console.error('Update opportunity application error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/opportunities/applications/:id/payment — employer settles the job
router.post('/applications/:id/payment', auth, auditRoute({
  action: 'record_job_payment',
  category: 'payment',
  targetType: 'OpportunityApplication',
}), async (req, res) => {
  try {
    const application = mongoose.isValidObjectId(req.params.id)
      ? await OpportunityApplication.findById(req.params.id)
      : null;
    if (!application) return res.status(404).json({ message: 'Maombi hayapatikani' });

    const opportunity = await Opportunity.findById(application.opportunity);
    if (!opportunity) return res.status(404).json({ message: 'Fursa haipatikani' });

    const isOwner = String(opportunity.owner) === String(req.user._id) || STAFF_ROLES.includes(req.user.role);
    if (!isOwner) {
      return res.status(403).json({ message: 'Mmiliki wa fursa pekee anaweza kurekodi malipo' });
    }
    if (application.status !== 'completed') {
      return res.status(400).json({ message: 'Thibitisha kukamilika kwa kazi kabla ya malipo' });
    }
    if (application.paymentStatus !== 'unpaid') {
      return res.status(409).json({ message: 'Malipo ya kazi hii yamerekodiwa' });
    }

    const body = req.body || {};
    const waived = Boolean(body.waived);
    const problem = paymentError({ waived, amount: body.amount, payAmount: opportunity.payAmount });
    if (problem) return res.status(400).json({ message: problem });

    const method = String(body.method || 'cash').toLowerCase();
    if (!waived && !PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ message: 'Njia ya malipo si sahihi' });
    }

    application.paymentStatus = waived ? 'waived' : 'paid';
    application.paidAmount = waived ? 0 : Math.round(Number(body.amount));
    application.paymentMethod = waived ? '' : method;
    application.paymentReference = String(body.reference || '').slice(0, 120);
    application.paidAt = new Date();
    await application.save();

    await notify(application.applicant, {
      title: 'Malipo ya Kazi',
      message: waived
        ? `Kazi ya "${opportunity.title}" imerekodiwa kama bila malipo.`
        : `Umerekodiwa malipo ya TZS ${application.paidAmount.toLocaleString('en-US')} kwa kazi ya "${opportunity.title}".`,
      link: '/opportunities',
      metadata: {
        opportunityId: opportunity._id,
        applicationId: application._id,
        paymentStatus: application.paymentStatus,
      },
    });

    res.json(application);
  } catch (error) {
    console.error('Record job payment error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/opportunities/applications/:id/rate — either side rates the other
router.post('/applications/:id/rate', auth, auditRoute({
  action: 'rate_job_application',
  category: 'employment',
  targetType: 'OpportunityApplication',
}), async (req, res) => {
  try {
    const application = mongoose.isValidObjectId(req.params.id)
      ? await OpportunityApplication.findById(req.params.id)
      : null;
    if (!application) return res.status(404).json({ message: 'Maombi hayapatikani' });

    const opportunity = await Opportunity.findById(application.opportunity);
    if (!opportunity) return res.status(404).json({ message: 'Fursa haipatikani' });

    const isWorker = String(application.applicant) === String(req.user._id);
    const isEmployer = String(opportunity.owner) === String(req.user._id);
    if (!isWorker && !isEmployer) {
      return res.status(403).json({ message: 'Huna ruhusa kukadiria kazi hii' });
    }
    if (!canRateApplication(application)) {
      return res.status(400).json({
        message: 'Unaweza kukadiria baada ya kazi kukamilika na malipo kurekodiwa',
      });
    }

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Ukadiriaji lazima uwe kati ya 1 na 5' });
    }
    const type = isEmployer ? 'employer_to_worker' : 'worker_to_employer';
    const ratedUser = isEmployer ? application.applicant : opportunity.owner;

    const existing = await Rating.findOne({
      rater: req.user._id,
      ratedApplication: application._id,
      type,
    });
    if (existing) return res.status(409).json({ message: 'Umeshakadiria kazi hii' });

    const created = await Rating.create({
      rater: req.user._id,
      raterName: req.user.name || '',
      ratedUser,
      ratedApplication: application._id,
      rating,
      comment: String(req.body.comment || '').slice(0, 500),
      type,
    });
    await recalcUserRating(ratedUser);

    await notify(ratedUser, {
      title: 'Ukadiriaji Mpya',
      message: `Umepokea ukadiriaji wa ${rating}/5 kwa kazi ya "${opportunity.title}".`,
      link: '/opportunities',
      metadata: { opportunityId: opportunity._id, applicationId: application._id, rating },
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Rate job application error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
