const mongoose = require('mongoose');

const syncMutationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: String, required: true, trim: true, maxlength: 80 },
  kind: { type: String, enum: ['expense', 'debt'], required: true },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['applied', 'failed'], default: 'applied' },
  resourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
  error: { type: String, default: '', maxlength: 500 },
  appliedAt: { type: Date, default: Date.now },
}, { timestamps: true });

syncMutationSchema.index({ user: 1, clientId: 1 }, { unique: true });
syncMutationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SyncMutation', syncMutationSchema);
