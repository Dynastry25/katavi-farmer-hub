const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Crop = require('../models/Crop');
const { auth } = require('../middleware/auth');
const { requireOwnershipOrAdmin, requirePermission } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const cache = require('../services/cache.service');
const {
  GRADES,
  GRADE_LABELS,
  STANDARDS,
  CERTIFICATION_STATUSES,
  assessQuality,
  normalizeInspection,
  canTransitionCertification,
  effectiveCertificationStatus,
} = require('../services/quality.service');
const { buildListEnvelope } = require('../services/listResponse.service');

const REVIEW_PERMISSION = 'verifications.review';

const cropOwnerId = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) return null;
  const crop = await Crop.findById(req.params.id).select('farmer');
  return crop?.farmer || null;
};

const certificationView = (crop, now = new Date()) => {
  const certification = crop.certification || {};
  return {
    status: effectiveCertificationStatus(certification, now),
    certificateNumber: certification.certificateNumber || '',
    issuer: certification.issuer || '',
    issuedAt: certification.issuedAt || null,
    expiresAt: certification.expiresAt || null,
    requestedAt: certification.requestedAt || null,
    reviewedAt: certification.reviewedAt || null,
    rejectionReason: certification.rejectionReason || '',
    inspection: certification.inspection
      ? {
        photos: certification.inspection.photos || [],
        labReference: certification.inspection.labReference || '',
        notes: certification.inspection.notes || '',
        grade: certification.inspection.grade || '',
        sampledAt: certification.inspection.sampledAt || null,
        recordedAt: certification.inspection.recordedAt || null,
      }
      : null,
  };
};

// GET /api/v1/quality/standards — grading thresholds used by the assessor.
router.get('/standards', (req, res) => {
  res.json({
    grades: GRADES.map((code) => ({ code, label: GRADE_LABELS[code] })),
    standards: STANDARDS,
    certificationStatuses: CERTIFICATION_STATUSES,
  });
});

