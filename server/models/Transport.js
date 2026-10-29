const mongoose = require('mongoose');
const { Schema } = mongoose;

const TransportProviderSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  vehicleType: { type: String, default: 'lorry' },
  ratePerKm: { type: Number, default: 0 },
  vehiclePlate: { type: String, default: '' },
  description: { type: String, default: '' },
  averageRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  available: { type: Boolean, default: true },
}, { timestamps: true });

const TransportBookingSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  transportProvider: { type: Schema.Types.ObjectId, ref: 'TransportProvider' },
  transportProviderName: { type: String, default: '' },
  pickupLocation: { type: String, required: true },
  dropoffLocation: { type: String, required: true },
  distanceKm: { type: Number, default: 0 },
  ratePerKm: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  status: { type: String, default: 'pending' },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = {
  TransportProvider: mongoose.model('TransportProvider', TransportProviderSchema),
  TransportBooking: mongoose.model('TransportBooking', TransportBookingSchema),
};
