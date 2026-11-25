const mongoose = require('mongoose');

const APPLICATION_STATUSES = [
  'pending',
  'shortlisted',
  'accepted',
  'completion_requested',
  'rejected',
  'withdrawn',
  'completed',
];

const PAYMENT_STATUSES = ['unpaid', 'paid', 'waived'];
const PAYMENT_METHODS = ['cash', 'mobile_money', 'bank', 'other'];

const opportunityApplicationSchema = new mongoose.Schema({
  opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity', required: true },
  applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicantName: { type: String, required: true, trim: true },
  message: { type: String, default: '', maxlength: 1000 },
  // Snapshot of what the applicant offered so later profile edits do not
  // rewrite the employer's record of the application.
  experience: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: APPLICATION_STATUSES, default: 'pending' },
  statusUpdatedAt: { type: Date, default: Date.now },
  completionRequestedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
  paidAmount: { type: Number, default: 0, min: 0 },
  paymentMethod: { type: String, enum: ['', ...PAYMENT_METHODS], default: '' },
  paymentReference: { type: String, default: '', maxlength: 120 },
  paidAt: { type: Date, default: null },
}, { timestamps: true });

opportunityApplicationSchema.index({ opportunity: 1, applicant: 1 }, { unique: true });
opportunityApplicationSchema.index({ applicant: 1, createdAt: -1 });
opportunityApplicationSchema.index({ opportunity: 1, status: 1 });

module.exports = mongoose.model('OpportunityApplication', opportunityApplicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
