const mongoose = require('mongoose');
const { Schema } = mongoose;

const TransportProviderSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  vehicleType: { type: String, default: 'lorry' },
  ratePerKm: { type: Number, default: 0 },
  capacityKg: { type: Number, default: 0 },
  vehiclePlate: { type: String, default: '' },
  description: { type: String, default: '' },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
}, { timestamps: true });

TransportProviderSchema.index({ owner: 1 });
TransportProviderSchema.index({ available: 1, createdAt: -1 });

const TransportBookingSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  transportProvider: { type: Schema.Types.ObjectId, ref: 'TransportProvider' },
  transportProviderName: { type: String, default: '' },
  pickupLocation: { type: String, required: true },
  dropoffLocation: { type: String, required: true },
  goodsType: { type: String, default: '' },
  distanceKm: { type: Number, default: 0 },
  weightKg: { type: Number, default: 0 },
  ratePerKm: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  scheduledDate: { type: Date, default: null },
  trackingCode: { type: String, default: '' },
  status: { type: String, default: 'pending' },
  notes: { type: String, default: '' },
  cancelledAt: { type: Date, default: null },
  cancelReason: { type: String, default: '' },
  carrierRating: { type: Number, default: 0, min: 0, max: 5 },
}, { timestamps: true });

TransportBookingSchema.index({ user: 1, createdAt: -1 });
TransportBookingSchema.index({ transportProvider: 1, status: 1, createdAt: -1 });
TransportBookingSchema.index({ trackingCode: 1 }, { unique: true, sparse: true });

module.exports = {
  TransportProvider: mongoose.model('TransportProvider', TransportProviderSchema),
  TransportBooking: mongoose.model('TransportBooking', TransportBookingSchema),
};
