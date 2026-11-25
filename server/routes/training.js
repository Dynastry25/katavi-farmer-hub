const crypto = require('crypto');
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const TrainingCourse = require('../models/TrainingCourse');
const TrainingEnrollment = require('../models/TrainingEnrollment');
const { auth, optionalAuth } = require('../middleware/auth');
const { STAFF_ROLES } = require('../middleware/roleCheck');
const { auditRoute } = require('../services/audit.service');
const { sendNotification } = require('../services/notification.service');
const { initiatePayment, isPaymentPending } = require('../services/payment.service');
const { refundPaidOrder } = require('../services/paymentFlow.service');
const cache = require('../services/cache.service');
const {
  canTransitionEnrollment,
  hasCapacity,
  clampProgress,
  nextEnrollmentStatus,
  makeCertificateCode,
} = require('../services/training.service');

const LIST_PREFIX = 'training:courses:';
const INSTRUCTOR_ROLES = ['expert', 'admin'];
const ACTIVE_ENROLLMENT_STATUSES = ['enrolled', 'in_progress', 'completed'];

const listKey = (query) => {
  const signature = JSON.stringify({
    category: query.category || '',
    level: query.level || '',
    district: query.district || '',
    online: query.online || '',
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

const numberOr = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
};

const dateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isCourseOwnerOrStaff = (course, user) => (
  String(course.provider) === String(user._id) || STAFF_ROLES.includes(user.role)
);

const activeEnrollmentCount = (courseId) => TrainingEnrollment.countDocuments({
  course: courseId,
  status: { $in: ACTIVE_ENROLLMENT_STATUSES },
});

// GET /api/v1/training/courses — published courses for everyone.
router.get('/courses', optionalAuth, async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (req.query.category) filter.category = String(req.query.category);
    if (req.query.level) filter.level = String(req.query.level);
    if (req.query.district) filter.district = String(req.query.district);
    if (req.query.online === 'true') filter.online = true;

    const search = String(req.query.q || '').trim();
    if (search) {
      const pattern = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ title: pattern }, { description: pattern }, { providerName: pattern }];
    }

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);

    const load = async () => {
      const [items, total] = await Promise.all([
        TrainingCourse.find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        TrainingCourse.countDocuments(filter),
      ]);
      return { items, total, page, pages: Math.ceil(total / limit) || 1 };
    };

    const result = req.user
      ? await load()
      : await cache.remember(listKey(req.query), cache.TTL.LISTING, load);
    res.json(result);
  } catch (error) {
    console.error('List training courses error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/training/courses/mine — courses the caller teaches.
router.get('/courses/mine', auth, async (req, res) => {
  try {
    const courses = await TrainingCourse.find({ provider: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(courses);
  } catch (error) {
    console.error('My courses error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/training/courses/:id
router.get('/courses/:id', optionalAuth, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ message: 'Kozi haipatikani' });
    }
    const course = await TrainingCourse.findById(req.params.id).lean();
    if (!course) return res.status(404).json({ message: 'Kozi haipatikani' });

    const privileged = req.user
      && (String(course.provider) === String(req.user._id) || STAFF_ROLES.includes(req.user.role));
    if (course.status !== 'published' && !privileged) {
      return res.status(404).json({ message: 'Kozi haipatikani' });
    }

    const [activeCount, myEnrollment] = await Promise.all([
      activeEnrollmentCount(course._id),
      req.user
        ? TrainingEnrollment.findOne({ course: course._id, learner: req.user._id }).lean()
        : null,
    ]);

    res.json({
      ...course,
      activeCount,
      seatsLeft: course.capacity > 0 ? Math.max(course.capacity - activeCount, 0) : null,
      myEnrollment: myEnrollment || null,
    });
  } catch (error) {
    console.error('Training course detail error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

const courseFields = (body = {}) => {
  const data = {};
  if (body.title !== undefined) data.title = String(body.title).trim().slice(0, 160);
  if (body.description !== undefined) data.description = String(body.description).trim().slice(0, 3000);
  if (body.category !== undefined) data.category = body.category;
  if (body.level !== undefined) data.level = body.level;
  if (body.durationHours !== undefined) data.durationHours = numberOr(body.durationHours);
  if (body.price !== undefined) data.price = numberOr(body.price);
  if (body.district !== undefined) data.district = String(body.district).trim().slice(0, 80);
  if (body.ward !== undefined) data.ward = String(body.ward).trim().slice(0, 80);
  if (body.online !== undefined) data.online = Boolean(body.online);
  if (body.startDate !== undefined) data.startDate = dateOrNull(body.startDate);
  if (body.endDate !== undefined) data.endDate = dateOrNull(body.endDate);
  if (body.coverImage !== undefined) data.coverImage = String(body.coverImage).slice(0, 500);
  if (body.capacity !== undefined) data.capacity = Math.round(numberOr(body.capacity));
  if (body.status !== undefined && ['draft', 'published', 'archived'].includes(body.status)) {
    data.status = body.status;
  }
  return data;
};

// POST /api/v1/training/courses — experts (and admins) publish a course.
router.post('/courses', auth, auditRoute({
  action: 'create_training_course',
  category: 'content',
  targetType: 'TrainingCourse',
}), async (req, res) => {
  try {
    if (!INSTRUCTOR_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Wataalamu pekee wanaweza kutoa mafunzo' });
    }
    if (!req.user.phoneVerified && !req.user.isVerified && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Thibitisha namba yako ya simu kabla ya kutoa mafunzo',
      });
    }

    const fields = courseFields(req.body);
    if (!fields.title || fields.title.length < 6) {
      return res.status(400).json({ message: 'Jina la kozi lifafanue mafunzo' });
    }
    if (!fields.description || fields.description.length < 30) {
      return res.status(400).json({ message: 'Maelezo yahitaji angalau herufi 30' });
    }
    if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
      return res.status(400).json({ message: 'Tarehe ya mwisho haiwezi kuwa kabla ya kuanza' });
    }

    const course = await TrainingCourse.create({
      ...fields,
      provider: req.user._id,
      providerName: req.user.name || '',
      status: fields.status || 'draft',
    });

    await cache.delByPrefix(LIST_PREFIX);
    res.status(201).json(course);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za kozi si sahihi' });
    }
    console.error('Create training course error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// PUT /api/v1/training/courses/:id — instructor or staff.
router.put('/courses/:id', auth, auditRoute({
  action: 'update_training_course',
  category: 'content',
  targetType: 'TrainingCourse',
}), async (req, res) => {
  try {
    const course = mongoose.isValidObjectId(req.params.id)
      ? await TrainingCourse.findById(req.params.id)
      : null;
    if (!course) return res.status(404).json({ message: 'Kozi haipatikani' });
    if (!isCourseOwnerOrStaff(course, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kubadilisha kozi hii' });
    }

    Object.assign(course, courseFields(req.body));
    if (course.startDate && course.endDate && course.endDate < course.startDate) {
      return res.status(400).json({ message: 'Tarehe ya mwisho haiwezi kuwa kabla ya kuanza' });
    }
    await course.save();

    await cache.delByPrefix(LIST_PREFIX);
    res.json(course);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za kozi si sahihi' });
    }
    console.error('Update training course error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// DELETE /api/v1/training/courses/:id — archive so past enrollments stay intact.
router.delete('/courses/:id', auth, auditRoute({
  action: 'archive_training_course',
  category: 'content',
  targetType: 'TrainingCourse',
}), async (req, res) => {
  try {
    const course = mongoose.isValidObjectId(req.params.id)
      ? await TrainingCourse.findById(req.params.id)
      : null;
    if (!course) return res.status(404).json({ message: 'Kozi haipatikani' });
    if (!isCourseOwnerOrStaff(course, req.user)) {
      return res.status(403).json({ message: 'Huna ruhusa kuondoa kozi hii' });
    }

    course.status = 'archived';
    await course.save();
    await cache.delByPrefix(LIST_PREFIX);
    res.json({ message: 'Kozi imeachishwa kwa muda', course });
  } catch (error) {
    console.error('Archive training course error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/training/courses/:id/enroll — join a published course.
router.post('/courses/:id/enroll', auth, auditRoute({
  action: 'enroll_training_course',
  category: 'content',
  targetType: 'TrainingEnrollment',
}), async (req, res) => {
  try {
    const course = mongoose.isValidObjectId(req.params.id)
      ? await TrainingCourse.findById(req.params.id)
      : null;
    if (!course || course.status !== 'published') {
      return res.status(404).json({ message: 'Kozi haipatikani' });
    }
    if (String(course.provider) === String(req.user._id)) {
      return res.status(400).json({ message: 'Hauwezi kujisajili kwenye kozi yako mwenyewe' });
    }

    const existing = await TrainingEnrollment.findOne({
      course: course._id,
      learner: req.user._id,
    }).lean();
    if (existing && existing.status !== 'cancelled') {
      return res.status(409).json({ message: 'Tayari umejiunga na kozi hii', enrollmentId: existing._id });
    }

    const active = await activeEnrollmentCount(course._id);
    if (!hasCapacity(course, active)) {
      return res.status(400).json({ message: 'Nafasi za kozi hii zimejaa' });
    }

    const paid = course.price > 0;
    // A learner may return after cancelling; reuse the row so the unique
    // (course, learner) index still holds and the history stays in one place.
    const enrollment = existing || new TrainingEnrollment({
      course: course._id,
      learner: req.user._id,
    });
    enrollment.instructor = course.provider;
    enrollment.instructorName = course.providerName;
    enrollment.learnerName = req.user.name || '';
    enrollment.courseTitle = course.title;
    enrollment.amount = paid ? course.price : 0;
    enrollment.status = paid ? 'pending_payment' : 'enrolled';
    enrollment.progress = 0;
    enrollment.paymentStatus = 'unpaid';
    enrollment.paymentProvider = '';
    enrollment.paymentMethod = '';
    enrollment.paymentTransactionId = '';
    enrollment.paymentAmount = 0;
    enrollment.paymentInitiatedAt = null;
    enrollment.paidAt = null;
    enrollment.refundedAt = null;
    enrollment.refundReference = '';
    enrollment.completedAt = null;
    enrollment.cancelledAt = null;
    enrollment.certificateCode = undefined;
    enrollment.certificateIssuedAt = null;

    try {
      await enrollment.save();
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Tayari umejiunga na kozi hii' });
      }
      throw error;
    }

    await TrainingCourse.updateOne({ _id: course._id }, { $inc: { enrolledCount: 1 } });

    await notify(course.provider, {
      title: paid ? 'Mwanafunzi Mpya (Malipo Yanayosubiri)' : 'Mwanafunzi Mpya',
      message: `${req.user.name || 'Mwanafunzi'} amejiunga na "${course.title}".`,
      link: '/training',
      metadata: { courseId: course._id, enrollmentId: enrollment._id },
    });

    res.status(201).json(enrollment);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Taarifa za usajili si sahihi' });
    }
    console.error('Enroll training error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/training/enrollments/:id/pay — pay a course fee by mobile money.
router.post('/enrollments/:id/pay', auth, auditRoute({
  action: 'pay_training_enrollment',
  category: 'payment',
  targetType: 'TrainingEnrollment',
}), async (req, res) => {
  try {
    const enrollment = mongoose.isValidObjectId(req.params.id)
      ? await TrainingEnrollment.findById(req.params.id)
      : null;
    if (!enrollment) return res.status(404).json({ message: 'Usajili haupatikani' });
    if (String(enrollment.learner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa kwa usajili huu' });
    }
    if (enrollment.status !== 'pending_payment') {
      return res.status(400).json({ message: 'Usajili huu hauhitaji malipo sasa' });
    }
    if (enrollment.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Kozi hii imekwisha lipwa' });
    }
    if (isPaymentPending(enrollment)) {
      return res.status(409).json({
        message: 'Malipo yanasubiri uthibitisho; subiri dakika 10 kabla ya kujaribu tena',
        transactionId: enrollment.paymentTransactionId || '',
      });
    }
    if (!(enrollment.amount > 0)) {
      return res.status(400).json({ message: 'Hakuna ada ya kulipwa' });
    }

    const { provider, phone } = req.body;
    if (!provider || !phone) {
      return res.status(400).json({ message: 'Chagua mtoa huduma na namba ya simu' });
    }

    const result = await initiatePayment({
      provider,
      phone,
      amount: enrollment.amount,
      reference: `TRAINING-${enrollment._id}`,
      customerName: req.user.name,
    });
    if (!result.success) {
      return res.status(400).json({ message: result.error || 'Malipo hayakuanza' });
    }

    enrollment.paymentStatus = 'processing';
    enrollment.paymentProvider = provider;
    enrollment.paymentMethod = 'mm';
    enrollment.paymentTransactionId = result.transactionId || '';
    enrollment.paymentAmount = enrollment.amount;
    enrollment.paymentInitiatedAt = new Date();
    await enrollment.save();

    res.status(201).json({
      ...result,
      amount: enrollment.amount,
      enrollmentId: String(enrollment._id),
    });
  } catch (error) {
    console.error('Pay training enrollment error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/training/enrollments/:id/progress — learner records progress.
router.post('/enrollments/:id/progress', auth, async (req, res) => {
  try {
    const enrollment = mongoose.isValidObjectId(req.params.id)
      ? await TrainingEnrollment.findById(req.params.id)
      : null;
    if (!enrollment) return res.status(404).json({ message: 'Usajili haupatikani' });
    if (String(enrollment.learner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa kwa usajili huu' });
    }
    if (!['enrolled', 'in_progress'].includes(enrollment.status)) {
      return res.status(400).json({ message: 'Usajili huu hauwezi kupokea maendeleo sasa' });
    }

    const progress = clampProgress(req.body.progress);
    const nextStatus = nextEnrollmentStatus(enrollment.status, progress);
    enrollment.progress = progress;

    const justCompleted = nextStatus === 'completed' && enrollment.status !== 'completed';
    if (nextStatus !== enrollment.status) enrollment.status = nextStatus;
    if (justCompleted) {
      enrollment.completedAt = new Date();
      await TrainingCourse.updateOne(
        { _id: enrollment.course },
        { $inc: { completedCount: 1 } }
      );
      await notify(enrollment.instructor, {
        title: 'Mwanafunzi Amemaliza Kozi',
        message: `${enrollment.learnerName} amemaliza "${enrollment.courseTitle}". Toa cheti.`,
        link: '/training',
        metadata: { enrollmentId: enrollment._id },
      });
    }

    await enrollment.save();
    res.json(enrollment);
  } catch (error) {
    console.error('Update training progress error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/training/enrollments/my
router.get('/enrollments/my', auth, async (req, res) => {
  try {
    const enrollments = await TrainingEnrollment.find({ learner: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json(enrollments);
  } catch (error) {
    console.error('My training enrollments error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/training/enrollments/incoming — learners in the caller's courses.
router.get('/enrollments/incoming', auth, async (req, res) => {
  try {
    const enrollments = await TrainingEnrollment.find({ instructor: req.user._id })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(enrollments);
  } catch (error) {
    console.error('Incoming training enrollments error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/training/enrollments/:id/cancel — learner leaves before finishing.
router.post('/enrollments/:id/cancel', auth, auditRoute({
  action: 'cancel_training_enrollment',
  category: 'content',
  targetType: 'TrainingEnrollment',
}), async (req, res) => {
  try {
    const enrollment = mongoose.isValidObjectId(req.params.id)
      ? await TrainingEnrollment.findById(req.params.id)
      : null;
    if (!enrollment) return res.status(404).json({ message: 'Usajili haupatikani' });
    if (String(enrollment.learner) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Huna ruhusa kwa usajili huu' });
    }
    if (!canTransitionEnrollment(enrollment.status, 'cancelled')) {
      return res.status(400).json({ message: 'Usajili huu hauwezi kufutwa sasa' });
    }

    // A paid seat is refunded before it is released; a failed or impossible
    // refund must not silently cancel a learner who has already paid.
    if (enrollment.paymentStatus === 'paid') {
      const refund = await refundPaidOrder({
        order: enrollment,
        kind: 'training',
        reason: 'Mwanafunzi alijiengua kwenye kozi',
      });
      if (!refund.refunded) {
        return res.status(400).json({
          message: 'Imeshindikana kurejesha ada; wasiliana na huduma kwa wateja',
        });
      }
    }

    enrollment.status = 'cancelled';
    enrollment.cancelledAt = new Date();
    await enrollment.save();
    await TrainingCourse.updateOne({ _id: enrollment.course }, { $inc: { enrolledCount: -1 } });

    await notify(enrollment.instructor, {
      title: 'Mwanafunzi Alijiengua',
      message: `${enrollment.learnerName} ameondoka kwenye "${enrollment.courseTitle}".`,
      link: '/training',
      metadata: { enrollmentId: enrollment._id },
    });

    res.json(enrollment);
  } catch (error) {
    console.error('Cancel training enrollment error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// POST /api/v1/training/enrollments/:id/certificate — instructor issues a certificate.
router.post('/enrollments/:id/certificate', auth, auditRoute({
  action: 'issue_training_certificate',
  category: 'content',
  targetType: 'TrainingEnrollment',
}), async (req, res) => {
  try {
    const enrollment = mongoose.isValidObjectId(req.params.id)
      ? await TrainingEnrollment.findById(req.params.id)
      : null;
    if (!enrollment) return res.status(404).json({ message: 'Usajili haupatikani' });
    if (String(enrollment.instructor) !== String(req.user._id)
      && !STAFF_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: 'Huna ruhusa kutoa cheti hiki' });
    }
    if (enrollment.status !== 'completed') {
      return res.status(400).json({ message: 'Cheti hutolewa baada ya kozi kukamilika' });
    }
    if (enrollment.certificateCode) {
      return res.status(409).json({ message: 'Cheti hiki tayari kimetolewa' });
    }

    for (let attempt = 0; attempt < 5 && !enrollment.certificateCode; attempt += 1) {
      const code = makeCertificateCode();
      try {
        enrollment.certificateCode = code;
        enrollment.certificateIssuedAt = new Date();
        await enrollment.save();
      } catch (error) {
        if (error.code !== 11000) throw error;
        enrollment.certificateCode = undefined;
      }
    }
    if (!enrollment.certificateCode) {
      return res.status(500).json({ message: 'Imeshindikana kutoa cheti; jaribu tena' });
    }

    await notify(enrollment.learner, {
      title: 'Cheti Chako Kiko Tayari',
      message: `Cheti cha "${enrollment.courseTitle}": ${enrollment.certificateCode}.`,
      link: '/training',
      metadata: { enrollmentId: enrollment._id, certificateCode: enrollment.certificateCode },
    });

    res.json(enrollment);
  } catch (error) {
    console.error('Issue training certificate error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

// GET /api/v1/training/verify/:code — public certificate check.
router.get('/verify/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    const enrollment = code
      ? await TrainingEnrollment.findOne({ certificateCode: code }).lean()
      : null;
    if (!enrollment) {
      return res.status(404).json({ valid: false, message: 'Cheti hakipatikani' });
    }
    res.json({
      valid: true,
      certificateCode: enrollment.certificateCode,
      learnerName: enrollment.learnerName,
      courseTitle: enrollment.courseTitle,
      instructorName: enrollment.instructorName,
      issuedAt: enrollment.certificateIssuedAt,
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ message: 'Hitilafu imetokea' });
  }
});

module.exports = router;
