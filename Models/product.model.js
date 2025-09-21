const mongoose = require('mongoose');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');
const { PRODUCT_STATUS } = require('../Utils/constant');
const {
  validateVariantModelInput,
  validateSkuPayloadUniqueness,
  checkSkuUniquePerSellerWithModel,
} = require('../Utils/variant.utils');

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
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.PENDING,
    },
    rejectedReason: {
      type: String,
      trim: true,
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
    // Variant system
    // Define variant groups (e.g., Size, Color, RAM). Each group has a name and allowed option values.
    variantGroups: [
      {
        name: { type: String, required: true, trim: true },
        options: [
          {
            value: { type: String, required: true, trim: true },
          },
        ],
      },
    ],
    // Enumerate valid variant combinations. Each combination must include one option per group.
    // Used to control inventory per combination and explicit price overrides.
    variantCombinations: [
      {
        // Array of { groupName, optionValue } sized exactly as variantGroups length
        options: [
          {
            groupName: { type: String, required: true, trim: true },
            optionValue: { type: String, required: true, trim: true },
          },
        ],
        // Quantity available for this specific combination
        quantity: { type: Number, required: true, min: 0 },
        // Explicit price for this combination (required)
        price: { type: Number, required: true, min: 0 },
        // Optional discount price for this combination (must be <= price when provided)
        discountPrice: { type: Number },
        // Optional image URL for this specific variant combination
        image: { type: String, trim: true },
        // Optional SKU for inventory; uppercase automatically; unique per seller is validated in pre-save
        sku: { type: String, uppercase: true, trim: true },
      },
    ],
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
ProductSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    const baseSlug = slugify(this.name, {
      lower: true,
      strict: true,
      locale: 'vi',
    });
    this.slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;
  }
  // Validate variant combinations consistency using shared helper to avoid duplication
  if (
    this.isNew ||
    this.isModified('variantGroups') ||
    this.isModified('variantCombinations') ||
    this.isModified('quantity')
  ) {
    const { valid, errors } = validateVariantModelInput({
      variantGroups: this.variantGroups,
      variantCombinations: this.variantCombinations,
      productQuantity: this.quantity,
    });
    if (!valid) {
      return next(new Error(errors.join('; ')));
    }
    // Enforce SKU rules using utils
    const combos = Array.isArray(this.variantCombinations) ? this.variantCombinations : [];
    const { valid: skuValid, errors: skuErrors, skus } = validateSkuPayloadUniqueness(combos);
    if (!skuValid) return next(new Error(skuErrors.join('; ')));
    // Check uniqueness per seller (across all products of the same creator)
    if (skus.length > 0) {
      const { ok } = await checkSkuUniquePerSellerWithModel(
        this.constructor,
        this.createdBy,
        skus,
        this._id
      );
      if (!ok) return next(new Error('SKU must be unique per seller'));
    }
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
