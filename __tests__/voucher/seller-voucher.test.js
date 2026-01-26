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
const { seedCategory, seedProduct } = require('../helpers/seed');

const Voucher = require('../../Models/voucher.model');

const {
  USER_ROLES,
  VOUCHER_STATUS,
  VOUCHER_TYPE,
  VOUCHER_SOURCE,
  VOUCHER_TARGET,
} = require('../../Utils/constant');

setupInMemoryMongo();

describe('Voucher API - Seller (/seller/vouchers)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountSeller: true, mountAuth: false });
  });

  async function asSeller() {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    await authAs(jwtUtils, seller);
    return seller;
  }

  function createBody(overrides = {}) {
    const start = overrides.startDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = overrides.endDate ?? new Date(Date.now() + 48 * 60 * 60 * 1000);
    return {
      code: overrides.code ?? `SHOP_${Date.now()}`,
      type: overrides.type ?? VOUCHER_TYPE.FIXED,
      target: overrides.target ?? VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: overrides.discountValue ?? 10000,
      startDate: start instanceof Date ? start.toISOString() : start,
      endDate: end instanceof Date ? end.toISOString() : end,
      quantity: overrides.quantity ?? 10,
      ...overrides,
    };
  }

  test('200 seller create voucher forces applicableSellers to self and source SHOP', async () => {
    const seller = await asSeller();
    const res = await request(app)
      .post('/seller/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'SELLER_V_1', isPublic: true }));

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.code).toBe('SELLER_V_1');
    expect(res.body.payload.source).toBe(VOUCHER_SOURCE.SHOP);
    expect(res.body.payload.status).toBe(VOUCHER_STATUS.PENDING);
    expect(Array.isArray(res.body.payload.applicableSellers)).toBe(true);
    expect(String(res.body.payload.applicableSellers[0])).toBe(String(seller._id));
  });

  test('200 seller create voucher trims description and accepts explicit isActive/isPublic', async () => {
    await asSeller();
    const res = await request(app)
      .post('/seller/vouchers')
      .set(authHeader())
      .send(
        createBody({
          code: 'SELLER_DESC_1',
          description: '  hi  ',
          isActive: false,
          isPublic: false,
        })
      );

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.code).toBe('SELLER_DESC_1');
    expect(res.body.payload.description).toBe('hi');
    expect(res.body.payload.isActive).toBe(false);
    expect(res.body.payload.isPublic).toBe(false);
  });

  test('200 seller create voucher uses default isActive/isPublic when omitted', async () => {
    await asSeller();
    const res = await request(app)
      .post('/seller/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'SELLER_DEFAULTS_1' }));

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.code).toBe('SELLER_DEFAULTS_1');
    expect(res.body.payload.isActive).toBe(true);
    expect(res.body.payload.isPublic).toBe(false);
  });

  test('400 seller create voucher when code missing (hits exists() message)', async () => {
    await asSeller();
    const body = createBody({ code: undefined });
    delete body.code;
    const res = await request(app).post('/seller/vouchers').set(authHeader()).send(body);
    expectValidationError(res, { field: 'code', message: 'Field code is required.' });
  });

  test('400 seller create rejects applicableSellers field from client', async () => {
    await asSeller();
    const res = await request(app)
      .post('/seller/vouchers')
      .set(authHeader())
      .send(
        createBody({
          code: 'SELLER_BAD',
          applicableSellers: [String(new mongoose.Types.ObjectId())],
        })
      );
    expectValidationError(res, {
      field: 'applicableSellers',
      message: 'Field applicableSellers is not allowed.',
    });
  });

  test('400 seller create voucher when applicableUsers contains non-string items (array type validation)', async () => {
    await asSeller();
    const res = await request(app)
      .post('/seller/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'SELLER_NONSTRING', applicableUsers: ['ok', 1] }));
    expectValidationError(res, {
      field: 'applicableUsers',
      message: 'Field applicableUsers must be an array of string (user ids).',
    });
  });

  test('400 seller create voucher when applicableUsers contains invalid ObjectId', async () => {
    await asSeller();
    const res = await request(app)
      .post('/seller/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'SELLER_BAD_OID', applicableUsers: ['not-an-objectid'] }));
    expectValidationError(res, {
      field: 'applicableUsers',
      message: 'Invalid ObjectId: not-an-objectid',
    });
  });

  test('400 seller create voucher when duplicate code check throws (db error path)', async () => {
    await asSeller();
    const spy = jest.spyOn(Voucher, 'findOne').mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await request(app)
        .post('/seller/vouchers')
        .set(authHeader())
        .send(createBody({ code: 'SELLER_DB_DOWN' }));
      expectValidationError(res, { field: 'code', message: 'db down' });
    } finally {
      spy.mockRestore();
    }
  });

  test('400 seller create voucher when duplicate code exists', async () => {
    await asSeller();
    await request(app)
      .post('/seller/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'SELLER_DUP_CODE' }));

    const res2 = await request(app)
      .post('/seller/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'SELLER_DUP_CODE' }));
    expectValidationError(res2, { field: 'code', message: 'Voucher code already exists' });
  });

  test('400 seller create voucher when referenced entities do not exist', async () => {
    await asSeller();
    const res = await request(app)
      .post('/seller/vouchers')
      .set(authHeader())
      .send(
        createBody({
          code: 'SELLER_MISS_ENTITY',
          applicableUsers: [String(new mongoose.Types.ObjectId())],
        })
      );
    expectValidationError(res, { field: 'applicableUsers', message: 'Some users do not exist' });
  });

  test('403 seller cannot update other seller voucher', async () => {
    const owner = await seedUser({ role: USER_ROLES.SELLER });
    const other = await asSeller();
    const v = await Voucher.create({
      code: 'OWNED_BY_OTHER',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: owner._id,
      status: VOUCHER_STATUS.PENDING,
      applicableSellers: [owner._id],
    });

    // Auth is set to "other" seller above; just call patch.
    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ isActive: false });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('You can only update your own vouchers');
    expect(String(other._id)).not.toBe(String(owner._id));
  });

  test('403 seller cannot update SYSTEM voucher even if createdBy matches (defensive)', async () => {
    const seller = await asSeller();
    const v = await Voucher.create({
      code: 'SYSTEM_BY_SELLER',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: seller._id,
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ isActive: false });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Only seller-created vouchers can be updated');
  });

  test('400 seller update voucher when already started: only isActive allowed', async () => {
    const seller = await asSeller();
    const v = await Voucher.create({
      code: 'STARTED_SHOP',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
      quantity: 1,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: seller._id,
      status: VOUCHER_STATUS.APPROVED,
      applicableSellers: [seller._id],
    });

    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ description: 'nope' });

    expectValidationError(res, {
      field: 'general',
      message:
        'Cannot update fields: description. Voucher has already started. Only isActive can be modified.',
    });
  });

  test('200 seller can update own voucher before start (covers updateVoucherSeller)', async () => {
    const seller = await asSeller();
    const v = await Voucher.create({
      code: 'UPD_SHOP_OK',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 7 * 86400000),
      endDate: new Date(Date.now() + 8 * 86400000),
      quantity: 1,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: seller._id,
      status: VOUCHER_STATUS.APPROVED,
      applicableSellers: [seller._id],
      isActive: true,
    });

    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.isActive).toBe(false);
  });

  test('200 seller update not-started voucher supports maxDiscount/minOrderValue/quantity and applicableUsers', async () => {
    const seller = await asSeller();
    const user = await seedUser({ role: USER_ROLES.BUYER });

    const v = await Voucher.create({
      code: 'SELLER_UPD_FIELDS',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 10 * 86400000),
      endDate: new Date(Date.now() + 11 * 86400000),
      quantity: 10,
      minOrderValue: 0,
      maxDiscount: 0,
      usageLimitPerUser: 1,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: seller._id,
      status: VOUCHER_STATUS.APPROVED,
      applicableSellers: [seller._id],
    });

    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({
        maxDiscount: 0,
        minOrderValue: 0,
        quantity: 5,
        usageLimitPerUser: 2,
        applicableUsers: [String(user._id)],
      });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.maxDiscount).toBe(0);
    expect(res.body.payload.minOrderValue).toBe(0);
    expect(res.body.payload.quantity).toBe(5);
    expect(res.body.payload.usageLimitPerUser).toBe(2);
    expect(res.body.payload.applicableUsers.map(String)).toEqual([String(user._id)]);
  });

  test('200 seller update not-started voucher can update type/target/discountValue/dates and applicableProducts/applicableCategories', async () => {
    const seller = await asSeller();
    const cat = await seedCategory('SellerUpdCat');
    const p = await seedProduct({ seller });

    const v = await Voucher.create({
      code: 'SELLER_UPD_PROD_CAT',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 10 * 86400000),
      endDate: new Date(Date.now() + 11 * 86400000),
      quantity: 10,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: seller._id,
      status: VOUCHER_STATUS.APPROVED,
      applicableSellers: [seller._id],
      isPublic: false,
    });

    const startDate = new Date(Date.now() + 20 * 86400000);
    const endDate = new Date(Date.now() + 21 * 86400000);

    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({
        type: VOUCHER_TYPE.PERCENTAGE,
        target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
        discountValue: 20,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        isPublic: true,
        applicableProducts: [String(p._id)],
        applicableCategories: [String(cat._id)],
      });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.type).toBe(VOUCHER_TYPE.PERCENTAGE);
    expect(res.body.payload.target).toBe(VOUCHER_TARGET.SHIPPING_DISCOUNT);
    expect(res.body.payload.discountValue).toBe(20);
    expect(res.body.payload.isPublic).toBe(true);
    expect(res.body.payload.applicableProducts.map(String)).toEqual([String(p._id)]);
    expect(res.body.payload.applicableCategories.map(String)).toEqual([String(cat._id)]);
  });

  test('404 seller update voucher when not found', async () => {
    await asSeller();
    const res = await request(app)
      .patch(`/seller/vouchers/${String(new mongoose.Types.ObjectId())}`)
      .set(authHeader())
      .send({ isActive: false });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Voucher not found');
  });

  test('500 seller update voucher when DB throws while finding voucher (covers catch)', async () => {
    await asSeller();
    const spy = jest.spyOn(Voucher, 'findById').mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await request(app)
        .patch(`/seller/vouchers/${String(new mongoose.Types.ObjectId())}`)
        .set(authHeader())
        .send({ isActive: false });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Error finding voucher');
    } finally {
      spy.mockRestore();
    }
  });

  test('400 seller update voucher when reference ObjectId format invalid (covers validateObjectIdFields return)', async () => {
    const seller = await asSeller();
    const v = await Voucher.create({
      code: 'BAD_OID_UPDATE',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: seller._id,
      status: VOUCHER_STATUS.PENDING,
      applicableSellers: [seller._id],
    });

    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ applicableUsers: ['not-an-objectid'] });

    expectValidationError(res, {
      field: 'applicableUsers',
      message: 'Invalid ObjectId: not-an-objectid',
    });
  });

  test('400 seller update voucher when referenced entities do not exist (covers validateEntityExistence return)', async () => {
    const seller = await asSeller();
    const v = await Voucher.create({
      code: 'MISSING_ENTITY_UPDATE',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: seller._id,
      status: VOUCHER_STATUS.PENDING,
      applicableSellers: [seller._id],
    });

    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ applicableUsers: [String(new mongoose.Types.ObjectId())] });

    expectValidationError(res, { field: 'applicableUsers', message: 'Some users do not exist' });
  });

  test('400 seller update voucher when voucher id format invalid', async () => {
    await asSeller();
    const res = await request(app)
      .patch('/seller/vouchers/not-an-id')
      .set(authHeader())
      .send({ isActive: false });
    expectValidationError(res, { field: 'id', message: 'Invalid voucher ID format.' });
  });

  test('400 seller update voucher when express-validator fails (discountValue must be positive)', async () => {
    const seller = await asSeller();
    const v = await Voucher.create({
      code: 'SELLER_UPD_NEG',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: seller._id,
      status: VOUCHER_STATUS.PENDING,
      applicableSellers: [seller._id],
    });

    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ discountValue: -1 });

    expectValidationError(res, {
      field: 'discountValue',
      message: 'Field discountValue must be a positive number.',
    });
  });

  test('400 seller update voucher when disallowed field present', async () => {
    const seller = await asSeller();
    const v = await Voucher.create({
      code: 'SELLER_UPD_DISALLOW',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: seller._id,
      status: VOUCHER_STATUS.PENDING,
      applicableSellers: [seller._id],
    });

    const res = await request(app)
      .patch(`/seller/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ status: VOUCHER_STATUS.APPROVED });
    expectValidationError(res, { field: 'status', message: 'Field status is not allowed.' });
  });

  test('200 seller get vouchers returns both SHOP and SYSTEM branches; filters by source when provided', async () => {
    const seller = await asSeller();

    const shopVoucher = await Voucher.create({
      code: 'SHOP_ONLY',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date('2030-01-01T00:00:00.000Z'),
      endDate: new Date('2030-01-10T00:00:00.000Z'),
      quantity: 10,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: seller._id,
      status: VOUCHER_STATUS.PENDING,
      applicableSellers: [seller._id],
      isActive: true,
    });
    const systemVoucher = await Voucher.create({
      code: 'SYS_FOR_SELLER',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date('2030-01-01T00:00:00.000Z'),
      endDate: new Date('2030-01-10T00:00:00.000Z'),
      quantity: 10,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.APPROVED,
      applicableSellers: [seller._id],
      isActive: true,
    });

    const resAll = await request(app).get('/seller/vouchers').set(authHeader());
    expect(resAll.status).toBe(200);
    const codesAll = resAll.body.payload.data.map(v => v.code).sort();
    expect(codesAll).toEqual(['SHOP_ONLY', 'SYS_FOR_SELLER'].sort());

    const resShop = await request(app)
      .get('/seller/vouchers')
      .set(authHeader())
      .query({ source: 'SHOP', code: 'SHOP_' });
    expect(resShop.status).toBe(200);
    expect(resShop.body.payload.data.map(v => v.code)).toEqual([shopVoucher.code]);

    const resSystem = await request(app).get('/seller/vouchers').set(authHeader()).query({
      source: 'SYSTEM',
      quantity: 10,
      startDate: '2029-01-01T00:00:00.000Z',
      minOrderValue: 0,
    });
    expect(resSystem.status).toBe(200);
    expect(resSystem.body.payload.data.map(v => v.code)).toEqual([systemVoucher.code]);
  });

  test('200 seller get vouchers applies common filters (status/type/target/isActive/isPublic/maxDiscount/discountValue/endDate)', async () => {
    const seller = await asSeller();
    await Voucher.create([
      {
        code: 'SHOP_FILTER_MATCH',
        type: VOUCHER_TYPE.PERCENTAGE,
        target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
        discountValue: 15,
        maxDiscount: 5000,
        minOrderValue: 0,
        startDate: new Date('2030-01-01T00:00:00.000Z'),
        endDate: new Date('2030-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SHOP,
        createdBy: seller._id,
        status: VOUCHER_STATUS.APPROVED,
        isActive: true,
        isPublic: false,
        applicableSellers: [seller._id],
      },
      {
        code: 'SHOP_FILTER_OTHER',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 999,
        maxDiscount: 0,
        minOrderValue: 0,
        startDate: new Date('2030-01-01T00:00:00.000Z'),
        endDate: new Date('2030-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SHOP,
        createdBy: seller._id,
        status: VOUCHER_STATUS.PENDING,
        isActive: false,
        isPublic: true,
        applicableSellers: [seller._id],
      },
    ]);

    const res = await request(app).get('/seller/vouchers').set(authHeader()).query({
      source: 'SHOP',
      code: 'SHOP_FILTER_',
      status: VOUCHER_STATUS.APPROVED,
      type: VOUCHER_TYPE.PERCENTAGE,
      target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
      isActive: 'true',
      isPublic: 'false',
      maxDiscount: 5000,
      discountValue: 15,
      endDate: '2030-01-11T00:00:00.000Z',
    });

    expect(res.status).toBe(200);
    expect(res.body.payload.data.map(v => v.code)).toEqual(['SHOP_FILTER_MATCH']);
  });

  test('400 seller get vouchers when query validation fails (status invalid)', async () => {
    await asSeller();
    const res = await request(app)
      .get('/seller/vouchers')
      .set(authHeader())
      .query({ status: 'NOT_A_STATUS' });
    expectValidationError(res, { field: 'status', message: 'Status is invalid.' });
  });
});
