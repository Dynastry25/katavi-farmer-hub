const mongoose = require('mongoose');

const platformSettingSchema = new mongoose.Schema({
  key: { type: String, default: 'platform', unique: true },
  commissionRate: { type: Number, default: 5, min: 0, max: 100 },
  featuredListingsEnabled: { type: Boolean, default: true },
  bannerMessage: { type: String, default: '' },
  bannerActive: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);