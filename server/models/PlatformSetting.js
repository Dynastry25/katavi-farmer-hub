const mongoose = require('mongoose');

const platformSettingSchema = new mongoose.Schema({
  key: { type: String, default: 'platform', unique: true },
  commissionRate: { type: Number, default: 5, min: 0, max: 100 },
  featuredListingsEnabled: { type: Boolean, default: true },
  bannerMessage: { type: String, default: '' },
  bannerImage: { type: String, default: '' },
  bannerActive: { type: Boolean, default: true },
  // Latest published Android release, used by the in-app update check.
  appVersion: { type: String, default: '0.1.0' },
  appBuildNumber: { type: Number, default: 2, min: 0 },
  appApkUrl: { type: String, default: '' },
  appReleaseNotes: { type: String, default: '' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PlatformSetting', platformSettingSchema);