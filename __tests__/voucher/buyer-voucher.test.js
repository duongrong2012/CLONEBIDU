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

const Voucher = require('../../Models/voucher.model');

const {
  USER_ROLES,
  VOUCHER_STATUS,
  VOUCHER_TYPE,
  VOUCHER_SOURCE,
  VOUCHER_TARGET,
} = require('../../Utils/constant');

setupInMemoryMongo();

describe('Voucher API - Buyer (/buyer/vouchers)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountBuyer: true, mountAuth: false });
  });

  async function asBuyer() {
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    await authAs(jwtUtils, buyer);
    return buyer;
  }

  test('400 when invalid query param (type)', async () => {
    await asBuyer();
    const res = await request(app).get('/buyer/vouchers').set(authHeader()).query({ type: 'NOPE' });
    expectValidationError(res, { field: 'type', message: 'Type is invalid.' });
  });

  test('200 buyer get vouchers enforces active+approved and applicableUsers scope', async () => {
    const buyer = await asBuyer();
    const otherBuyer = await seedUser({ role: USER_ROLES.BUYER });

    await Voucher.create([
      // eligible: public/system, applicableUsers empty
      {
        code: 'BUY_ALL',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 1000,
        startDate: new Date('2030-01-01T00:00:00.000Z'),
        endDate: new Date('2030-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.APPROVED,
        isActive: true,
        isPublic: true,
        applicableUsers: [],
      },
      // eligible: user-scoped
      {
        code: 'BUY_ME',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 1000,
        startDate: new Date('2030-01-01T00:00:00.000Z'),
        endDate: new Date('2030-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.APPROVED,
        isActive: true,
        isPublic: false,
        applicableUsers: [buyer._id],
      },
      // excluded: belongs to other user
      {
        code: 'BUY_OTHER',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 1000,
        startDate: new Date('2030-01-01T00:00:00.000Z'),
        endDate: new Date('2030-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.APPROVED,
        isActive: true,
        isPublic: false,
        applicableUsers: [otherBuyer._id],
      },
      // excluded: inactive
      {
        code: 'BUY_INACTIVE',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 1000,
        startDate: new Date('2030-01-01T00:00:00.000Z'),
        endDate: new Date('2030-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.APPROVED,
        isActive: false,
        isPublic: true,
        applicableUsers: [],
      },
      // excluded: not approved
      {
        code: 'BUY_PENDING',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 1000,
        startDate: new Date('2030-01-01T00:00:00.000Z'),
        endDate: new Date('2030-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.PENDING,
        isActive: true,
        isPublic: true,
        applicableUsers: [],
      },
    ]);

    const res = await request(app).get('/buyer/vouchers').set(authHeader());
    expect(res.status).toBe(200);
    const codes = res.body.payload.data.map(v => v.code).sort();
    expect(codes).toEqual(['BUY_ALL', 'BUY_ME'].sort());
  });

  test('200 buyer get vouchers supports filters (code/source/date bounds)', async () => {
    await asBuyer();
    await Voucher.create([
      {
        code: 'FILTER_A',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 1000,
        startDate: new Date('2030-01-01T00:00:00.000Z'),
        endDate: new Date('2030-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.APPROVED,
        isActive: true,
        isPublic: true,
        applicableUsers: [],
      },
      {
        code: 'FILTER_B',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 1000,
        startDate: new Date('2035-01-01T00:00:00.000Z'),
        endDate: new Date('2035-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SHOP,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.APPROVED,
        isActive: true,
        isPublic: true,
        applicableUsers: [],
      },
    ]);

    const res = await request(app).get('/buyer/vouchers').set(authHeader()).query({
      code: 'FILTER_',
      source: 'SYSTEM',
      startDate: '2029-12-31T00:00:00.000Z',
      endDate: '2030-12-31T00:00:00.000Z',
    });

    expect(res.status).toBe(200);
    expect(res.body.payload.data.length).toBe(1);
    expect(res.body.payload.data[0].code).toBe('FILTER_A');
  });

  test('200 buyer get vouchers supports filters (type/target/isPublic/numbers)', async () => {
    await asBuyer();
    await Voucher.create([
      {
        code: 'NUM_MATCH',
        type: VOUCHER_TYPE.PERCENTAGE,
        target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
        discountValue: 10,
        maxDiscount: 5000,
        minOrderValue: 20000,
        startDate: new Date('2032-01-01T00:00:00.000Z'),
        endDate: new Date('2032-01-10T00:00:00.000Z'),
        quantity: 7,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.APPROVED,
        isActive: true,
        isPublic: false,
        applicableUsers: [],
      },
      {
        code: 'NUM_OTHER',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 999,
        maxDiscount: 0,
        minOrderValue: 0,
        startDate: new Date('2032-01-01T00:00:00.000Z'),
        endDate: new Date('2032-01-10T00:00:00.000Z'),
        quantity: 99,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.APPROVED,
        isActive: true,
        isPublic: true,
        applicableUsers: [],
      },
    ]);

    const res = await request(app).get('/buyer/vouchers').set(authHeader()).query({
      type: VOUCHER_TYPE.PERCENTAGE,
      target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
      isPublic: 'false',
      minOrderValue: 20000,
      maxDiscount: 5000,
      discountValue: 10,
      quantity: 7,
    });

    expect(res.status).toBe(200);
    expect(res.body.payload.data.map(v => v.code)).toEqual(['NUM_MATCH']);
  });
});
