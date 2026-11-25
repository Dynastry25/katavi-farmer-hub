const mongoose = require('mongoose');

const PROCESSING_SERVICE_TYPES = [
  'milling',
  'drying',
  'packaging',
  'grading',
  'oil_pressing',
  'shelling',
  'other',
];

const OFFER_STATUSES = ['active', 'paused'];

const processingOfferSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerName: { type: String, default: '', trim: true },
  businessName: { type: String, required: true, trim: true, maxlength: 120 },
  serviceType: { type: String, enum: PROCESSING_SERVICE_TYPES, default: 'other' },
  crops: [{ type: String, trim: true }],
  description: { type: String, default: '', trim: true, maxlength: 1000 },
  location: { type: String, default: '', trim: true, maxlength: 200 },
  district: { type: String, default: '', trim: true, maxlength: 80 },
  pricePerKg: { type: Number, default: 0, min: 0 },
  minQuantityKg: { type: Number, default: 0, min: 0 },
  capacityKgPerDay: { type: Number, default: 0, min: 0 },
  turnaroundDays: { type: Number, default: 1, min: 0, max: 90 },
  contactPhone: { type: String, default: '', trim: true, maxlength: 30 },
  status: { type: String, enum: OFFER_STATUSES, default: 'active' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviews: { type: Number, default: 0, min: 0 },
}, { timestamps: true });

processingOfferSchema.index({ status: 1, serviceType: 1, district: 1 });
processingOfferSchema.index({ provider: 1, createdAt: -1 });

const BOOKING_STATUSES = ['requested', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled'];

// A farmer books a processing slot for a crop lot; the processor quotes the
// fee at booking time from the offer price.
const processingBookingSchema = new mongoose.Schema({
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessingOffer', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerName: { type: String, default: '', trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, default: '', trim: true },
  businessName: { type: String, default: '', trim: true },
  serviceType: { type: String, enum: PROCESSING_SERVICE_TYPES, default: 'other' },
  cropName: { type: String, required: true, trim: true, maxlength: 120 },
  quantityKg: { type: Number, required: true, min: 0.1 },
  expectedOutputKg: { type: Number, default: 0, min: 0 },
  pricePerKg: { type: Number, default: 0, min: 0 },
  feeAmount: { type: Number, default: 0, min: 0 },
  scheduledDate: { type: Date, default: null },
  status: { type: String, enum: BOOKING_STATUSES, default: 'requested' },
  notes: { type: String, default: '', maxlength: 500 },
  cancelReason: { type: String, default: '', maxlength: 300 },
  completedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  customerRating: { type: Number, default: 0, min: 0, max: 5 },
}, { timestamps: true });

processingBookingSchema.index({ customer: 1, createdAt: -1 });
processingBookingSchema.index({ provider: 1, status: 1, createdAt: -1 });
processingBookingSchema.index({ offer: 1, status: 1 });

const ProcessingOffer = mongoose.model('ProcessingOffer', processingOfferSchema);
const ProcessingBooking = mongoose.model('ProcessingBooking', processingBookingSchema);

module.exports = {
  ProcessingOffer,
  ProcessingBooking,
  PROCESSING_SERVICE_TYPES,
  OFFER_STATUSES,
  BOOKING_STATUSES,
};
