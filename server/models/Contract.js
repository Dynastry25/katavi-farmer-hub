const mongoose = require('mongoose');

const CONTRACT_STATUSES = ['open', 'contracted', 'fulfilled', 'cancelled', 'expired'];
const CONTRACT_GRADES = ['A', 'B', 'C', 'mixed'];
const PAYMENT_PLANS = ['on_delivery', 'split', 'milestones'];

const contractSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  cropName: { type: String, required: true, trim: true, maxlength: 120 },
  quantityKg: { type: Number, required: true, min: 1 },
  pricePerKg: { type: Number, default: 0, min: 0 },
  qualityRequirements: { type: String, default: '', maxlength: 1000 },
  moistureMaxPct: { type: Number, default: 14, min: 0, max: 100 },
  grade: { type: String, enum: CONTRACT_GRADES, default: 'mixed' },
  district: { type: String, default: 'Katavi', trim: true },
  ward: { type: String, default: '', trim: true },
  village: { type: String, default: '', trim: true },
  deliveryLocation: { type: String, default: '', maxlength: 300 },
  startDate: { type: Date, default: null },
  deadline: { type: Date, default: null },
  paymentPlan: { type: String, enum: PAYMENT_PLANS, default: 'on_delivery' },
  paymentTerms: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: CONTRACT_STATUSES, default: 'open' },
  // Running totals kept on the contract so progress is one read, and guarded
  // updates can refuse over-commitment atomically.
  committedKg: { type: Number, default: 0, min: 0 },
  deliveredKg: { type: Number, default: 0, min: 0 },
  notes: { type: String, default: '', maxlength: 1000 },
}, { timestamps: true });

contractSchema.index({ status: 1, createdAt: -1 });
contractSchema.index({ cropName: 1, status: 1 });
contractSchema.index({ buyer: 1, createdAt: -1 });

module.exports = mongoose.model('Contract', contractSchema);
module.exports.CONTRACT_STATUSES = CONTRACT_STATUSES;
module.exports.CONTRACT_GRADES = CONTRACT_GRADES;
module.exports.PAYMENT_PLANS = PAYMENT_PLANS;
