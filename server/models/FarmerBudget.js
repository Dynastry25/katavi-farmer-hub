const mongoose = require('mongoose');
const { EXPENSE_CATEGORIES } = require('../services/financePlan.service');

const farmerBudgetSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
  items: [{
    category: { type: String, enum: EXPENSE_CATEGORIES, default: 'other' },
    amount: { type: Number, default: 0, min: 0 },
  }],
  note: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });

farmerBudgetSchema.index({ user: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('FarmerBudget', farmerBudgetSchema);
