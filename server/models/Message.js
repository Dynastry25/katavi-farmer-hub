const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  senderName: { type: String, default: '' },
  text: { type: String, default: '' },
  time: { type: String, default: '' },
  read: { type: Boolean, default: false },
  deliveredAt: { type: Date, default: null },
  readAt: { type: Date, default: null },
  type: { type: String, enum: ['text', 'file', 'system'], default: 'text' },
  fileName: { type: String, default: '' },
  fileSize: { type: String, default: '' },
  reaction: { type: String, default: '' },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
