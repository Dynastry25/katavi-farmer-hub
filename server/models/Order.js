const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  crop: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop' },
  cropName: { type: String, required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  buyerName: { type: String, required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  farmerName: { type: String, default: '' },
  quantity: { type: String, required: true },
  price: { type: String, required: true },
  unit: { type: String, default: 'kg' },
  requestedQuantity: { type: Number, required: true, min: 1 },
  approvedQuantity: { type: Number, default: null },
  status: {
    type: String,
    enum: ['pending', 'approved', 'partially_approved', 'rejected', 'expired', 'disputed', 'delivered', 'completed', 'cancelled'],
    default: 'pending',
  },
  expiresAt: { type: Date, required: true },
  respondedAt: { type: Date, default: null },
  parentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  orderDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  deliveryDate: { type: String, default: '' },
  contact: { type: String, default: '' },
  resolution: { type: String, default: '' },
  options: { type: mongoose.Schema.Types.Mixed, default: {} },
  note: { type: String, default: '' },
  deliveryMethod: { type: String, default: 'self' },
  pickupLocation: { type: String, default: '' },
  deliveryLocation: { type: String, default: '' },
  deliveryFee: { type: Number, default: 0 },
  deliveryProviderName: { type: String, default: '' },
  deliveryVehicleType: { type: String, default: '' },
}, { timestamps: true });

orderSchema.index({ status: 1, expiresAt: 1 });
orderSchema.index({ parentOrder: 1 });

module.exports = mongoose.model('Order', orderSchema);
