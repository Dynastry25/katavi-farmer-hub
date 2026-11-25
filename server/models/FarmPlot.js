const mongoose = require('mongoose');
const { SOIL_TYPES } = require('./Farm');

const farmPlotSchema = new mongoose.Schema({
  farm: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  sizeAcres: { type: Number, default: 0, min: 0, max: 100000 },
  soilType: {
    type: String,
    enum: ['', ...SOIL_TYPES],
    default: '',
  },
  notes: { type: String, default: '', maxlength: 500 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

farmPlotSchema.index({ farm: 1, isActive: 1 });
farmPlotSchema.index({ user: 1 });

module.exports = mongoose.model('FarmPlot', farmPlotSchema);
