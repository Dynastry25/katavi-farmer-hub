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
  // Status the order had when the dispute opened, so resolution can tell
  // whether stock was still reserved or already deducted.
  disputeFromStatus: { type: String, default: '' },
  cancelReason: { type: String, default: '' },
  cancelledAt: { type: Date, default: null },
  options: { type: mongoose.Schema.Types.Mixed, default: {} },
  note: { type: String, default: '' },
  deliveryMethod: { type: String, default: 'self' },
  pickupLocation: { type: String, default: '' },
  deliveryLocation: { type: String, default: '' },
  deliveryFee: { type: Number, default: 0 },
  deliveryProviderName: { type: String, default: '' },
  deliveryVehicleType: { type: String, default: '' },
  deliveryProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportProvider', default: null },
  // none: buyer collects · requested: waiting for the farmer's approval ·
  // pending: farmer approved, waiting for the transport provider ·
  // accepted / in_transit / delivered: carrier confirmed the job ·
  // rejected / cancelled: no carrier will move this order.
  deliveryStatus: {
    type: String,
    enum: ['none', 'requested', 'pending', 'accepted', 'in_transit', 'delivered', 'rejected', 'cancelled'],
    default: 'none',
  },
  deliveryAcceptedAt: { type: Date, default: null },
  deliveryRejectedReason: { type: String, default: '' },
  // Last known carrier position, pushed by the logistics app while on the road.
  deliveryLat: { type: Number, default: null },
  deliveryLng: { type: Number, default: null },
  deliveryLocationAt: { type: Date, default: null },
  paymentMethod: { type: String, enum: ['mm', 'cod', 'bank'], default: 'cod' },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'processing', 'paid', 'failed', 'refunded'],
    default: 'unpaid',
  },
  paymentProvider: { type: String, default: '' },
  paymentTransactionId: { type: String, default: '' },
  // Amount actually charged (kept after the order changes so refunds match).
  paymentAmount: { type: Number, default: 0 },
  paidAt: { type: Date, default: null },
  refundedAt: { type: Date, default: null },
  refundReference: { type: String, default: '' },
}, { timestamps: true });

// Amount payable by the buyer: accepted quantity × price + delivery fee.
orderSchema.virtual('totalAmount').get(function () {
  const approved = Number(this.approvedQuantity) || 0;
  const settled = ['approved', 'partially_approved', 'delivered', 'completed'].includes(this.status);
  const quantity = settled && approved > 0 ? approved : (Number(this.requestedQuantity) || 0);
  const price = Number(this.price) || 0;
  const fee = Number(this.deliveryFee) || 0;
  return Math.max(0, quantity * price + fee);
});

orderSchema.set('toJSON', { virtuals: true });
orderSchema.set('toObject', { virtuals: true });

orderSchema.index({ status: 1, expiresAt: 1 });
orderSchema.index({ parentOrder: 1 });
orderSchema.index({ deliveryProvider: 1, deliveryStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
