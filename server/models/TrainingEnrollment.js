const mongoose = require('mongoose');

const ENROLLMENT_STATUSES = [
  'pending_payment',
  'enrolled',
  'in_progress',
  'completed',
  'cancelled',
];

const trainingEnrollmentSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingCourse', required: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  instructorName: { type: String, default: '' },
  learner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  learnerName: { type: String, default: '' },
  // Snapshots so a later price or title edit does not rewrite the receipt.
  courseTitle: { type: String, required: true, trim: true },
  amount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: ENROLLMENT_STATUSES, default: 'enrolled' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'processing', 'paid', 'failed', 'refunded'],
    default: 'unpaid',
  },
  paymentProvider: { type: String, default: '' },
  paymentMethod: { type: String, enum: ['', 'mm'], default: '' },
  paymentTransactionId: { type: String, default: '' },
  paymentAmount: { type: Number, default: 0 },
  paymentInitiatedAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  refundReference: { type: String, default: '' },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  // Left unset until the certificate is issued; the sparse unique index then
  // only tracks real certificate codes.
  certificateCode: { type: String },
  certificateIssuedAt: { type: Date, default: null },
}, { timestamps: true });

trainingEnrollmentSchema.index({ course: 1, learner: 1 }, { unique: true });
trainingEnrollmentSchema.index({ learner: 1, createdAt: -1 });
trainingEnrollmentSchema.index({ instructor: 1, status: 1, createdAt: -1 });
trainingEnrollmentSchema.index({ paymentTransactionId: 1 });
trainingEnrollmentSchema.index({ certificateCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('TrainingEnrollment', trainingEnrollmentSchema);
module.exports.ENROLLMENT_STATUSES = ENROLLMENT_STATUSES;
