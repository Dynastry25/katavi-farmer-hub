const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const AgentProfile = require('../models/AgentProfile');
const AgentCommission = require('../models/AgentCommission');
const Crop = require('../models/Crop');
const Order = require('../models/Order');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { requireRole, STAFF_ROLES } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const cache = require('../services/cache.service');
const {
  COMMISSION_RATES,
  canTransitionCommission,
  commissionAmount,
  makeAgentCode,
  buildReference,
  commissionSummary,
} = require('../services/agent.service');

const DIRECTORY_KEY = 'agents:directory';
const FINANCE_ROLES = ['admin', 'finance_officer'];
const REVIEW_ROLES = ['admin', 'finance_officer', 'support'];

const money = (amount) => `TZS ${Number(amount || 0).toLocaleString('en-US')}`;

const notify = async (userId, payload) => {
  if (!userId) return;
  try {
    await sendNotification(userId, { type: 'system', ...payload });
  } catch (e) { /* best effort */ }
};

const profileFields = (body = {}) => {
  const data = {};
  if (body.district !== undefined) data.district = String(body.district).trim().slice(0, 80);
  if (body.ward !== undefined) data.ward = String(body.ward).trim().slice(0, 80);
  if (body.villages !== undefined) data.villages = String(body.villages).trim().slice(0, 300);
  return data;
};

// GET /api/v1/agents/rates — the public commission card.
router.get('/rates', (req, res) => {
  res.json({
    rates: Object.entries(COMMISSION_RATES).map(([eventType, amount]) => ({ eventType, amount })),
  });
});

