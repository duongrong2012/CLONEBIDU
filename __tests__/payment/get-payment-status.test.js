/* eslint-env jest */
/* global jest */
const { describe, test, expect, beforeAll } = require('@jest/globals');

const request = require('supertest');

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
const {
  USER_ROLES,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  PAYMENT_PROVIDER,
} = require('../../Utils/constant');

setupInMemoryMongo();

describe('Payment API - Get payment status (GET /payments/orders/:orderId/status)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountPayments: true });
  });

  async function seedOrderForUser(user, overrides = {}) {
    return Order.create({
      user: user._id,
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
    const res = await request(app).get('/payments/orders/507f1f77bcf86cd799439011/status');
    expect(res.status).toBe(401);
  });

  test('400 when orderId is invalid', async () => {
    const user = await seedUser();
    await authAs(jwtUtils, user);
    const res = await request(app).get('/payments/orders/abc/status').set(authHeader());
    expectValidationError(res, { field: 'orderId' });
  });

  test('404 when order does not exist', async () => {
    const user = await seedUser();
    await authAs(jwtUtils, user);
    const res = await request(app)
      .get('/payments/orders/507f1f77bcf86cd799439011/status')
      .set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Validation failed');
  });

  test('404 when non-admin tries to access another user order', async () => {
    const owner = await seedUser();
    const otherUser = await seedUser();
    const order = await seedOrderForUser(owner);

    await authAs(jwtUtils, otherUser);
    const res = await request(app).get(`/payments/orders/${order._id}/status`).set(authHeader());

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Validation failed');
  });

  test('200 when user gets status of own order', async () => {
    const user = await seedUser({ role: USER_ROLES.BUYER });
    const order = await seedOrderForUser(user, {
      paymentStatus: PAYMENT_STATUS.PAID,
      paidAt: new Date(),
      paymentReference: 'txn-1',
    });

    await authAs(jwtUtils, user);
    const res = await request(app).get(`/payments/orders/${order._id}/status`).set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Order payment status retrieved successfully');
    expect(res.body.payload.status).toBe(PAYMENT_STATUS.PAID);
    expect(res.body.payload.paymentProvider).toBe(PAYMENT_PROVIDER.SEPAY);
    expect(res.body.payload.paymentReference).toBe('txn-1');
  });

  test('200 when admin gets status of another user order', async () => {
    const owner = await seedUser({ role: USER_ROLES.BUYER });
    const admin = await seedUser({ role: USER_ROLES.ADMIN });
    const order = await seedOrderForUser(owner);

    await authAs(jwtUtils, admin);
    const res = await request(app).get(`/payments/orders/${order._id}/status`).set(authHeader());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.status).toBe(PAYMENT_STATUS.PENDING);
  });
});
