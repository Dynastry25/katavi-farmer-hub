const mongoose = require('mongoose');

const BULK_STATUSES = ['open', 'fulfilled', 'closed', 'expired', 'cancelled'];

// A buyer posts how much of a crop they need; farmers commit quantities
// against it until the target is reached.
const bulkRequestSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerName: { type: String, required: true, trim: true },
  cropName: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, default: '', trim: true },
  district: { type: String, required: true, trim: true, maxlength: 80 },
  quantityKg: { type: Number, required: true, min: 1 },
  pricePerKg: { type: Number, default: 0, min: 0 },
  deadline: { type: Date, required: true },
  contact: { type: String, default: '', trim: true, maxlength: 60 },
  notes: { type: String, default: '', maxlength: 500 },
  // Denormalised totals kept in sync with committed BulkCommitment rows.
  committedKg: { type: Number, default: 0, min: 0 },
  commitmentCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: BULK_STATUSES, default: 'open' },
  fulfilledAt: { type: Date, default: null },
  closedAt: { type: Date, default: null },
  cancelReason: { type: String, default: '', maxlength: 300 },
}, { timestamps: true });

bulkRequestSchema.index({ status: 1, deadline: 1 });
bulkRequestSchema.index({ district: 1, cropName: 1, status: 1 });
bulkRequestSchema.index({ buyer: 1, createdAt: -1 });

const BULK_COMMITMENT_STATUSES = ['committed', 'withdrawn'];

const bulkCommitmentSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'BulkRequest', required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  farmerName: { type: String, default: '', trim: true },
  crop: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', default: null },
  quantityKg: { type: Number, required: true, min: 1 },
  // Price frozen at commit time in case the buyer edits the request later.
  pricePerKg: { type: Number, default: 0, min: 0 },
  note: { type: String, default: '', maxlength: 300 },
  status: { type: String, enum: BULK_COMMITMENT_STATUSES, default: 'committed' },
  withdrawnAt: { type: Date, default: null },
}, { timestamps: true });

// One live commitment per farmer, but a withdrawn one may be re-committed.
bulkCommitmentSchema.index(
  { request: 1, farmer: 1 },
  { unique: true, partialFilterExpression: { status: 'committed' } },
);
bulkCommitmentSchema.index({ request: 1, status: 1 });
bulkCommitmentSchema.index({ farmer: 1, createdAt: -1 });

const BulkRequest = mongoose.model('BulkRequest', bulkRequestSchema);
const BulkCommitment = mongoose.model('BulkCommitment', bulkCommitmentSchema);

module.exports = { BulkRequest, BulkCommitment, BULK_STATUSES };
