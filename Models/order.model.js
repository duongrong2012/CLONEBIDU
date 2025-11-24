const mongoose = require('mongoose');
const {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_PROVIDER,
} = require('../Utils/constant');

/**
 * Order Schema
 * Represents a purchase order and links to order details
 */
const OrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    shippingAddress: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    paymentProvider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      default: null,
    },
    paymentReference: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    orderDetails: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderDetail',
      },
    ],
    voucherCode: {
      type: [String],
      default: [],
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    // Clone data from vouchers at the time of ordering
    voucher: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Order', OrderSchema);
