const mongoose = require('mongoose');

const INVOICE_TYPES = ['service_fee', 'subscription', 'advertising', 'commission', 'other'];
const INVOICE_STATUSES = ['draft', 'issued', 'paid', 'void'];

const invoiceSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true, trim: true },
  type: { type: String, enum: INVOICE_TYPES, default: 'service_fee' },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  customerName: { type: String, required: true, trim: true, maxlength: 160 },
  customerEmail: { type: String, default: '', lowercase: true, trim: true, maxlength: 160 },
  lineItems: [{
    description: { type: String, required: true, trim: true, maxlength: 200 },
    quantity: { type: Number, default: 1, min: 0 },
    unitPrice: { type: Number, default: 0, min: 0 },
    amount: { type: Number, default: 0, min: 0 },
  }],
  subtotal: { type: Number, default: 0, min: 0 },
  taxRate: { type: Number, default: 0, min: 0, max: 100 },
  taxAmount: { type: Number, default: 0, min: 0 },
  totalAmount: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'TZS' },
  status: { type: String, enum: INVOICE_STATUSES, default: 'draft' },
  issuedAt: { type: Date, default: null },
  dueDate: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  voidedAt: { type: Date, default: null },
  notes: { type: String, default: '', maxlength: 1000 },
  paymentReference: { type: String, default: '', maxlength: 120 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

invoiceSchema.index({ customer: 1, createdAt: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
module.exports.INVOICE_TYPES = INVOICE_TYPES;
module.exports.INVOICE_STATUSES = INVOICE_STATUSES;
