const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  crop: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop', required: true },
}, { timestamps: true });

// A user can favourite a given crop only once.
favoriteSchema.index({ user: 1, crop: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
