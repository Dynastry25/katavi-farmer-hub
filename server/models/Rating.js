const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  raterName: { type: String, required: true },
  ratedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ratedProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Crop' },
  ratedTransportProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportProvider' },
  ratedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  ratedInputOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'InputOrder' },
  ratedServiceBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceBooking' },
  ratedApplication: { type: mongoose.Schema.Types.ObjectId, ref: 'OpportunityApplication' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  type: {
    type: String,
    enum: [
      'farmer_to_buyer',
      'buyer_to_farmer',
      'buyer_to_seller',
      'seller_to_buyer',
      'buyer_to_carrier',
      'seller_to_carrier',
      'customer_to_provider',
      'provider_to_customer',
      'employer_to_worker',
      'worker_to_employer',
      'product_review',
    ],
    default: 'buyer_to_farmer',
  },
}, { timestamps: true });

ratingSchema.index({ ratedUser: 1, createdAt: -1 });
ratingSchema.index({ ratedProduct: 1 });
ratingSchema.index({ ratedTransportProvider: 1 });
ratingSchema.index({ ratedServiceBooking: 1 });
ratingSchema.index({ ratedInputOrder: 1 });
ratingSchema.index({ ratedApplication: 1, type: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
