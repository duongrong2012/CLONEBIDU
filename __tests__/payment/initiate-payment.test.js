/* eslint-env jest */
/* global jest */
const { describe, test, expect, beforeAll } = require('@jest/globals');

const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const { createTestApp, setupInMemoryMongo } = require('../index');
const jwtUtils = require('../../Utils/jwt.utils');
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { expectValidationError } = require('../helpers/expect');
const Order = require('../../Models/order.model');
const sepayProvider = require('../../paymentProviders/sepay.provider');
const {
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  ORDER_STATUS,
  PAYMENT_PROVIDER,
} = require('../../Utils/constant');

setupInMemoryMongo();

describe('Payment API - Initiate payment (POST /payments/orders/:orderId/initiate)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountPayments: true });
    // Ensure provider can generate QR in tests
    sepayProvider.accountNumber = '0903252427';
    sepayProvider.bankCode = 'MB';
    sepayProvider.accountName = 'TEST';
  });

  async function seedOrderForUser(user, overrides = {}) {
    return Order.create({
      user: user._id,
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

  test('401 when missing token', async () => {
    const res = await request(app).post('/payments/orders/507f1f77bcf86cd799439011/initiate');
    expect(res.status).toBe(401);
  });

  test('400 when orderId is invalid', async () => {
    const user = await seedUser();
    await authAs(jwtUtils, user);
    const res = await request(app).post('/payments/orders/abc/initiate').set(authHeader()).send({});

    expectValidationError(res, { field: 'orderId', message: 'orderId must be a valid MongoId' });
  });

  test('400 when order does not belong to user (Order not found)', async () => {
    const owner = await seedUser();
    const otherUser = await seedUser();
    const order = await seedOrderForUser(owner);

    await authAs(jwtUtils, otherUser);
    const res = await request(app)
      .post(`/payments/orders/${order._id}/initiate`)
      .set(authHeader())
      .send({});

    expectValidationError(res, { field: 'orderId', message: 'Order not found' });
  });

  test('400 when order is already paid', async () => {
    const user = await seedUser();
    const order = await seedOrderForUser(user, { paymentStatus: PAYMENT_STATUS.PAID });

    await authAs(jwtUtils, user);
    const res = await request(app)
      .post(`/payments/orders/${order._id}/initiate`)
      .set(authHeader())
      .send({});

    expectValidationError(res, { field: 'orderId', message: 'Order already paid' });
  });

  test('400 when order is cancelled', async () => {
    const user = await seedUser();
    const order = await seedOrderForUser(user, { status: ORDER_STATUS.CANCELLED });

    await authAs(jwtUtils, user);
    const res = await request(app)
      .post(`/payments/orders/${order._id}/initiate`)
      .set(authHeader())
      .send({});

    expectValidationError(res, { field: 'orderId', message: 'Cannot pay for a cancelled order' });
  });

  test('400 when paymentProvider is missing', async () => {
    const user = await seedUser();
    const order = await seedOrderForUser(user, { paymentProvider: null });

    await authAs(jwtUtils, user);
    const res = await request(app)
      .post(`/payments/orders/${order._id}/initiate`)
      .set(authHeader())
      .send({});

    expectValidationError(res, {
      field: 'orderId',
      message: 'Order does not have a payment provider configured',
    });
  });

  test('400 when paymentMethod is not ONLINE', async () => {
    const user = await seedUser();
    const order = await seedOrderForUser(user, { paymentMethod: PAYMENT_METHOD.COD });

    await authAs(jwtUtils, user);
    const res = await request(app)
      .post(`/payments/orders/${order._id}/initiate`)
      .set(authHeader())
      .send({});

    expectValidationError(res, {
      field: 'orderId',
      message: 'Order payment method must be ONLINE',
    });
  });

  test('400 when paymentProvider is unsupported (service resolveProvider)', async () => {
    const user = await seedUser();

    // Bypass Mongoose enum validation to simulate legacy/dirty data existing in DB.
    const orderId = new mongoose.Types.ObjectId();
    await Order.collection.insertOne({
      _id: orderId,
      user: user._id,
      status: ORDER_STATUS.PENDING,
      shippingAddress: { fullName: 'Test', address: 'Test', phone: '0123456789' },
      paymentMethod: PAYMENT_METHOD.ONLINE,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentProvider: 'UNSUPPORTED_PROVIDER',
      subtotal: 100000,
      totalPrice: 100000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await authAs(jwtUtils, user);
    const res = await request(app)
      .post(`/payments/orders/${orderId}/initiate`)
      .set(authHeader())
      .send({});

    expectValidationError(res, {
      field: 'paymentProvider',
      message: 'Unsupported payment provider: UNSUPPORTED_PROVIDER',
    });
  });

  test('400 when payment time window expired', async () => {
    const user = await seedUser();
    const order = await seedOrderForUser(user, {
      createdAt: new Date(Date.now() - 31 * 60 * 1000),
    });

    await authAs(jwtUtils, user);
    const res = await request(app)
      .post(`/payments/orders/${order._id}/initiate`)
      .set(authHeader())
      .send({});

    expectValidationError(res, {
      field: 'order',
      message: 'Payment time window expired. Please create a new order.',
    });
  });

  test('200 returns SEPAY QR/paymentUrl and provider payload', async () => {
    const user = await seedUser();
    const order = await seedOrderForUser(user, { totalPrice: 210000, subtotal: 210000 });

    await authAs(jwtUtils, user);
    const res = await request(app)
      .post(`/payments/orders/${order._id}/initiate`)
      .set(authHeader())
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Payment initiated successfully');
    expect(res.body.payload).toBeTruthy();
    expect(String(res.body.payload.orderId)).toBe(String(order._id));
    expect(res.body.payload.paymentProvider).toBe(PAYMENT_PROVIDER.SEPAY);
    expect(res.body.payload.paymentMethod).toBe(PAYMENT_METHOD.ONLINE);
    expect(typeof res.body.payload.paymentUrl).toBe('string');
    expect(String(res.body.payload.paymentUrl)).toContain('qr.sepay.vn');
    expect(String(res.body.payload.providerOrderCode)).toContain(`DH${String(order._id)}`);
    expect(res.body.payload.providerPayload).toBeTruthy();
    expect(res.body.payload.providerPayload.amount).toBe('210000');
  });
});
