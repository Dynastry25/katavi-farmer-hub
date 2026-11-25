const mongoose = require('mongoose');

const TRAINING_CATEGORIES = [
  'crop_production',
  'livestock',
  'post_harvest',
  'business',
  'digital_skills',
  'agroforestry',
  'other',
];

const TRAINING_LEVELS = ['beginner', 'intermediate', 'advanced'];
const COURSE_STATUSES = ['draft', 'published', 'archived'];

const trainingCourseSchema = new mongoose.Schema({
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  providerName: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, required: true, trim: true, maxlength: 3000 },
  category: { type: String, enum: TRAINING_CATEGORIES, default: 'other' },
  level: { type: String, enum: TRAINING_LEVELS, default: 'beginner' },
  durationHours: { type: Number, default: 0, min: 0 },
  price: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'TZS' },
  district: { type: String, default: 'Katavi', trim: true },
  ward: { type: String, default: '', trim: true },
  online: { type: Boolean, default: true },
  startDate: { type: Date, default: null },
  endDate: { type: Date, default: null },
  coverImage: { type: String, default: '' },
  capacity: { type: Number, default: 0, min: 0 },
  enrolledCount: { type: Number, default: 0, min: 0 },
  completedCount: { type: Number, default: 0, min: 0 },
  status: { type: String, enum: COURSE_STATUSES, default: 'draft' },
}, { timestamps: true });

trainingCourseSchema.index({ status: 1, category: 1, createdAt: -1 });
trainingCourseSchema.index({ provider: 1, createdAt: -1 });
trainingCourseSchema.index({ status: 1, district: 1 });

module.exports = mongoose.model('TrainingCourse', trainingCourseSchema);
module.exports.TRAINING_CATEGORIES = TRAINING_CATEGORIES;
module.exports.TRAINING_LEVELS = TRAINING_LEVELS;
module.exports.COURSE_STATUSES = COURSE_STATUSES;
