const mongoose = require('mongoose');
const { PAYMENT_PROVIDER, PAYMENT_STATUS, PAYMENT_FAILURE_REASON } = require('../Utils/constant');

const PaymentTransactionSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      required: true,
    },
    providerOrderCode: {
      type: String,
      required: true,
    },
    providerTransactionId: {
      type: String,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      required: true,
      default: PAYMENT_STATUS.PENDING,
    },
    amount: {
      type: Number,
      required: true,
    },
    actualReceivedAmount: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: 'VND',
    },
    paymentUrl: {
      type: String,
    },
    qrData: {
      type: String,
    },
    providerPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    failureReason: {
      type: String,
      enum: Object.values(PAYMENT_FAILURE_REASON),
      default: null,
    },
    expiredAt: {
      type: Date,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Allow multiple transactions per providerOrderCode (e.g., multiple attempts)
PaymentTransactionSchema.index({ provider: 1 });

// Idempotency for webhook callbacks when providerTransactionId is provided
PaymentTransactionSchema.index(
  { provider: 1, providerTransactionId: 1 },
  { unique: true, sparse: true }
);

PaymentTransactionSchema.index({ user: 1, order: 1, status: 1 });

module.exports = mongoose.model('PaymentTransaction', PaymentTransactionSchema);
