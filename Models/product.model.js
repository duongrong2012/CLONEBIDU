const mongoose = require('mongoose');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');

/**
 * Product Schema
 * Represents a product in the system with all attributes, images, categories, and dynamic metadata.
 */
const ProductSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    discountPrice: {
      type: Number,
    },
    images: [
      {
        type: String, // URL of image
      },
    ],
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Dynamic attributes like size, color, brand, etc.
    },
    totalRating: {
      type: Number,
      default: 0,
    },
    totalRatingPoints: {
      type: Number,
      default: 0,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // Always required to know who created the product
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Pre-save hook to auto-generate slug from name and uuid if not provided
 */
ProductSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    const baseSlug = slugify(this.name, {
      lower: true,
      strict: true,
      locale: 'vi',
    });
    this.slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;
  }
  next();
});

/**
 * Create a text index on the name field for search (accent/case insensitive in the future)
 */
ProductSchema.index({ name: 'text' });

// Add pagination plugin
ProductSchema.plugin(require('mongoose-paginate-v2'));

module.exports = mongoose.model('Product', ProductSchema);
