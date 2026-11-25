const mongoose = require('mongoose');

const DOCUMENT_TYPES = [
  'national_id',
  'business_license',
  'business_registration',
  'tin',
  'drivers_license',
  'vehicle_registration',
  'vehicle_insurance',
  'professional_certificate',
  'warehouse_license',
  'other',
];

const REQUESTED_ROLES = ['farmer', 'buyer', 'seller', 'logistics', 'expert', 'warehouse'];

const REQUEST_STATUSES = [
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'suspended',
  'cancelled',
];

const documentSchema = new mongoose.Schema({
  type: { type: String, enum: DOCUMENT_TYPES, required: true },
  number: { type: String, default: '', maxlength: 80 },
  fileUrl: { type: String, default: '', maxlength: 500 },
  issuedAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
}, { _id: false });

const historySchema = new mongoose.Schema({
  status: { type: String, enum: REQUEST_STATUSES, required: true },
  at: { type: Date, default: Date.now },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  byName: { type: String, default: '' },
  note: { type: String, default: '', maxlength: 300 },
}, { _id: false });

const verificationRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '' },
  accountRole: { type: String, default: '' },
  requestedRole: { type: String, enum: REQUESTED_ROLES, required: true },
  status: { type: String, enum: REQUEST_STATUSES, default: 'submitted' },
  documents: { type: [documentSchema], default: [] },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', default: null },
  submittedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewerName: { type: String, default: '' },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: '', maxlength: 300 },
  suspendedReason: { type: String, default: '', maxlength: 300 },
  history: { type: [historySchema], default: [] },
}, { timestamps: true });

verificationRequestSchema.index({ user: 1, requestedRole: 1 }, { unique: true });
verificationRequestSchema.index({ status: 1, createdAt: -1 });
verificationRequestSchema.index({ requestedRole: 1, status: 1 });

module.exports = mongoose.model('VerificationRequest', verificationRequestSchema);
module.exports.DOCUMENT_TYPES = DOCUMENT_TYPES;
module.exports.REQUESTED_ROLES = REQUESTED_ROLES;
module.exports.REQUEST_STATUSES = REQUEST_STATUSES;
