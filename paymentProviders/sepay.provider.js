const { AppError } = require('../Utils/error.utils');
const { PAYMENT_STATUS } = require('../Utils/constant');

class SepayProvider {
  constructor() {
    this.qrBaseUrl = process.env.SEPAY_QR_BASE_URL || 'https://qr.sepay.vn/img';
    this.accountNumber = process.env.SEPAY_ACCOUNT_NUMBER;
    this.bankCode = process.env.SEPAY_BANK_CODE;
    this.accountName = process.env.SEPAY_ACCOUNT_NAME;
    this.template = process.env.SEPAY_QR_TEMPLATE || 'compact';
  }

  async initiatePayment({ order }) {
    if (!this.accountNumber || !this.bankCode) {
      throw new AppError('Validation failed', 500, [
        { field: 'sepay', message: 'SePay QR account configuration is missing' },
      ]);
    }

    const amount = Math.max(0, Math.round(Number(order.totalPrice) || 0));
    const transferContent = `DH${order._id}`;

    const queryParams = new URLSearchParams({
      acc: this.accountNumber,
      bank: this.bankCode,
      des: transferContent,
      amount: amount.toString(),
      template: this.template,
    });

    if (this.accountName) {
      queryParams.append('account_name', this.accountName);
    }

    const qrImageUrl = `${this.qrBaseUrl}?${queryParams.toString()}`;

    return {
      providerOrderCode: transferContent,
      paymentUrl: qrImageUrl,
      qrData: qrImageUrl,
      providerPayload: Object.fromEntries(queryParams.entries()),
      expiredAt: null,
    };
  }

  async verifyWebhook({ body }) {
    if (!body || typeof body !== 'object') {
      throw new AppError('Validation failed', 400, [
        { field: 'payload', message: 'Invalid webhook payload' },
      ]);
    }

    // SePay webhook payload fields reference:
    // gateway, transactionDate, accountNumber, subAccount, code, content,
    // transferType (in|out), transferAmount, accumulated, referenceCode, id, description

    const content = body.content;
    const transferType = body.transferType;

    if (typeof content !== 'string' || !content) {
      throw new AppError('Validation failed', 400, [
        { field: 'payload', message: 'Missing or invalid content in webhook payload' },
      ]);
    }

    // Extract providerOrderCode in format DH{orderId}
    const match = content.match(/DH([a-fA-F0-9]{24})/);
    if (!match) {
      throw new AppError('Validation failed', 400, [
        {
          field: 'payload',
          message: 'Transfer content does not contain valid provider order code',
        },
      ]);
    }

    const providerOrderCode = `DH${match[1]}`;

    // Consider inbound transactions as PAID
    const normalizedStatus = transferType === 'in' ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED;

    const providerTransactionId = body.id;

    const receivedAmount = Math.max(0, Math.round(Number(body.transferAmount) || 0));

    return {
      providerOrderCode,
      providerTransactionId,
      status: normalizedStatus,
      receivedAmount,
      raw: body,
    };
  }
}

module.exports = new SepayProvider();
