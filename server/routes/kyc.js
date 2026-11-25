const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const VerificationRequest = require('../models/VerificationRequest');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { requirePermission, STAFF_ROLES } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const {
  DOCUMENT_LABELS,
  REQUESTED_ROLES,
  ROLE_LABELS,
  canTransitionRequest,
  detailsForRole,
  missingRequirements,
  normalizeDocuments,
  requirementsCatalog,
} = require('../services/kyc.service');

const REVIEW_PERMISSION = 'verifications.review';
const ACTION_TARGETS = {
  start_review: 'under_review',
  approve: 'approved',
  reject: 'rejected',
  suspend: 'suspended',
  reinstate: 'approved',
};

const notify = async (userId, payload) => {
  if (!userId) return;
  try {
    await sendNotification(userId, { type: 'system', ...payload });
  } catch (e) { /* best effort */ }
};

const pushHistory = (request, status, user, note = '') => {
  request.history.push({
    status,
    at: new Date(),
    by: user?._id || null,
    byName: user?.name || 'Mfumo',
    note,
  });
};

// GET /api/v1/kyc/requirements — what each role must submit (for the UI).
router.get('/requirements', (req, res) => {
  const roles = requirementsCatalog();
  const documentTypes = Object.entries(DOCUMENT_LABELS)
    .map(([value, label]) => ({ value, label }));
  res.json({ roles, documentTypes });
});

