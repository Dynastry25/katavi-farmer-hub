const mongoose = require('mongoose');

const INSURANCE_TYPES = ['crop', 'livestock', 'asset', 'health'];
const PRODUCT_STATUSES = ['active', 'paused'];

// Partner products only: Katavi E-Kilimo refers farmers to a licensed insurer
// and records the referral, it does not underwrite or hold premiums itself.
const insuranceProductSchema = new mongoose.Schema({
  partner: { type: String, required: true, trim: true, maxlength: 160 },
  contactPhone: { type: String, default: '', trim: true },
  contactEmail: { type: String, default: '', trim: true },
  productType: { type: String, enum: INSURANCE_TYPES, default: 'crop' },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  coverageSummary: { type: String, default: '', maxlength: 1000 },
  // Premium as a percentage of the sum insured, e.g. 5 means 5%.
  premiumRate: { type: Number, required: true, min: 0, max: 100 },
  minSumInsured: { type: Number, default: 0, min: 0 },
  maxSumInsured: { type: Number, default: 0, min: 0 },
  // Platform referral share of the premium, agreed with the partner.
  referralRate: { type: Number, default: 0, min: 0, max: 100 },
  districts: [{ type: String }],
  status: { type: String, enum: PRODUCT_STATUSES, default: 'active' },
}, { timestamps: true });

insuranceProductSchema.index({ status: 1, productType: 1, createdAt: -1 });

module.exports = mongoose.model('InsuranceProduct', insuranceProductSchema);
module.exports.INSURANCE_TYPES = INSURANCE_TYPES;
module.exports.PRODUCT_STATUSES = PRODUCT_STATUSES;
