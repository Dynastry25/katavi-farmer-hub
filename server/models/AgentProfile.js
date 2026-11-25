const mongoose = require('mongoose');

// A registered village/district agent. One profile per user; the profile is
// what commissions are attributed to and what fraud monitoring watches.
const agentProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  district: { type: String, default: '', trim: true },
  ward: { type: String, default: '', trim: true },
  villages: { type: String, default: '', maxlength: 300 },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  totalEarned: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

agentProfileSchema.index({ status: 1, district: 1 });

module.exports = mongoose.model('AgentProfile', agentProfileSchema);
