const mongoose = require('mongoose');

const inputOrderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'InputProduct', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
  unit: { type: String, default: 'kilo' },
  image: { type: String, default: '' },
}, { _id: false });

const inputOrderSchema = new mongoose.Schema({
  items: [inputOrderItemSchema],
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: { type: String, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
  supplierName: { type: String, default: '' },
  itemsTotal: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  deliveryProviderName: { type: String, default: '' },
  deliveryVehicleType: { type: String, default: '' },
  totalAmount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'expired'],
    default: 'pending',
  },
  expiresAt: { type: Date, default: null },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'processing', 'paid', 'failed', 'refunded'],
    default: 'unpaid',
  },
  paymentMethod: {
    type: String,
    enum: ['mm', 'cod', 'bank'],
    default: 'cod',
  },
  paymentTransactionId: { type: String, default: '' },
  paymentProvider: { type: String, default: '' },
  // Amount actually charged (kept after the order changes so refunds match).
  paymentAmount: { type: Number, default: 0 },
  paidAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  refundReference: { type: String, default: '' },
  receivedAt: { type: Date, default: null },
  respondedAt: { type: Date, default: null },
  cancelReason: { type: String, default: '' },
  cancelledAt: { type: Date, default: null },
  deliveryMethod: { type: String, enum: ['pickup', 'delivery'], default: 'pickup' },
  pickupLocation: { type: String, default: '' },
  deliveryLocation: { type: String, default: '' },
  deliveryProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransportProvider',
    default: null,
  },
  // requested: seller has not confirmed yet · pending: carrier may accept ·
  // accepted / in_transit / delivered: carrier moved the job forward ·
  // rejected / cancelled: nobody is moving the goods.
  deliveryStatus: {
    type: String,
    enum: ['none', 'requested', 'pending', 'accepted', 'in_transit', 'delivered', 'rejected', 'cancelled'],
    default: 'none',
  },
  deliveryAcceptedAt: { type: Date, default: null },
  deliveryRejectedReason: { type: String, default: '' },
  deliveryLat: { type: Number, default: null },
  deliveryLng: { type: Number, default: null },
  deliveryLocationAt: { type: Date, default: null },
  contact: { type: String, default: '' },
  notes: { type: String, default: '' },
}, { timestamps: true });

inputOrderSchema.index({ buyer: 1, createdAt: -1 });
inputOrderSchema.index({ status: 1 });
inputOrderSchema.index({ status: 1, expiresAt: 1 });
inputOrderSchema.index({ deliveryProvider: 1, deliveryStatus: 1, createdAt: -1 });
inputOrderSchema.index({ 'items.product': 1, createdAt: -1 });
inputOrderSchema.index({ supplier: 1, createdAt: -1 });

module.exports = mongoose.model('InputOrder', inputOrderSchema);
