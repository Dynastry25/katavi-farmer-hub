const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName: { type: String, default: '' },
  userRole: { type: String, default: '' },
  action: { type: String, required: true },
  category: {
    type: String,
    enum: [
      'user', 'product', 'order', 'payment', 'booking', 'transport', 'warehouse',
      'farm', 'employment', 'loan', 'content', 'settings', 'system', 'auth',
    ],
    default: 'system',
  },
  targetType: { type: String, default: '' },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
}, { timestamps: true });

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
