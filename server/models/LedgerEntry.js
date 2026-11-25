const mongoose = require('mongoose');

const ledgerEntrySchema = new mongoose.Schema({
  // Unique per business event so retries and duplicate webhooks cannot post twice.
  reference: { type: String, required: true, unique: true },
  type: { type: String, enum: ['payment', 'refund', 'adjustment'], required: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'TZS' },
  transactionId: { type: String, default: '' },
  provider: { type: String, default: '' },
  orderType: { type: String, enum: ['order', 'input', 'booking', 'training', ''], default: '' },
  orderId: { type: mongoose.Schema.Types.ObjectId, default: null },
  payer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  payee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reason: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

ledgerEntrySchema.index({ type: 1, createdAt: -1 });
ledgerEntrySchema.index({ orderId: 1 });
ledgerEntrySchema.index({ transactionId: 1 });

module.exports = mongoose.model('LedgerEntry', ledgerEntrySchema);
