const mongoose = require('mongoose');

const BOOKING_STATUSES = [
  'requested',
  'quoted',
  'accepted',
  'in_progress',
  'completed',
  'confirmed',
  'cancelled',
  'declined',
];

const serviceBookingSchema = new mongoose.Schema({
  offer: { type: mongoose.Schema.Types.ObjectId, ref: 'FarmServiceOffer', required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerName: { type: String, required: true, trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true, trim: true },
  // Snapshots so the booking still makes sense if the offer is edited later.
  title: { type: String, required: true, trim: true, maxlength: 160 },
  serviceType: { type: String, default: 'other' },
  scheduledDate: { type: Date, default: null },
  location: { type: String, default: '', maxlength: 300 },
  acres: { type: Number, default: 0, min: 0 },
  notes: { type: String, default: '', maxlength: 1000 },
  estimatedAmount: { type: Number, default: 0, min: 0 },
  quotedAmount: { type: Number, default: 0, min: 0 },
  quoteNote: { type: String, default: '', maxlength: 500 },
  totalAmount: { type: Number, default: 0, min: 0 },
  paymentMethod: { type: String, enum: ['cash', 'mm'], default: 'cash' },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'processing', 'paid', 'failed', 'refunded'],
    default: 'unpaid',
  },
  paymentProvider: { type: String, default: '' },
  paymentTransactionId: { type: String, default: '' },
  paymentAmount: { type: Number, default: 0 },
  paymentInitiatedAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  refundReference: { type: String, default: '' },
  status: { type: String, enum: BOOKING_STATUSES, default: 'requested' },
  completedAt: { type: Date, default: null },
  confirmedAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: '', maxlength: 300 },
  customerRating: { type: Number, default: 0, min: 0, max: 5 },
  providerRating: { type: Number, default: 0, min: 0, max: 5 },
}, { timestamps: true });

serviceBookingSchema.index({ customer: 1, createdAt: -1 });
serviceBookingSchema.index({ provider: 1, createdAt: -1 });
serviceBookingSchema.index({ paymentTransactionId: 1 });
serviceBookingSchema.index({ status: 1, scheduledDate: 1 });

module.exports = mongoose.model('ServiceBooking', serviceBookingSchema);
module.exports.BOOKING_STATUSES = BOOKING_STATUSES;
