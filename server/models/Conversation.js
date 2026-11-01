const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  participantNames: [{ type: String }],
  type: { type: String, enum: ['farmer', 'supplier', 'loan', 'group', 'expert'], default: 'farmer' },
  name: { type: String, default: '' },
  lastMessage: { type: String, default: '' },
  lastTime: { type: String, default: '' },
  unread: { type: Number, default: 0 },
  unreadBy: { type: Map, of: Number, default: {} },
  typingBy: { type: Map, of: Date, default: {} },
  online: { type: Boolean, default: false },
  avatar: { type: String, default: '💬' },
  members: { type: Number, default: 0 },
}, { timestamps: true });

conversationSchema.index({ participants: 1, updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
