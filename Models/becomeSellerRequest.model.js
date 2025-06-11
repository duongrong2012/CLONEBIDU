const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const { SELLER_REQUEST_STATUS } = require('../Utils/constant');
/**
 * Schema for seller registration requests
 * Contains all necessary information for becoming a seller
 */
const becomeSellerRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(SELLER_REQUEST_STATUS),
      default: SELLER_REQUEST_STATUS.PENDING,
    },
    rejectReason: {
      type: String,
      default: null,
    },
    birthday: {
      type: Date,
      required: true,
    },
    identityNumber: {
      type: String,
      required: true,
    },
    bankName: {
      type: String,
      required: true,
    },
    bankBranch: {
      type: String,
      required: true,
    },
    taxCode: {
      type: String,
    },
    national: {
      type: String,
      required: true,
    },
    shop: {
      type: String,
      required: true,
    },
    shopName: {
      type: String,
      required: true,
    },
    isCompanyRegistered: {
      type: Boolean,
      default: false,
    },
    address: {
      type: String,
      required: true,
    },
    province: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    ward: {
      type: String,
      required: true,
    },
    currentDigitalPlatforms: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Add pagination plugin
becomeSellerRequestSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('BecomeSellerRequest', becomeSellerRequestSchema);
