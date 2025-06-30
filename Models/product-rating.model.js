const mongoose = require('mongoose');

/**
 * Product Rating Schema
 * Represents a user's rating and review for a product
 */
const ProductRatingSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      maxlength: 500,
      trim: true,
    },
    // Store all users who have rated this product
    ratedUsers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          maxlength: 500,
          trim: true,
        },
        ratedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

/**
 * Compound index to ensure one rating per user per product
 */
ProductRatingSchema.index({ product: 1, user: 1 }, { unique: true });

/**
 * Pre-save hook to validate rating value
 */
ProductRatingSchema.pre('save', function (next) {
  if (this.rating < 1 || this.rating > 5) {
    return next(new Error('Rating must be between 1 and 5'));
  }
  next();
});

module.exports = mongoose.model('ProductRating', ProductRatingSchema);
