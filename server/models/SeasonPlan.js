const mongoose = require('mongoose');

const PLAN_STATUSES = ['draft', 'active', 'completed', 'cancelled'];

// A farmer's pre-season intention: what they plan to plant and the yield they
// expect, compared against buyer demand in the planning report.
const seasonPlanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, default: '', trim: true },
  season: { type: String, required: true, trim: true, maxlength: 20 },
  cropName: { type: String, required: true, trim: true, maxlength: 120 },
  district: { type: String, default: '', trim: true, maxlength: 80 },
  acres: { type: Number, default: 0, min: 0 },
  yieldPerAcreKg: { type: Number, default: 0, min: 0 },
  expectedYieldKg: { type: Number, default: 0, min: 0 },
  plantingDate: { type: Date, default: null },
  expectedHarvestDate: { type: Date, default: null },
  notes: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: PLAN_STATUSES, default: 'draft' },
}, { timestamps: true });

seasonPlanSchema.index({ season: 1, cropName: 1, status: 1 });
seasonPlanSchema.index({ user: 1, season: 1, createdAt: -1 });
seasonPlanSchema.index({ district: 1, season: 1 });

module.exports = mongoose.model('SeasonPlan', seasonPlanSchema);
module.exports.PLAN_STATUSES = PLAN_STATUSES;