// GET /api/v1/agents — public directory of active agents for farmer support.
router.get('/', async (req, res) => {
  try {
    const agents = await cache.remember(DIRECTORY_KEY, cache.TTL.REFERENCE, () =>
      AgentProfile.find({ status: 'active' })
        .select('code name district ward villages createdAt')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean());
    res.json(agents);
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/agents/profile — the caller's own agent profile.
router.get('/profile', auth, async (req, res) => {
  try {
    const profile = await AgentProfile.findOne({ user: req.user._id }).lean();
    if (!profile) return res.status(404).json({ message: 'Hujasajiliwa kama wakala bado' });

    const commissions = await AgentCommission.find({ agent: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();
    const all = await AgentCommission.find({ agent: req.user._id })
      .select('status amount')
      .lean();
    res.json({ profile, summary: commissionSummary(all), recent: commissions });
  } catch (error) {
    console.error('Get agent profile error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/agents/register — join the agent network.
router.post('/register', auth, auditRoute({
  action: 'register_agent',
  category: 'employment',
  targetType: 'AgentProfile',
}), async (req, res) => {
  try {
    if (STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Watumishi hawasajiliwi kama mawakala' });
    }
    if (!req.user.phoneVerified && !req.user.isVerified) {
      return res.status(403).json({
        message: 'Thibitisha namba yako ya simu kabla ya kuwa wakala',
      });
    }

    const existing = await AgentProfile.findOne({ user: req.user._id }).lean();
    if (existing) {
      return res.status(409).json({ message: 'Tayari umesajiliwa kama wakala', code: existing.code });
    }

    const fields = profileFields(req.body);
    let profile = null;
    for (let attempt = 0; attempt < 5 && !profile; attempt += 1) {
      try {
        profile = await AgentProfile.create({
          user: req.user._id,
          name: req.user.name || '',
          code: makeAgentCode(),
          district: fields.district || req.user.district || '',
          ward: fields.ward || req.user.ward || '',
          villages: fields.villages || '',
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    if (!profile) {
      return res.status(500).json({ message: 'Imeshindikana kutoa namba ya wakala; jaribu tena' });
    }

    await cache.del(DIRECTORY_KEY);
    res.status(201).json(profile);
  } catch (error) {
    console.error('Register agent error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/agents/profile — update the coverage area.
router.put('/profile', auth, async (req, res) => {
  try {
    const profile = await AgentProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: 'Hujasajiliwa kama wakala bado' });

    Object.assign(profile, profileFields(req.body));
    await profile.save();
    await cache.del(DIRECTORY_KEY);
    res.json(profile);
  } catch (error) {
    console.error('Update agent profile error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/agents/commissions/my — the caller's commission history.
router.get('/commissions/my', auth, async (req, res) => {
  try {
    const commissions = await AgentCommission.find({ agent: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(commissions);
  } catch (error) {
    console.error('My commissions error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/agents/commissions/summary — totals by status for the caller.
router.get('/commissions/summary', auth, async (req, res) => {
  try {
    const rows = await AgentCommission.find({ agent: req.user._id })
      .select('status amount')
      .lean();
    res.json(commissionSummary(rows));
  } catch (error) {
    console.error('Commission summary error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/agents/registry — staff view of agents and their earnings.
router.get('/registry', requireRole(...REVIEW_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.district) filter.district = String(req.query.district);
    const profiles = await AgentProfile.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    res.json(profiles);
  } catch (error) {
    console.error('Agent registry error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/agents/registry/:id/status — admin suspends or reinstates an agent.
router.put('/registry/:id/status', requireRole('admin'), auditRoute({
  action: 'update_agent_status',
  category: 'employment',
  targetType: 'AgentProfile',
}), async (req, res) => {
  try {
    const status = String(req.body.status || '');
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Hali ya wakala si sahihi' });
    }
    const profile = mongoose.isValidObjectId(req.params.id)
      ? await AgentProfile.findById(req.params.id)
      : null;
    if (!profile) return res.status(404).json({ message: 'Wakala hayupo' });

    profile.status = status;
    await profile.save();
    await cache.del(DIRECTORY_KEY);

    await notify(profile.user, {
      title: status === 'active' ? 'Akaunti ya Wakala Imefunguliwa' : 'Akaunti ya Wakala Imesimamishwa',
      message: status === 'active'
        ? 'Unaweza tena kupokea kamisheni.'
        : 'Kamisheni mpya hazitaidhinishwa hadi akaunti ifunguliwe.',
      link: '/agents',
    });

    res.json(profile);
  } catch (error) {
    console.error('Update agent status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/agents/commissions — staff list with filters.
router.get('/commissions', requireRole(...REVIEW_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.eventType) filter.eventType = String(req.query.eventType);
    if (req.query.agentCode) filter.agentCode = String(req.query.agentCode).toUpperCase();
    const commissions = await AgentCommission.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(commissions);
  } catch (error) {
    console.error('List commissions error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// Checks that the activity behind a commission really happened and belongs to
// this agent. Approval is the fraud gate: fake farmers, listings and orders
// stop here instead of being paid.
const verifyCommissionEvent = async (commission) => {
  const meta = commission.metadata || {};

  if (commission.eventType === 'farmer_registration') {
    const farmer = mongoose.isValidObjectId(meta.farmerId)
      ? await User.findById(meta.farmerId).select('isVerified referredBy').lean()
      : null;
    if (!farmer) return { ok: false, message: 'Mkulima aliyesajiliwa hapatikani' };
    if (farmer.referredBy && String(farmer.referredBy) !== String(commission.agent)) {
      return { ok: false, message: 'Mkulima hakuletwa na wakala huyu' };
    }
    if (!farmer.isVerified) {
      return { ok: false, message: 'Mkulima hajathibitishwa bado; kamisheni haitaidhinishwa' };
    }
    return { ok: true };
  }

  if (commission.eventType === 'crop_listing') {
    const crop = mongoose.isValidObjectId(meta.cropId)
      ? await Crop.findById(meta.cropId).select('farmer').lean()
      : null;
    if (!crop) return { ok: false, message: 'Tangazo la zao halipatikani' };
    const farmer = crop.farmer
      ? await User.findById(crop.farmer).select('referredBy').lean()
      : null;
    if (!farmer || String(farmer.referredBy) !== String(commission.agent)) {
      return { ok: false, message: 'Tangazo hili si la mkulima wa wakala huyu' };
    }
    return { ok: true };
  }

  if (commission.eventType === 'completed_order') {
    const order = mongoose.isValidObjectId(meta.orderId)
      ? await Order.findById(meta.orderId).select('farmer status').lean()
      : null;
    if (!order) return { ok: false, message: 'Oda haipatikani' };
    if (!['completed', 'delivered'].includes(order.status)) {
      return { ok: false, message: 'Oda haijakamilika bado' };
    }
    const farmer = order.farmer
      ? await User.findById(order.farmer).select('referredBy').lean()
      : null;
    if (!farmer || String(farmer.referredBy) !== String(commission.agent)) {
      return { ok: false, message: 'Oda hii si ya mkulima wa wakala huyu' };
    }
    return { ok: true };
  }

  return { ok: true };
};

// POST /api/v1/agents/commissions — staff record a commission event manually.
router.post('/commissions', requireRole(...REVIEW_ROLES), auditRoute({
  action: 'create_agent_commission',
  category: 'employment',
  targetType: 'AgentCommission',
}), async (req, res) => {
  try {
    const agentCode = String(req.body.agentCode || '').trim().toUpperCase();
    const eventType = String(req.body.eventType || '');
    if (!agentCode || !COMMISSION_RATES[eventType]) {
      return res.status(400).json({ message: 'Chagua wakala na aina ya tukio' });
    }

    const profile = await AgentProfile.findOne({ code: agentCode }).lean();
    if (!profile) return res.status(404).json({ message: 'Wakala hayupo' });
    if (profile.status !== 'active') {
      return res.status(400).json({ message: 'Wakala amesimamishwa; kamisheni haiwezi kuundwa' });
    }

    const metadata = req.body.metadata && typeof req.body.metadata === 'object'
      ? req.body.metadata
      : {};
    const reference = buildReference(eventType, metadata);
    const amount = commissionAmount(eventType);

    let commission = null;
    try {
      commission = await AgentCommission.create({
        agent: profile.user,
        agentCode: profile.code,
        agentName: profile.name,
        eventType,
        reference,
        amount,
        metadata,
        notes: String(req.body.notes || '').slice(0, 500),
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Kamisheni ya tukio hili tayari imerekodiwa' });
      }
      throw error;
    }

    await notify(profile.user, {
      title: 'Kamisheni Mpya',
      message: `Kamisheni ya ${money(amount)} imerekodiwa na inasubiri uthibitisho.`,
      link: '/agents',
      metadata: { commissionId: commission._id, eventType },
    });

    res.status(201).json(commission);
  } catch (error) {
    console.error('Create commission error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

const loadCommission = async (id, user) => {
  const commission = mongoose.isValidObjectId(id)
    ? await AgentCommission.findById(id)
    : null;
  if (!commission) return { error: { status: 404, message: 'Kamisheni haipatikani' } };
  if (String(commission.agent) === String(user._id)) {
    return { error: { status: 403, message: 'Hauwezi kuidhinisha kamisheni yako mwenyewe' } };
  }
  const profile = await AgentProfile.findOne({ user: commission.agent }).lean();
  if (!profile) return { error: { status: 400, message: 'Wakala wa kamisheni hii hayupo' } };
  return { commission, profile };
};

// POST /api/v1/agents/commissions/:id/approve
router.post('/commissions/:id/approve', requireRole(...REVIEW_ROLES), auditRoute({
  action: 'approve_agent_commission',
  category: 'employment',
  targetType: 'AgentCommission',
}), async (req, res) => {
  try {
    const { commission, profile, error } = await loadCommission(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });
    if (!canTransitionCommission(commission.status, 'approved')) {
      return res.status(400).json({ message: 'Kamisheni hii haiwezi kuidhinishwa sasa' });
    }
    if (profile.status !== 'active') {
      return res.status(400).json({ message: 'Wakala amesimamishwa; kamisheni haiwezi kuidhinishwa' });
    }

    const check = await verifyCommissionEvent(commission);
    if (!check.ok) return res.status(400).json({ message: check.message });

    commission.status = 'approved';
    commission.approvedBy = req.user._id;
    commission.approvedAt = new Date();
    await commission.save();

    await notify(commission.agent, {
      title: 'Kamisheni Imeidhinishwa',
      message: `Kamisheni ya ${money(commission.amount)} imeidhinishwa; inasubiri malipo.`,
      link: '/agents',
      metadata: { commissionId: commission._id },
    });

    res.json(commission);
  } catch (error) {
    console.error('Approve commission error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/agents/commissions/:id/reject
router.post('/commissions/:id/reject', requireRole(...REVIEW_ROLES), auditRoute({
  action: 'reject_agent_commission',
  category: 'employment',
  targetType: 'AgentCommission',
}), async (req, res) => {
  try {
    const { commission, error } = await loadCommission(req.params.id, req.user);
    if (error) return res.status(error.status).json({ message: error.message });
    if (!canTransitionCommission(commission.status, 'rejected')) {
      return res.status(400).json({ message: 'Kamisheni hii haiwezi kukataliwa sasa' });
    }

    commission.status = 'rejected';
    commission.rejectionReason = String(req.body.reason || '').slice(0, 300);
    await commission.save();

    await notify(commission.agent, {
      title: 'Kamisheni Imekataliwa',
      message: `Kamisheni ya ${money(commission.amount)} imekataliwa.` +
        (commission.rejectionReason ? ` Sababu: ${commission.rejectionReason}.` : ''),
      link: '/agents',
      metadata: { commissionId: commission._id },
    });

    res.json(commission);
  } catch (error) {
    console.error('Reject commission error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/agents/commissions/:id/pay — finance marks the payout as sent.
router.post('/commissions/:id/pay', requireRole(...FINANCE_ROLES), auditRoute({
  action: 'pay_agent_commission',
  category: 'employment',
  targetType: 'AgentCommission',
}), async (req, res) => {
  try {
    const commission = mongoose.isValidObjectId(req.params.id)
      ? await AgentCommission.findById(req.params.id)
      : null;
    if (!commission) return res.status(404).json({ message: 'Kamisheni haipatikani' });
    if (!canTransitionCommission(commission.status, 'paid')) {
      return res.status(400).json({ message: 'Kamisheni hii haiwezi kulipwa sasa' });
    }

    commission.status = 'paid';
    commission.paidAt = new Date();
    commission.payoutReference = String(req.body.payoutReference || `PAYOUT-${commission._id}`)
      .slice(0, 120);
    await commission.save();

    await AgentProfile.updateOne(
      { user: commission.agent },
      { $inc: { totalEarned: commission.amount } }
    );

    await notify(commission.agent, {
      title: 'Kamisheni Imelipwa',
      message: `${money(commission.amount)} imelipwa. Kumbukumbu: ${commission.payoutReference}.`,
      link: '/agents',
      metadata: { commissionId: commission._id },
    });

    res.json(commission);
  } catch (error) {
    console.error('Pay commission error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
module.exports.verifyCommissionEvent = verifyCommissionEvent;
