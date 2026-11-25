const mongoose = require('mongoose');

const REVENUE_SOURCES = ['commission', 'service_fee', 'subscription', 'advertising', 'other'];

const platformRevenueSchema = new mongoose.Schema({
  // Business keys ("invoice:<id>", "order:<id>:commission") keep retries idempotent.
  reference: { type: String, required: true, unique: true, trim: true },
  source: { type: String, enum: REVENUE_SOURCES, default: 'other' },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'TZS' },
  description: { type: String, default: '', maxlength: 500 },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  occurredAt: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

platformRevenueSchema.index({ source: 1, occurredAt: -1 });
platformRevenueSchema.index({ occurredAt: -1 });

module.exports = mongoose.model('PlatformRevenue', platformRevenueSchema);
module.exports.REVENUE_SOURCES = REVENUE_SOURCES;
