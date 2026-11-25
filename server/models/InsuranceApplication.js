const mongoose = require('mongoose');

const APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'quoted',
  'active',
  'rejected',
  'expired',
  'cancelled',
];

const insuranceApplicationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '' },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProduct', required: true },
  productTitle: { type: String, required: true },
  partner: { type: String, required: true },
  farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', default: null },
  sumInsured: { type: Number, required: true, min: 0 },
  estimatedPremium: { type: Number, default: 0, min: 0 },
  quotedPremium: { type: Number, default: 0, min: 0 },
  referralFee: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: APPLICATION_STATUSES, default: 'submitted' },
  partnerReference: { type: String, default: '', maxlength: 120 },
  // Left unset until the policy is issued so the sparse unique index only
  // sees real policy numbers.
  policyNumber: { type: String, maxlength: 60 },
  notes: { type: String, default: '', maxlength: 1000 },
  rejectionReason: { type: String, default: '', maxlength: 300 },
  cancelReason: { type: String, default: '', maxlength: 300 },
  submittedAt: { type: Date, default: Date.now },
  activatedAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
}, { timestamps: true });

insuranceApplicationSchema.index({ user: 1, createdAt: -1 });
insuranceApplicationSchema.index({ status: 1, createdAt: -1 });
insuranceApplicationSchema.index({ product: 1 });
insuranceApplicationSchema.index({ policyNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('InsuranceApplication', insuranceApplicationSchema);
module.exports.APPLICATION_STATUSES = APPLICATION_STATUSES;
