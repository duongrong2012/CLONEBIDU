const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { VOUCHER_STATUS, VOUCHER_TYPE, VOUCHER_SOURCE } = require('../Utils/constant');

/**
 * Voucher Schema
 * Represents a discount voucher with all applicable conditions and metadata
 * @property {String} code - Unique voucher code (uppercase, 3-20 chars, A-Z, 0-9, underscore, hyphen)
 * @property {String} type - Discount type: PERCENTAGE or FIXED
 * @property {Number} discountValue - Discount value (percentage or fixed amount)
 * @property {Number} maxDiscount - Maximum discount amount allowed (for percentage type)
 * @property {Number} minOrderValue - Minimum order value required to apply voucher
 * @property {Array<ObjectId>} applicableSellers - Sellers eligible for voucher
 * @property {Array<ObjectId>} applicableUsers - Users eligible for voucher
 * @property {Array<ObjectId>} applicableProducts - Products eligible for voucher
 * @property {Array<ObjectId>} applicableCategories - Categories eligible for voucher
 * @property {Date} startDate - Voucher start date
 * @property {Date} endDate - Voucher end date
 * @property {Number} quantity - Total available quantity of voucher
 * @property {Number} currentUsage - Current usage count
 * @property {Number} usageLimitPerUser - Usage limit per user
 * @property {String} description - Voucher description
 * @property {Boolean} isActive - Voucher activation status
 * @property {Boolean} isPublic - Whether voucher is public
 * @property {String} status - Voucher status: PENDING, APPROVED, REJECTED
 * @property {String} rejectReason - Reason for rejection
 * @property {String} source - Voucher source: SYSTEM (admin) or SHOP (seller)
 * @property {ObjectId} createdBy - User who created the voucher
 */
const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: Object.values(VOUCHER_TYPE),
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0.01,
    },
    maxDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },
    applicableSellers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // Only users with role 'seller' should be referenced here
      },
    ],
    applicableUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    currentUsage: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageLimitPerUser: {
      type: Number,
      default: 1,
      min: 1,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
      maxLength: 500,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(VOUCHER_STATUS),
      default: VOUCHER_STATUS.PENDING,
      required: true,
    },
    rejectReason: {
      type: String,
      trim: true,
      default: null,
    },
    source: {
      type: String,
      enum: Object.values(VOUCHER_SOURCE),
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add pagination plugin
voucherSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Voucher', voucherSchema);
