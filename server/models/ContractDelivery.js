const mongoose = require('mongoose');

const DELIVERY_STATUSES = ['pending', 'accepted', 'rejected'];
const DELIVERY_GRADES = ['A', 'B', 'C', 'mixed'];

const contractDeliverySchema = new mongoose.Schema({
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
  commitment: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractCommitment', required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmerName: { type: String, required: true, trim: true },
  quantityKg: { type: Number, required: true, min: 0.1 },
  // Quality measured by the buyer on receipt; acceptedKg is set on review.
  rejectedKg: { type: Number, default: 0, min: 0 },
  acceptedKg: { type: Number, default: 0, min: 0 },
  moisturePct: { type: Number, default: null, min: 0, max: 100 },
  grade: { type: String, enum: DELIVERY_GRADES, default: 'mixed' },
  photoUrls: { type: [String], default: [] },
  batchRef: { type: String, default: '', maxlength: 60 },
  notes: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: DELIVERY_STATUSES, default: 'pending' },
  reviewedAt: { type: Date, default: null },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

contractDeliverySchema.index({ contract: 1, createdAt: -1 });
contractDeliverySchema.index({ commitment: 1, createdAt: -1 });
contractDeliverySchema.index({ farmer: 1, createdAt: -1 });
contractDeliverySchema.index({ batchRef: 1 });

module.exports = mongoose.model('ContractDelivery', contractDeliverySchema);
module.exports.DELIVERY_STATUSES = DELIVERY_STATUSES;
module.exports.DELIVERY_GRADES = DELIVERY_GRADES;
