const mongoose = require('mongoose');

const COMMITMENT_STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn', 'completed'];

const contractCommitmentSchema = new mongoose.Schema({
  contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmerName: { type: String, required: true, trim: true },
  quantityKg: { type: Number, required: true, min: 1 },
  message: { type: String, default: '', maxlength: 1000 },
  status: { type: String, enum: COMMITMENT_STATUSES, default: 'pending' },
  deliveredKg: { type: Number, default: 0, min: 0 },
  acceptedAt: { type: Date, default: null },
  statusUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

contractCommitmentSchema.index({ contract: 1, farmer: 1 }, { unique: true });
contractCommitmentSchema.index({ farmer: 1, createdAt: -1 });
contractCommitmentSchema.index({ contract: 1, status: 1 });

module.exports = mongoose.model('ContractCommitment', contractCommitmentSchema);
module.exports.COMMITMENT_STATUSES = COMMITMENT_STATUSES;
