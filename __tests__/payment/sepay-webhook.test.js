/* eslint-env jest */
/* global jest */
const { describe, test, expect, beforeAll, beforeEach, afterEach } = require('@jest/globals');

const request = require('supertest');

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const { createTestApp, setupInMemoryMongo } = require('../index');
const Order = require('../../Models/order.model');
const PaymentTransaction = require('../../Models/payment-transaction.model');
const {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_PROVIDER,
  ORDER_STATUS,
  PAYMENT_FAILURE_REASON,
  PAYMENT_TIME_LIMIT_MINUTES,
} = require('../../Utils/constant');

setupInMemoryMongo();

describe('Payment API - Sepay webhook (POST /payments/sepay/webhook)', () => {
  let app;
  const originalEnv = { ...process.env };

  beforeAll(() => {
    app = createTestApp({ mountPayments: true });
  });

  beforeEach(() => {
    process.env.SEPAY_WEBHOOK_API_KEY = 'test-api-key';
    delete process.env.SEPAY_ALLOWED_IPS;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  async function seedOrder(overrides = {}) {
    return Order.create({
      user: '507f1f77bcf86cd799439011',
      status: ORDER_STATUS.PENDING,
      shippingAddress: { fullName: 'Test', address: 'Test', phone: '0123456789' },
      paymentMethod: PAYMENT_METHOD.ONLINE,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentProvider: PAYMENT_PROVIDER.SEPAY,
      subtotal: 100000,
      totalPrice: 100000,
      ...overrides,
    });
  }

  test('always 200 {success:true} even when missing SEPAY_WEBHOOK_API_KEY (soft-auth denies)', async () => {
    delete process.env.SEPAY_WEBHOOK_API_KEY;
    const order = await seedOrder();

    const res = await request(app)
      .post('/payments/sepay/webhook')
      .send({
        content: `DH${order._id}`,
        transferType: 'in',
        id: 'txn-1',
        transferAmount: order.totalPrice,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(await PaymentTransaction.countDocuments({})).toBe(0);
  });

  test('soft-auth denies when API key header is missing -> no side effects', async () => {
    const order = await seedOrder();
    const res = await request(app)
      .post('/payments/sepay/webhook')
      .send({
        content: `DH${order._id}`,
        transferType: 'in',
        id: 'txn-1',
        transferAmount: order.totalPrice,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(await PaymentTransaction.countDocuments({})).toBe(0);
  });

  test('soft-auth denies when IP not in whitelist -> no side effects', async () => {
    process.env.SEPAY_ALLOWED_IPS = '127.0.0.1';
    const order = await seedOrder();

    const res = await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .set('x-forwarded-for', '8.8.8.8')
      .send({
        content: `DH${order._id}`,
        transferType: 'in',
        id: 'txn-1',
        transferAmount: order.totalPrice,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(await PaymentTransaction.countDocuments({})).toBe(0);
  });

  test('soft-auth allows CIDR whitelist match', async () => {
    process.env.SEPAY_ALLOWED_IPS = '10.0.0.0/24';
    const order = await seedOrder();

    const res = await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .set('x-forwarded-for', '10.0.0.5')
      .send({
        content: `DH${order._id}`,
        transferType: 'in',
        id: 'txn-cidr',
        transferAmount: order.totalPrice,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(await PaymentTransaction.countDocuments({ providerTransactionId: 'txn-cidr' })).toBe(1);
  });

  test('valid inbound webhook marks order PAID and creates transaction', async () => {
    const order = await seedOrder({ totalPrice: 210000, subtotal: 210000 });

    const res = await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .send({
        content: `DH${order._id}`,
        transferType: 'in',
        id: 'txn-1',
        transferAmount: 210000,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const tx = await PaymentTransaction.findOne({ providerTransactionId: 'txn-1' }).lean();
    expect(tx).toBeTruthy();
    expect(tx.provider).toBe(PAYMENT_PROVIDER.SEPAY);
    expect(tx.status).toBe(PAYMENT_STATUS.PAID);

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder.paymentStatus).toBe(PAYMENT_STATUS.PAID);
    expect(updatedOrder.status).toBe(ORDER_STATUS.PAID);
    expect(updatedOrder.paymentProvider).toBe(PAYMENT_PROVIDER.SEPAY);
    expect(updatedOrder.paymentReference).toBe('txn-1');
    expect(updatedOrder.paidAt).toBeTruthy();
  });

  test('amount mismatch converts PAID to FAILED and updates order paymentStatus', async () => {
    const order = await seedOrder({ totalPrice: 210000, subtotal: 210000 });

    const res = await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .send({
        content: `DH${order._id}`,
        transferType: 'in',
        id: 'txn-2',
        transferAmount: 999999,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const tx = await PaymentTransaction.findOne({ providerTransactionId: 'txn-2' }).lean();
    expect(tx.status).toBe(PAYMENT_STATUS.FAILED);
    expect(tx.failureReason).toBe(PAYMENT_FAILURE_REASON.AMOUNT_MISMATCH);

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder.paymentStatus).toBe(PAYMENT_STATUS.FAILED);
    expect(updatedOrder.paymentProvider).toBe(PAYMENT_PROVIDER.SEPAY);
    expect(updatedOrder.status).toBe(ORDER_STATUS.PENDING);
  });

  test('outbound transaction treated as FAILED and updates order paymentStatus', async () => {
    const order = await seedOrder();

    const res = await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .send({
        content: `DH${order._id}`,
        transferType: 'out',
        id: 'txn-3',
        transferAmount: order.totalPrice,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const tx = await PaymentTransaction.findOne({ providerTransactionId: 'txn-3' }).lean();
    expect(tx.status).toBe(PAYMENT_STATUS.FAILED);

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder.paymentStatus).toBe(PAYMENT_STATUS.FAILED);
    expect(updatedOrder.paymentProvider).toBe(PAYMENT_PROVIDER.SEPAY);
  });

  test('if order already PAID, webhook still creates FAILED transaction but does not update order', async () => {
    const order = await seedOrder({
      paymentStatus: PAYMENT_STATUS.PAID,
      status: ORDER_STATUS.PAID,
      paidAt: new Date(),
      paymentReference: 'already',
    });

    const res = await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .send({
        content: `DH${order._id}`,
        transferType: 'in',
        id: 'txn-4',
        transferAmount: order.totalPrice,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const tx = await PaymentTransaction.findOne({ providerTransactionId: 'txn-4' }).lean();
    expect(tx.status).toBe(PAYMENT_STATUS.FAILED);
    expect(tx.failureReason).toBe(PAYMENT_FAILURE_REASON.ORDER_ALREADY_PAID);

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder.paymentStatus).toBe(PAYMENT_STATUS.PAID);
    expect(updatedOrder.paymentReference).toBe('already');
  });

  test('idempotency: same providerTransactionId only creates one transaction', async () => {
    const order = await seedOrder({ totalPrice: 210000, subtotal: 210000 });

    const payload = {
      content: `DH${order._id}`,
      transferType: 'in',
      id: 'txn-5',
      transferAmount: 210000,
    };

    await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .send(payload);

    await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .send(payload);

    expect(await PaymentTransaction.countDocuments({ providerTransactionId: 'txn-5' })).toBe(1);
  });

  test('order not found for valid providerOrderCode -> no side effects (service throws, controller ACK 200)', async () => {
    const res = await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .send({
        content: 'DH507f1f77bcf86cd799439011',
        transferType: 'in',
        id: 'txn-missing-order',
        transferAmount: 100000,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(
      await PaymentTransaction.countDocuments({ providerTransactionId: 'txn-missing-order' })
    ).toBe(0);
  });

  test('payment window expired converts PAID to FAILED with PAYMENT_WINDOW_EXPIRED', async () => {
    const minutes = Number.isFinite(PAYMENT_TIME_LIMIT_MINUTES) ? PAYMENT_TIME_LIMIT_MINUTES : 30;
    const order = await seedOrder({
      totalPrice: 210000,
      subtotal: 210000,
      createdAt: new Date(Date.now() - (minutes + 1) * 60 * 1000),
    });

    const res = await request(app)
      .post('/payments/sepay/webhook')
      .set('Authorization', `Apikey ${process.env.SEPAY_WEBHOOK_API_KEY}`)
      .send({
        content: `DH${order._id}`,
        transferType: 'in',
        id: 'txn-expired-window',
        transferAmount: 210000,
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const tx = await PaymentTransaction.findOne({
      providerTransactionId: 'txn-expired-window',
    }).lean();
    expect(tx).toBeTruthy();
    expect(tx.status).toBe(PAYMENT_STATUS.FAILED);
    expect(tx.failureReason).toBe(PAYMENT_FAILURE_REASON.PAYMENT_WINDOW_EXPIRED);

    const updatedOrder = await Order.findById(order._id).lean();
    expect(updatedOrder.paymentStatus).toBe(PAYMENT_STATUS.FAILED);
    expect(updatedOrder.status).toBe(ORDER_STATUS.PENDING);
  });
});
