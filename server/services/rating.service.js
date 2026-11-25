const mongoose = require('mongoose');
const Rating = require('../models/Rating');
const User = require('../models/User');

const toObjectId = (value) => {
  if (!value) return value;
  return mongoose.isValidObjectId(value)
    ? new mongoose.Types.ObjectId(String(value))
    : value;
};

// User.rating mirrors the average of every rating the user received.
const recalcUserRating = async (userId) => {
  if (!userId) return null;
  const [agg] = await Rating.aggregate([
    { $match: { ratedUser: toObjectId(userId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (!agg) return null;
  const rating = Math.round(agg.avg * 10) / 10;
  await User.findByIdAndUpdate(userId, { rating });
  return { rating, reviews: agg.count };
};

module.exports = { recalcUserRating };
