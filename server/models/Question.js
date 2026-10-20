const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  body: { type: String, required: true, trim: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  authorName: { type: String, default: '' },
  authorRole: { type: String, default: 'expert' },
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, default: '' },
  category: { type: String, default: 'general' },
  image: { type: String, default: '' },
  asker: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  askerName: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'answered', 'closed'], default: 'pending' },
  views: { type: Number, default: 0 },
  answers: [answerSchema],
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
