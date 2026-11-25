const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const InsuranceProduct = require('../models/InsuranceProduct');
const InsuranceApplication = require('../models/InsuranceApplication');
const { auth } = require('../middleware/auth');
const { requireRole, STAFF_ROLES } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const cache = require('../services/cache.service');
const {
  ACTIVE_STATUSES,
  canTransitionApplication,
  estimatePremium,
  referralFeeFor,
  makePolicyNumber,
} = require('../services/insurance.service');

const LIST_PREFIX = 'insurance:products:';
const REVIEW_ROLES = ['admin', 'finance_officer', 'support'];

const listKey = (query) => {
  const signature = JSON.stringify({
    productType: query.productType || '',
    district: query.district || '',
    page: query.page || '',
  });
  const digest = crypto.createHash('md5').update(signature).digest('hex');
  return `${LIST_PREFIX}${digest}`;
};

const money = (amount) => `TZS ${Number(amount || 0).toLocaleString('en-US')}`;

const notify = async (userId, payload) => {
  if (!userId) return;
  try {
    await sendNotification(userId, { type: 'system', ...payload });
  } catch (e) { /* best effort */ }
};

const numberOr = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

// GET /api/v1/insurance/products — active partner products.
router.get('/products', async (req, res) => {
  try {
    const filter = { status: 'active' };
    if (req.query.productType) filter.productType = String(req.query.productType);
    if (req.query.district) filter.districts = String(req.query.district);

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);

    const load = async () => {
      const [items, total] = await Promise.all([
        InsuranceProduct.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        InsuranceProduct.countDocuments(filter),
      ]);
      return { items, total, page, pages: Math.ceil(total / limit) || 1 };
    };

    const result = await cache.remember(listKey(req.query), cache.TTL.LISTING, load);
    res.json(result);
  } catch (error) {
    console.error('List insurance products error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/insurance/products/:id
router.get('/products/:id', async (req, res) => {
  try {
    const product = mongoose.isValidObjectId(req.params.id)
      ? await InsuranceProduct.findById(req.params.id).lean()
      : null;
    if (!product || product.status !== 'active') {
      return res.status(404).json({ message: 'Bima haipatikani' });
    }
    res.json(product);
  } catch (error) {
    console.error('Insurance product detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

const productFields = (body = {}) => {
  const data = {};
  if (body.partner !== undefined) data.partner = String(body.partner).trim().slice(0, 160);
  if (body.contactPhone !== undefined) data.contactPhone = String(body.contactPhone).trim().slice(0, 30);
  if (body.contactEmail !== undefined) data.contactEmail = String(body.contactEmail).trim().slice(0, 120);
  if (body.productType !== undefined) data.productType = body.productType;
  if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 160);
  if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 2000);
  if (body.coverageSummary !== undefined) data.coverageSummary = String(body.coverageSummary).slice(0, 1000);
  if (body.premiumRate !== undefined) data.premiumRate = numberOr(body.premiumRate);
  if (body.minSumInsured !== undefined) data.minSumInsured = numberOr(body.minSumInsured);
  if (body.maxSumInsured !== undefined) data.maxSumInsured = numberOr(body.maxSumInsured);
  if (body.referralRate !== undefined) data.referralRate = numberOr(body.referralRate);
  if (body.districts !== undefined) {
    data.districts = (Array.isArray(body.districts) ? body.districts : [])
      .map((district) => String(district).trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 30);
  }
  if (body.status !== undefined && ['active', 'paused'].includes(body.status)) {
    data.status = body.status;
  }
  return data;
};

const validateProduct = (fields) => {
  if (!fields.partner && !fields.title) return 'Taarifa za bima hazijakamilika';
  if (!fields.title || fields.title.length < 6) return 'Jina la bima lifafanue huduma';
  if (!fields.description || fields.description.length < 30) {
    return 'Maelezo yahitaji angalau herufi 30';
  }
  if (!(fields.premiumRate >= 0) || fields.premiumRate > 100) {
    return 'Kiwango cha malipo (asilimia) si sahihi';
  }
  if (fields.maxSumInsured > 0 && fields.maxSumInsured < fields.minSumInsured) {
    return 'Kiwango cha juu cha bima hakiwezi kuwa chini ya kiwango cha chini';
  }
  return null;
};

// POST /api/v1/insurance/products — admin registers a partner product.
router.post('/products', requireRole('admin'), auditRoute({
  action: 'create_insurance_product',
  category: 'insurance',
  targetType: 'InsuranceProduct',
}), async (req, res) => {
  try {
    const fields = productFields(req.body);
    const invalid = validateProduct({
      ...fields,
      minSumInsured: fields.minSumInsured || 0,
      maxSumInsured: fields.maxSumInsured || 0,
    });
    if (invalid) return res.status(400).json({ message: invalid });

    const product = await InsuranceProduct.create(fields);
    await cache.delByPrefix(LIST_PREFIX);
    res.status(201).json(product);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za bima si sahihi' });
    }
    console.error('Create insurance product error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/insurance/products/:id — admin.
router.put('/products/:id', requireRole('admin'), auditRoute({
  action: 'update_insurance_product',
  category: 'insurance',
  targetType: 'InsuranceProduct',
}), async (req, res) => {
  try {
    const product = mongoose.isValidObjectId(req.params.id)
      ? await InsuranceProduct.findById(req.params.id)
      : null;
    if (!product) return res.status(404).json({ message: 'Bima haipatikani' });

    Object.assign(product, productFields(req.body));
    const invalid = validateProduct(product);
    if (invalid) return res.status(400).json({ message: invalid });

    await product.save();
    await cache.delByPrefix(LIST_PREFIX);
    res.json(product);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za bima si sahihi' });
    }
    console.error('Update insurance product error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/insurance/products/:id — pause instead of deleting history.
router.delete('/products/:id', requireRole('admin'), auditRoute({
  action: 'pause_insurance_product',
  category: 'insurance',
  targetType: 'InsuranceProduct',
}), async (req, res) => {
  try {
    const product = mongoose.isValidObjectId(req.params.id)
      ? await InsuranceProduct.findById(req.params.id)
      : null;
    if (!product) return res.status(404).json({ message: 'Bima haipatikani' });

    product.status = 'paused';
    await product.save();
    await cache.delByPrefix(LIST_PREFIX);
    res.json({ message: 'Bima imesimamishwa kwa muda', product });
  } catch (error) {
    console.error('Pause insurance product error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/insurance/applications — farmer requests cover.
router.post('/applications', requireRole('farmer', 'admin'), auditRoute({
  action: 'apply_insurance',
  category: 'insurance',
  targetType: 'InsuranceApplication',
}), async (req, res) => {
  try {
    const product = mongoose.isValidObjectId(req.body.productId)
      ? await InsuranceProduct.findById(req.body.productId)
      : null;
    if (!product || product.status !== 'active') {
      return res.status(404).json({ message: 'Bima haipatikani' });
    }

    const restricted = Array.isArray(product.districts) && product.districts.length > 0;
    if (restricted && req.user.district
      && !product.districts.some((district) => (
        String(district).toLowerCase() === String(req.user.district).toLowerCase()
      ))) {
      return res.status(400).json({ message: 'Bima hii haipatikani wilayani kwako' });
    }

    const sumInsured = numberOr(req.body.sumInsured);
    const premium = estimatePremium(product, sumInsured);
    if (premium === null) {
      const min = product.minSumInsured || 0;
      const max = product.maxSumInsured || 0;
      return res.status(400).json({
        message: max > 0
          ? `Kiasi cha bima kiwe kati ya ${money(min)} na ${money(max)}`
          : `Kiasi cha bima kiwe angalau ${money(min)}`,
      });
    }

    const existing = await InsuranceApplication.findOne({
      user: req.user._id,
      product: product._id,
      status: { $in: ACTIVE_STATUSES },
    }).lean();
    if (existing) {
      return res.status(409).json({
        message: 'Una ombi la bima linaloendelea kwa bidhaa hii',
        applicationId: existing._id,
      });
    }

    const application = await InsuranceApplication.create({
      user: req.user._id,
      userName: req.user.name || '',
      product: product._id,
      productTitle: product.title,
      partner: product.partner,
      farm: mongoose.isValidObjectId(req.body.farmId) ? req.body.farmId : null,
      sumInsured,
      estimatedPremium: premium,
      notes: String(req.body.notes || '').slice(0, 1000),
    });

    res.status(201).json(application);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za ombi si sahihi' });
    }
    console.error('Apply insurance error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/insurance/applications/my
router.get('/applications/my', auth, async (req, res) => {
  try {
    const applications = await InsuranceApplication.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(applications);
  } catch (error) {
    console.error('My insurance applications error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/insurance/applications — staff review queue.
router.get('/applications', requireRole(...REVIEW_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.partner) filter.partner = String(req.query.partner);
    if (req.query.productId && mongoose.isValidObjectId(req.query.productId)) {
      filter.product = req.query.productId;
    }
    const applications = await InsuranceApplication.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(applications);
  } catch (error) {
    console.error('List insurance applications error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/insurance/applications/:id — owner or staff.
router.get('/applications/:id', auth, async (req, res) => {
  try {
    const application = mongoose.isValidObjectId(req.params.id)
      ? await InsuranceApplication.findById(req.params.id).lean()
      : null;
    if (!application) return res.status(404).json({ message: 'Ombi halipatikani' });

    const privileged = STAFF_ROLES.includes(req.user.role);
    if (!privileged && String(application.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa kuona ombi hili' });
    }

    const product = await InsuranceProduct.findById(application.product).lean();
    res.json({ ...application, product });
  } catch (error) {
    console.error('Insurance application detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/insurance/applications/:id/status — staff move the referral on.
router.post('/applications/:id/status', requireRole(...REVIEW_ROLES), auditRoute({
  action: 'update_insurance_application',
  category: 'insurance',
  targetType: 'InsuranceApplication',
  details: (req) => ({ status: String(req.body?.status || '') }),
}), async (req, res) => {
  try {
    const application = mongoose.isValidObjectId(req.params.id)
      ? await InsuranceApplication.findById(req.params.id)
      : null;
    if (!application) return res.status(404).json({ message: 'Ombi halipatikani' });

    const status = String(req.body.status || '');
    if (!canTransitionApplication(application.status, status)) {
      return res.status(400).json({
        message: `Ombi hili haliwezi kubadilishwa kutoka "${application.status}" kwenda "${status}"`,
      });
    }

    application.status = status;
    if (status === 'under_review') {
      application.partnerReference = String(req.body.partnerReference || application.partnerReference || '')
        .slice(0, 120);
    }
    if (status === 'quoted') {
      const quoted = Number(req.body.quotedPremium);
      application.quotedPremium = Number.isFinite(quoted) && quoted > 0
        ? quoted
        : application.estimatedPremium;
      application.partnerReference = String(req.body.partnerReference || application.partnerReference || '')
        .slice(0, 120);
    }
    if (status === 'active') {
      if (!(application.quotedPremium > 0)) {
        application.quotedPremium = application.estimatedPremium;
      }
      const product = await InsuranceProduct.findById(application.product).lean();
      application.referralFee = referralFeeFor(product, application.quotedPremium);
      application.activatedAt = new Date();
      const supplied = String(req.body.policyNumber || '').trim().slice(0, 60);
      if (supplied) application.policyNumber = supplied;
    }
    if (status === 'rejected') {
      application.rejectionReason = String(req.body.reason || '').slice(0, 300);
      if (!application.rejectionReason) {
        return res.status(400).json({ message: 'Toa sababu ya kukataa ombi' });
      }
      application.closedAt = new Date();
    }
    if (status === 'expired') application.closedAt = new Date();

    if (status === 'active' && !application.policyNumber) {
      let saved = false;
      for (let attempt = 0; attempt < 5 && !saved; attempt += 1) {
        application.policyNumber = makePolicyNumber();
        try {
          await application.save();
          saved = true;
        } catch (error) {
          if (error.code !== 11000) throw error;
          application.policyNumber = undefined;
        }
      }
      if (!saved) {
        return res.status(500).json({ message: 'Imeshindikana kutoa namba ya bima' });
      }
    } else {
      try {
        await application.save();
      } catch (error) {
        if (error.code === 11000) {
          return res.status(409).json({ message: 'Namba ya bima imetumika tayari' });
        }
        throw error;
      }
    }

    await notify(application.user, {
      title: 'Taarifa ya Bima',
      message: `Ombi lako la "${application.productTitle}" sasa ni: ${status}.`,
      link: '/insurance',
      metadata: { applicationId: application._id, status },
    });

    res.json(application);
  } catch (error) {
    console.error('Update insurance application error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/insurance/applications/:id/cancel — owner withdraws.
router.post('/applications/:id/cancel', auth, auditRoute({
  action: 'cancel_insurance_application',
  category: 'insurance',
  targetType: 'InsuranceApplication',
}), async (req, res) => {
  try {
    const application = mongoose.isValidObjectId(req.params.id)
      ? await InsuranceApplication.findById(req.params.id)
      : null;
    if (!application) return res.status(404).json({ message: 'Ombi halipatikani' });
    if (String(application.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa kwa ombi hili' });
    }
    if (!canTransitionApplication(application.status, 'cancelled')) {
      return res.status(400).json({ message: 'Ombi hili haliwezi kufutwa sasa' });
    }

    application.status = 'cancelled';
    application.cancelReason = String(req.body.reason || '').slice(0, 300);
    application.closedAt = new Date();
    await application.save();

    res.json(application);
  } catch (error) {
    console.error('Cancel insurance application error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