// GET /api/v1/kyc/status — compact verification badge for the profile screen.
router.get('/status', auth, async (req, res) => {
  try {
    const requests = await VerificationRequest.find({ user: req.user._id })
      .select('requestedRole status updatedAt rejectionReason suspendedReason')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({
      verified: Boolean(req.user.isVerified),
      verifiedRoles: req.user.verifiedRoles || [],
      requests,
    });
  } catch (error) {
    console.error('KYC status error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/kyc/my — the caller's verification requests.
router.get('/my', auth, async (req, res) => {
  try {
    const requests = await VerificationRequest.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .lean();
    res.json(requests);
  } catch (error) {
    console.error('My KYC requests error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/kyc/requests — submit (or resubmit) one business role.
router.post('/requests', auth, auditRoute({
  action: 'submit_kyc',
  category: 'user',
  targetType: 'VerificationRequest',
  details: (req) => ({ requestedRole: String(req.body?.requestedRole || '') }),
}), async (req, res) => {
  try {
    if (STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Watumishi hawahitaji uthibitisho huu' });
    }

    const requestedRole = String(req.body.requestedRole || '');
    if (!REQUESTED_ROLES.includes(requestedRole)) {
      return res.status(400).json({ message: 'Chagua aina ya uthibitisho unaotaka' });
    }

    const documents = normalizeDocuments(req.body.documents);
    const details = detailsForRole(requestedRole, req.body.details || {});
    const missing = missingRequirements({ requestedRole, documents, details });
    if (missing.length) {
      return res.status(400).json({
        message: `Nyaraka au taarifa zifuatazo zinakosekana: ${missing.join(', ')}`,
        missing,
      });
    }

    const farmId = mongoose.isValidObjectId(req.body.farmId) ? req.body.farmId : null;
    const existing = await VerificationRequest.findOne({
      user: req.user._id,
      requestedRole,
    });

    let request;
    if (existing) {
      if (['approved', 'suspended'].includes(existing.status)) {
        return res.status(409).json({
          message: 'Uthibitisho wa jukumu hili unaombiwa upya na msimamizi',
          status: existing.status,
        });
      }
      existing.documents = documents;
      existing.details = details;
      existing.farm = farmId;
      existing.status = 'submitted';
      existing.submittedAt = new Date();
      existing.rejectionReason = '';
      existing.suspendedReason = '';
      existing.reviewedBy = null;
      existing.reviewerName = '';
      existing.reviewedAt = null;
      existing.userName = req.user.name || '';
      existing.accountRole = req.user.role || '';
      pushHistory(existing, 'submitted', req.user, 'Ombi limewasilishwa');
      await existing.save();
      request = existing;
    } else {
      request = await VerificationRequest.create({
        user: req.user._id,
        userName: req.user.name || '',
        accountRole: req.user.role || '',
        requestedRole,
        documents,
        details,
        farm: farmId,
        history: [{
          status: 'submitted',
          by: req.user._id,
          byName: req.user.name || '',
          note: 'Ombi limewasilishwa',
        }],
      });
    }

    await notify(req.user._id, {
      title: 'Ombi la Uthibitisho Limepokelewa',
      message: `Ombi lako la ${ROLE_LABELS[requestedRole]} limewasilishwa na linasubiri ukaguzi.`,
      link: '/verify',
      metadata: { verificationId: request._id, requestedRole },
    });

    res.status(201).json(request);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Tayari una ombi la aina hii' });
    }
    console.error('Submit KYC error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/kyc/requests — staff review queue.
router.get('/requests', auth, requirePermission(REVIEW_PERMISSION), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.requestedRole) filter.requestedRole = String(req.query.requestedRole);

    const requests = await VerificationRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('user', 'name phone email district ward role')
      .lean();
    res.json(requests);
  } catch (error) {
    console.error('List KYC requests error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/kyc/requests/:id — owner or staff.
router.get('/requests/:id', auth, async (req, res) => {
  try {
    const request = mongoose.isValidObjectId(req.params.id)
      ? await VerificationRequest.findById(req.params.id)
        .populate('user', 'name phone email district ward role isVerified')
        .lean()
      : null;
    if (!request) return res.status(404).json({ message: 'Ombi halipatikani' });

    const mine = String(request.user?._id || request.user) === String(req.user._id);
    if (!mine && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa kuona ombi hili' });
    }
    res.json(request);
  } catch (error) {
    console.error('KYC request detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/kyc/requests/:id — owner corrects and resubmits.
router.put('/requests/:id', auth, async (req, res) => {
  try {
    const request = mongoose.isValidObjectId(req.params.id)
      ? await VerificationRequest.findById(req.params.id)
      : null;
    if (!request) return res.status(404).json({ message: 'Ombi halipatikani' });
    if (String(request.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa kubadilisha ombi hili' });
    }
    if (['under_review', 'approved', 'suspended'].includes(request.status)) {
      return res.status(409).json({
        message: request.status === 'under_review'
          ? 'Ombi linakaguliwa sasa; subiri uamuzi au lifute kwanza'
          : 'Ombi lililothibitishwa haliwezi kuhaririwa',
      });
    }

    const documents = req.body.documents !== undefined
      ? normalizeDocuments(req.body.documents)
      : request.documents;
    const details = req.body.details !== undefined
      ? detailsForRole(request.requestedRole, req.body.details)
      : request.details;
    const missing = missingRequirements({
      requestedRole: request.requestedRole,
      documents,
      details,
    });
    if (missing.length) {
      return res.status(400).json({
        message: `Nyaraka au taarifa zifuatazo zinakosekana: ${missing.join(', ')}`,
        missing,
      });
    }

    request.documents = documents;
    request.details = details;
    if (req.body.farmId !== undefined) {
      request.farm = mongoose.isValidObjectId(req.body.farmId) ? req.body.farmId : null;
    }
    request.status = 'submitted';
    request.submittedAt = new Date();
    request.rejectionReason = '';
    pushHistory(request, 'submitted', req.user, 'Ombi limewasilishwa upya');
    await request.save();

    res.json(request);
  } catch (error) {
    console.error('Update KYC request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/kyc/requests/:id/review — verification officer decision.
router.post('/requests/:id/review', auth, requirePermission(REVIEW_PERMISSION), auditRoute({
  action: 'review_kyc',
  category: 'user',
  targetType: 'VerificationRequest',
  details: (req) => ({ action: String(req.body?.action || '') }),
}), async (req, res) => {
  try {
    const request = mongoose.isValidObjectId(req.params.id)
      ? await VerificationRequest.findById(req.params.id)
      : null;
    if (!request) return res.status(404).json({ message: 'Ombi halipatikani' });

    const action = String(req.body.action || '');
    const target = ACTION_TARGETS[action];
    if (!target) {
      return res.status(400).json({ message: 'Hatua ya ukaguzi si sahihi' });
    }
    if (!canTransitionRequest(request.status, target)) {
      return res.status(400).json({
        message: `Ombi hili haliwezi kubadilishwa kutoka "${request.status}" kwenda "${target}"`,
      });
    }

    const reason = String(req.body.reason || '').trim().slice(0, 300);
    if (['reject', 'suspend'].includes(action) && !reason) {
      return res.status(400).json({ message: 'Toa sababu ya uamuzi huu' });
    }

    if (action === 'approve' || action === 'reinstate') {
      const missing = missingRequirements({
        requestedRole: request.requestedRole,
        documents: request.documents,
        details: request.details,
      });
      if (missing.length) {
        return res.status(400).json({
          message: `Nyaraka hazijakamilika: ${missing.join(', ')}`,
          missing,
        });
      }
    }

    request.status = target;
    request.reviewedBy = req.user._id;
    request.reviewerName = req.user.name || '';
    request.reviewedAt = new Date();
    if (action === 'reject') request.rejectionReason = reason;
    if (action === 'suspend') request.suspendedReason = reason;
    if (action === 'reinstate') {
      request.suspendedReason = '';
      request.rejectionReason = '';
    }
    pushHistory(request, target, req.user, reason);
    await request.save();

    if (target === 'approved') {
      await User.updateOne(
        { _id: request.user },
        { $set: { isVerified: true }, $addToSet: { verifiedRoles: request.requestedRole } },
      );
    }
    if (target === 'suspended' || target === 'rejected') {
      await User.updateOne(
        { _id: request.user },
        { $pull: { verifiedRoles: request.requestedRole } },
      );
    }

    const messages = {
      under_review: `Ombi lako la ${ROLE_LABELS[request.requestedRole]} linafanyiwa ukaguzi.`,
      approved: `Uthibitisho wa ${ROLE_LABELS[request.requestedRole]} umekamilika.`,
      rejected: `Ombi lako la ${ROLE_LABELS[request.requestedRole]} limekataliwa. Sababu: ${reason}.`,
      suspended: `Uthibitisho wa ${ROLE_LABELS[request.requestedRole]} umesimamishwa. Sababu: ${reason}.`,
    };
    await notify(request.user, {
      title: 'Taarifa ya Uthibitisho',
      message: messages[target] || 'Hali ya uthibitisho wako imebadilika.',
      link: '/verify',
      metadata: { verificationId: request._id, status: target },
    });

    res.json(request);
  } catch (error) {
    console.error('Review KYC request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/kyc/requests/:id — owner withdraws before a decision.
router.delete('/requests/:id', auth, async (req, res) => {
  try {
    const request = mongoose.isValidObjectId(req.params.id)
      ? await VerificationRequest.findById(req.params.id)
      : null;
    if (!request) return res.status(404).json({ message: 'Ombi halipatikani' });
    if (String(request.user) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa kwa ombi hili' });
    }
    if (!canTransitionRequest(request.status, 'cancelled')) {
      return res.status(400).json({ message: 'Ombi hili haliwezi kufutwa sasa' });
    }

    request.status = 'cancelled';
    pushHistory(request, 'cancelled', req.user, String(req.body.reason || '').slice(0, 300));
    await request.save();
    res.json({ message: 'Ombi limefutwa', request });
  } catch (error) {
    console.error('Cancel KYC request error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
