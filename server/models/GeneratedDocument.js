const mongoose = require('mongoose');

const generatedDocumentSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, default: 'pdf', trim: true, maxlength: 60 },
  title: { type: String, default: '', maxlength: 200 },
  filename: { type: String, default: 'nyaraka.pdf', maxlength: 200 },
  mime: { type: String, default: 'application/pdf' },
  size: { type: Number, default: 0 },
  data: { type: Buffer, required: true },
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'JobTask', default: null },
}, { timestamps: true });

generatedDocumentSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('GeneratedDocument', generatedDocumentSchema);