// GET /api/v1/quality/certified — listings with a live certificate.
router.get('/certified', async (req, res) => {
  try {
    const crops = await cache.remember('quality:certified', cache.TTL.REFERENCE, () => Crop.find({
      'certification.status': 'verified',
      status: { $in: ['available', 'low_stock'] },
    })
      .select('name category price unit location farmerName image quality certification')
      .sort({ 'certification.reviewedAt': -1 })
      .limit(60)
      .lean());

    const now = new Date();
    res.json({
      crops: crops.filter((crop) => effectiveCertificationStatus(crop.certification, now) === 'verified'),
    });
  } catch (error) {
    console.error('Certified crops error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/quality/pending — certification requests waiting for review,
// oldest first so nothing is left behind in the queue.
router.get('/pending', auth, requirePermission(REVIEW_PERMISSION), async (req, res) => {
  try {
    const crops = await Crop.find({ 'certification.status': 'pending' })
      .select('name category unit farmerName image location quantity price status quality certification')
      .sort({ 'certification.requestedAt': 1 })
      .limit(100)
      .lean();

    const now = new Date();
    const items = crops.map((crop) => {
      const requestedAt = crop.certification?.requestedAt;
      const waitingDays = requestedAt
        ? Math.max(0, Math.floor((now.getTime() - new Date(requestedAt).getTime()) / 86400000))
        : 0;
      return {
        _id: crop._id,
        name: crop.name,
        category: crop.category,
        unit: crop.unit,
        farmerName: crop.farmerName,
        image: crop.image,
        location: crop.location,
        quantity: crop.quantity,
        price: crop.price,
        listingStatus: crop.status,
        quality: crop.quality,
        certification: certificationView(crop, now),
        waitingDays,
      };
    });
    res.json(buildListEnvelope(items, req.query));
  } catch (error) {
    console.error('Pending certifications error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/quality/crops/:id — quality and certification snapshot.
router.get('/crops/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Zao hili halipatikani' });
    }
    const crop = await Crop.findById(req.params.id)
      .select('name category unit farmerName quality certification status');
    if (!crop) return res.status(404).json({ message: 'Zao hili halipatikani' });

    res.json({
      crop: {
        _id: crop._id,
        name: crop.name,
        category: crop.category,
        unit: crop.unit,
        farmerName: crop.farmerName,
        listingStatus: crop.status,
      },
      quality: crop.quality,
      certification: certificationView(crop),
    });
  } catch (error) {
    console.error('Crop quality error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/quality/crops/:id — owner declares post-harvest measurements.
router.put('/crops/:id/quality', requireOwnershipOrAdmin(cropOwnerId), async (req, res) => {
  try {
    const assessment = assessQuality(req.body || {});
    if (!assessment) {
      return res.status(400).json({
        message: 'Weka angalau kipimo kimoja: unyevu, vitu vigeni au usafi',
      });
    }

    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Zao hili halipatikani' });

    const { issues, ...measures } = assessment;
    crop.quality = { ...measures, declaredAt: new Date() };
    // New numbers invalidate an old certificate until staff review them again.
    if (crop.certification?.status === 'verified') {
      crop.certification.status = 'pending';
      crop.certification.requestedAt = new Date();
      crop.certification.certificateNumber = '';
      crop.certification.issuer = '';
      crop.certification.issuedAt = null;
      crop.certification.expiresAt = null;
      crop.certification.reviewedBy = null;
      crop.certification.reviewedAt = null;
    }
    await crop.save();

    res.json({
      quality: crop.quality,
      certification: certificationView(crop),
      issues,
    });
  } catch (error) {
    console.error('Declare crop quality error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/quality/crops/:id/certification — owner asks for certification.
router.post('/crops/:id/certification', requireOwnershipOrAdmin(cropOwnerId), async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Zao hili halipatikani' });
    if (!crop.quality?.declaredAt) {
      return res.status(400).json({
        message: 'Weka vipimo vya ubora kwanza kabla ya kuomba uthibitisho',
      });
    }

    const current = effectiveCertificationStatus(crop.certification);
    if (!canTransitionCertification(current, 'pending')) {
      return res.status(409).json({
        message: current === 'pending'
          ? 'Ombi la uthibitisho linasubiri ukaguzi'
          : 'Uthibitisho wa zao hili hauwezi kuombwa kwa sasa',
      });
    }

    crop.certification.status = 'pending';
    crop.certification.requestedAt = new Date();
    crop.certification.rejectionReason = '';
    await crop.save();

    res.status(201).json({
      message: 'Ombi la uthibitisho limewasilishwa',
      certification: certificationView(crop),
    });
  } catch (error) {
    console.error('Request crop certification error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/quality/crops/:id/certification/review — staff decision.
router.post('/crops/:id/certification/review', auth, requirePermission(REVIEW_PERMISSION), auditRoute({
  action: 'review_crop_certification',
  category: 'content',
  targetType: 'Crop',
  details: (req) => ({ decision: String(req.body?.decision || '') }),
}), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Zao hili halipatikani' });
    }
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ message: 'Zao hili halipatikani' });

    const current = effectiveCertificationStatus(crop.certification);
    const decision = String(req.body.decision || '');
    const target = decision === 'approve' ? 'verified' : decision === 'reject' ? 'rejected' : '';
    if (!target) {
      return res.status(400).json({ message: 'Chagua kukubali au kukataa uthibitisho' });
    }
    if (!canTransitionCertification(current, target)) {
      return res.status(400).json({
        message: `Uthibitisho wa hali "${current}" hauwezi kubadilishwa kwenda "${target}"`,
      });
    }

    const inspection = normalizeInspection(req.body.inspection);
    if (target === 'verified' && !inspection) {
      return res.status(400).json({
        message: 'Weka ushahidi wa ukaguzi: picha za zao au kumbukumbu ya maabara',
      });
    }
    if (inspection) {
      crop.certification.inspection = {
        photos: inspection.photos,
        labReference: inspection.labReference,
        notes: inspection.notes,
        grade: inspection.grade,
        sampledAt: inspection.sampledAt,
        inspector: req.user._id,
        recordedAt: new Date(),
      };
      if (inspection.assessment) {
        const measures = { ...inspection.assessment };
        delete measures.issues;
        crop.quality = {
          ...measures,
          grade: inspection.grade || measures.grade,
          declaredAt: crop.quality?.declaredAt || new Date(),
        };
      }
    }

    if (target === 'verified') {
      const certificateNumber = String(req.body.certificateNumber || '').trim();
      const issuer = String(req.body.issuer || '').trim();
      if (certificateNumber.length < 4 || issuer.length < 3) {
        return res.status(400).json({
          message: 'Namba ya cheti (angalau herufi 4) na mtoaji (angalau herufi 3) vinahitajika',
        });
      }
      const issuedAt = req.body.issuedAt ? new Date(req.body.issuedAt) : new Date();
      if (Number.isNaN(issuedAt.getTime())) {
        return res.status(400).json({ message: 'Tarehe ya kutolewa si sahihi' });
      }
      let expiresAt = null;
      if (req.body.expiresAt) {
        expiresAt = new Date(req.body.expiresAt);
        if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
          return res.status(400).json({ message: 'Tarehe ya mwisho wa cheti si sahihi' });
        }
      }
      crop.certification.status = 'verified';
      crop.certification.certificateNumber = certificateNumber;
      crop.certification.issuer = issuer;
      crop.certification.issuedAt = issuedAt;
      crop.certification.expiresAt = expiresAt;
      crop.certification.rejectionReason = '';
    } else {
      const reason = String(req.body.reason || '').trim();
      if (reason.length < 5) {
        return res.status(400).json({ message: 'Toa sababu ya kukataa uthibitisho' });
      }
      crop.certification.status = 'rejected';
      crop.certification.rejectionReason = reason.slice(0, 300);
      crop.certification.certificateNumber = '';
      crop.certification.issuer = '';
      crop.certification.issuedAt = null;
      crop.certification.expiresAt = null;
    }
    crop.certification.reviewedBy = req.user._id;
    crop.certification.reviewedAt = new Date();
    await crop.save();

    if (crop.farmer) {
      await sendNotification(crop.farmer, {
        title: target === 'verified' ? 'Zao lako limeidhinishwa' : 'Uthibitisho wa zao umekataliwa',
        message: target === 'verified'
          ? `${crop.name}: cheti ${crop.certification.certificateNumber} kimetolewa na ${crop.certification.issuer}.`
          : `${crop.name}: ${crop.certification.rejectionReason}`,
        type: 'system',
        link: '/crops',
        metadata: { cropId: String(crop._id) },
      });
    }

    res.json({
      message: target === 'verified' ? 'Uthibitisho umetolewa' : 'Ombi limekataliwa',
      certification: certificationView(crop),
    });
  } catch (error) {
    console.error('Review crop certification error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
