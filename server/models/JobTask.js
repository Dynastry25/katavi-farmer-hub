const mongoose = require('mongoose');

const jobTaskSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true, maxlength: 60 },
  payload: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued' },
  attempts: { type: Number, default: 0, min: 0 },
  maxAttempts: { type: Number, default: 3, min: 1, max: 10 },
  lastError: { type: String, default: '', maxlength: 1000 },
  runAt: { type: Date, default: Date.now },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  result: { type: mongoose.Schema.Types.Mixed, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

jobTaskSchema.index({ status: 1, runAt: 1 });
jobTaskSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.model('JobTask', jobTaskSchema);
