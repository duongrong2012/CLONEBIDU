const mongoose = require('mongoose');
const { AppError } = require('../Utils/error.utils');
const OrderModel = require('../Models/order.model');
const PaymentTransactionModel = require('../Models/payment-transaction.model');
const {
  PAYMENT_STATUS,
  PAYMENT_PROVIDER,
  ORDER_STATUS,
  PAYMENT_FAILURE_REASON,
  PAYMENT_TIME_LIMIT_MINUTES,
} = require('../Utils/constant');
const sepayProvider = require('../paymentProviders/sepay.provider');

const providers = {
  [PAYMENT_PROVIDER.SEPAY]: sepayProvider,
};

class PaymentService {
  resolveProvider(provider) {
    const instance = providers[provider];
    if (!instance) {
      throw new AppError('Validation failed', 400, [
        { field: 'paymentProvider', message: `Unsupported payment provider: ${provider}` },
      ]);
    }
    return instance;
  }

  async initiatePayment({ order }) {
    // Check payment window expiry
    if (Number.isFinite(PAYMENT_TIME_LIMIT_MINUTES)) {
      const deadline = new Date(order.createdAt.getTime() + PAYMENT_TIME_LIMIT_MINUTES * 60 * 1000);
      if (new Date() > deadline) {
        throw new AppError('Validation failed', 400, [
          { field: 'order', message: 'Payment time window expired. Please create a new order.' },
        ]);
      }
    }

    const provider = this.resolveProvider(order.paymentProvider);

    const initResult = await provider.initiatePayment({ order });

    return {
      orderId: order._id,
      paymentUrl: initResult.paymentUrl,
      qrData: initResult.qrData,
      providerOrderCode: initResult.providerOrderCode,
      providerPayload: initResult.providerPayload,
      paymentMethod: order.paymentMethod,
      paymentProvider: order.paymentProvider,
    };
  }

  async handleSepayWebhook({ body }) {
    const provider = this.resolveProvider(PAYMENT_PROVIDER.SEPAY);
    const verified = await provider.verifyWebhook({ body });

    // If providerTransactionId already exists, acknowledge and stop further processing
    if (verified.providerTransactionId) {
      const existed = await PaymentTransactionModel.findOne({
        provider: PAYMENT_PROVIDER.SEPAY,
        providerTransactionId: verified.providerTransactionId,
      })
        .select('_id')
        .lean()
        .exec();
      if (existed) {
        return; // Controller will still return 200
      }
    }

    // Extract order from providerOrderCode (DH{orderId})
    const orderId = String(verified.providerOrderCode || '').slice(2);
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError('Validation failed', 400, [
        { field: 'providerOrderCode', message: 'Invalid provider order code' },
      ]);
    }

    const order = await OrderModel.findById(orderId).exec();
    if (!order) {
      throw new AppError('Validation failed', 404, [
        { field: 'order', message: 'Order not found for this transaction' },
      ]);
    }

    const orderAlreadyPaid = order.paymentStatus === PAYMENT_STATUS.PAID;

    // Determine final status & reason, then create a new transaction record
    const receivedAmount =
      typeof verified.receivedAmount === 'number' ? verified.receivedAmount : null;
    let finalStatus = verified.status;
    let failureReason = null;

    // If order already PAID, do not accept further payments
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      finalStatus = PAYMENT_STATUS.FAILED;
      failureReason = PAYMENT_FAILURE_REASON.ORDER_ALREADY_PAID;
    }

    // Amount must match
    if (finalStatus === PAYMENT_STATUS.PAID && receivedAmount != null) {
      const requiredAmount = Math.max(0, Math.round(Number(order.totalPrice) || 0));
      if (receivedAmount !== requiredAmount) {
        finalStatus = PAYMENT_STATUS.FAILED;
        failureReason = PAYMENT_FAILURE_REASON.AMOUNT_MISMATCH;
      }
    }

    // Must be within time window
    if (finalStatus === PAYMENT_STATUS.PAID && Number.isFinite(PAYMENT_TIME_LIMIT_MINUTES)) {
      const deadline = new Date(order.createdAt.getTime() + PAYMENT_TIME_LIMIT_MINUTES * 60 * 1000);
      if (new Date() > deadline) {
        finalStatus = PAYMENT_STATUS.FAILED;
        failureReason = PAYMENT_FAILURE_REASON.PAYMENT_WINDOW_EXPIRED;
      }
    }

    // Upsert per providerTransactionId (idempotency), otherwise create new
    const baseDoc = {
      order: order._id,
      user: order.user,
      provider: PAYMENT_PROVIDER.SEPAY,
      amount: order.totalPrice,
      currency: 'VND',
      providerOrderCode: verified.providerOrderCode,
    };

    await PaymentTransactionModel.create({
      ...baseDoc,
      status: finalStatus,
      actualReceivedAmount: receivedAmount ?? null,
      providerResponse: verified.raw,
      failureReason,
      providerTransactionId: verified.providerTransactionId || null,
    });

    const update = {};

    // Only update order fields when the order has not been paid yet.
    if (!orderAlreadyPaid) {
      update.paymentStatus = finalStatus;
      if (finalStatus === PAYMENT_STATUS.PAID) {
        update.status = ORDER_STATUS.PAID;
        update.paidAt = new Date();
        update.paymentProvider = PAYMENT_PROVIDER.SEPAY;
        update.paymentReference = verified.providerTransactionId;
      }

      if (
        finalStatus === PAYMENT_STATUS.FAILED ||
        finalStatus === PAYMENT_STATUS.CANCELLED ||
        finalStatus === PAYMENT_STATUS.EXPIRED
      ) {
        update.paymentProvider = PAYMENT_PROVIDER.SEPAY;
      }
    }

    if (Object.keys(update).length > 0) {
      await OrderModel.findByIdAndUpdate(order._id, update);
    }
  }

  async getPaymentStatus({ orderId, userId, isAdmin }) {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new AppError('Validation failed', 400, [
        { field: 'orderId', message: 'orderId must be a valid MongoId' },
      ]);
    }

    const order = await OrderModel.findById(orderId).lean();
    if (!order || (!isAdmin && String(order.user) !== String(userId))) {
      throw new AppError('Validation failed', 404, [
        { field: 'orderId', message: 'Order not found' },
      ]);
    }

    return {
      status: order.paymentStatus,
      paymentProvider: order.paymentProvider,
      paymentReference: order.paymentReference,
      paidAt: order.paidAt,
    };
  }
}

module.exports = new PaymentService();
