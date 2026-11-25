const mongoose = require('mongoose');

const EVENT_TYPES = [
  'farmer_registration',
  'crop_listing',
  'completed_order',
  'group_training',
];

// Every commission row points at the real activity that earned it; the unique
// reference stops the same activity being paid twice.
const agentCommissionSchema = new mongoose.Schema({
  agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  agentCode: { type: String, default: '', uppercase: true },
  agentName: { type: String, default: '' },
  eventType: { type: String, enum: EVENT_TYPES, required: true },
  reference: { type: String, required: true, unique: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'TZS' },
  status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  notes: { type: String, default: '', maxlength: 500 },
  rejectionReason: { type: String, default: '', maxlength: 300 },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  payoutReference: { type: String, default: '', maxlength: 120 },
}, { timestamps: true });

agentCommissionSchema.index({ agent: 1, status: 1, createdAt: -1 });
agentCommissionSchema.index({ status: 1, createdAt: -1 });
agentCommissionSchema.index({ eventType: 1, createdAt: -1 });

module.exports = mongoose.model('AgentCommission', agentCommissionSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
