const mongoose = require('mongoose');

const OPPORTUNITY_KINDS = ['job', 'business'];
const EMPLOYMENT_TYPES = ['permanent', 'seasonal', 'daily', 'contract'];
const PAY_UNITS = ['day', 'week', 'month', 'task', 'total'];
const OPPORTUNITY_CATEGORIES = [
  'harvest_labor',
  'farm_management',
  'transport',
  'warehouse',
  'input_retail',
  'sales_agent',
  'equipment_operator',
  'processing',
  'partnership',
  'investment',
  'customers',
  'supplies',
  'other',
];
const OPPORTUNITY_STATUSES = ['open', 'filled', 'closed'];

const opportunitySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerName: { type: String, required: true, trim: true },
  ownerRole: { type: String, default: '' },
  kind: { type: String, enum: OPPORTUNITY_KINDS, default: 'job' },
  category: { type: String, enum: OPPORTUNITY_CATEGORIES, default: 'other' },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  employmentType: { type: String, enum: EMPLOYMENT_TYPES, default: 'seasonal' },
  district: { type: String, default: 'Katavi', trim: true },
  ward: { type: String, default: '', trim: true },
  village: { type: String, default: '', trim: true },
  payAmount: { type: Number, default: 0, min: 0 },
  payUnit: { type: String, enum: PAY_UNITS, default: 'task' },
  currency: { type: String, default: 'TZS' },
  positions: { type: Number, default: 1, min: 1, max: 1000 },
  requirements: { type: String, default: '', maxlength: 1000 },
  contactPhone: { type: String, default: '', maxlength: 20 },
  startDate: { type: Date, default: null },
  deadline: { type: Date, default: null },
  // Minimum working age is fixed at 18 so child labour postings cannot exist.
  minimumAge: { type: Number, default: 18, min: 18 },
  posterVerified: { type: Boolean, default: false },
  posterVerifiedAt: { type: Date, default: null },
  status: { type: String, enum: OPPORTUNITY_STATUSES, default: 'open' },
  applicationsCount: { type: Number, default: 0, min: 0 },
  acceptedCount: { type: Number, default: 0, min: 0 },
  completedCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

opportunitySchema.index({ status: 1, kind: 1, createdAt: -1 });
opportunitySchema.index({ status: 1, district: 1, category: 1 });
opportunitySchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Opportunity', opportunitySchema);
module.exports.OPPORTUNITY_KINDS = OPPORTUNITY_KINDS;
module.exports.EMPLOYMENT_TYPES = EMPLOYMENT_TYPES;
module.exports.PAY_UNITS = PAY_UNITS;
module.exports.OPPORTUNITY_CATEGORIES = OPPORTUNITY_CATEGORIES;
module.exports.OPPORTUNITY_STATUSES = OPPORTUNITY_STATUSES;
