const mongoose = require('mongoose');

const SERVICE_TYPES = [
  'land_prep',
  'ploughing',
  'harrowing',
  'planting',
  'spraying',
  'weeding',
  'harvesting',
  'threshing',
  'soil_testing',
  'agronomy',
  'transport',
  'other',
];

const PRICE_UNITS = ['per_acre', 'per_hour', 'per_day', 'per_trip', 'fixed'];
const OFFER_STATUSES = ['active', 'paused', 'closed'];

const farmServiceOfferSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerName: { type: String, required: true, trim: true },
  providerRole: { type: String, default: '' },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 2000 },
  serviceType: { type: String, enum: SERVICE_TYPES, default: 'other' },
  equipment: { type: String, default: '', maxlength: 300 },
  priceAmount: { type: Number, default: 0, min: 0 },
  priceUnit: { type: String, enum: PRICE_UNITS, default: 'per_acre' },
  district: { type: String, default: 'Katavi', trim: true },
  ward: { type: String, default: '', trim: true },
  villages: { type: String, default: '', maxlength: 300 },
  availability: { type: String, default: '', maxlength: 300 },
  status: { type: String, enum: OFFER_STATUSES, default: 'active' },
  completedBookings: { type: Number, default: 0, min: 0 },
  ratingSum: { type: Number, default: 0, min: 0 },
  ratingCount: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

farmServiceOfferSchema.index({ status: 1, serviceType: 1, createdAt: -1 });
farmServiceOfferSchema.index({ status: 1, district: 1 });
farmServiceOfferSchema.index({ provider: 1, createdAt: -1 });

module.exports = mongoose.model('FarmServiceOffer', farmServiceOfferSchema);
module.exports.SERVICE_TYPES = SERVICE_TYPES;
module.exports.PRICE_UNITS = PRICE_UNITS;
module.exports.OFFER_STATUSES = OFFER_STATUSES;
