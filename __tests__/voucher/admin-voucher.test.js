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
const User = require('../../Models/user.model');

const {
  USER_ROLES,
  VOUCHER_STATUS,
  VOUCHER_TYPE,
  VOUCHER_SOURCE,
  VOUCHER_TARGET,
} = require('../../Utils/constant');

setupInMemoryMongo();

describe('Voucher API - Admin (/admin/vouchers)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountAdmin: true, mountAuth: false });
  });

  async function asAdmin() {
    const admin = await seedUser({ role: USER_ROLES.ADMIN });
    await authAs(jwtUtils, admin);
    return admin;
  }

  async function asSuperAdmin() {
    const superAdmin = await seedUser({ role: USER_ROLES.SUPER_ADMIN });
    await authAs(jwtUtils, superAdmin);
    return superAdmin;
  }

  function createBody(overrides = {}) {
    const start = overrides.startDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = overrides.endDate ?? new Date(Date.now() + 48 * 60 * 60 * 1000);
    return {
      code: overrides.code ?? `SYS_${Date.now()}`,
      type: overrides.type ?? VOUCHER_TYPE.FIXED,
      target: overrides.target ?? VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: overrides.discountValue ?? 10000,
      startDate: start instanceof Date ? start.toISOString() : start,
      endDate: end instanceof Date ? end.toISOString() : end,
      quantity: overrides.quantity ?? 10,
      ...overrides,
    };
  }

  test('401 when missing token', async () => {
    const res = await request(app).get('/admin/vouchers');
    expect(res.status).toBe(401);
  });

  test('200 create voucher (SYSTEM) by admin', async () => {
    const admin = await asAdmin();
    const seller = await seedUser({ role: USER_ROLES.SELLER });

    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(
        createBody({
          code: 'ADMIN_FIXED_1',
          applicableSellers: [String(seller._id)],
          isPublic: true,
          status: VOUCHER_STATUS.APPROVED,
        })
      );

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.code).toBe('ADMIN_FIXED_1');
    expect(res.body.payload.source).toBe(VOUCHER_SOURCE.SYSTEM);
    expect(String(res.body.payload.createdBy)).toBe(String(admin._id));
  });

  test('200 create voucher (SYSTEM) by super admin', async () => {
    const superAdmin = await asSuperAdmin();
    const seller = await seedUser({ role: USER_ROLES.SELLER });

    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(
        createBody({
          code: 'SUPER_ADMIN_FIXED_1',
          applicableSellers: [String(seller._id)],
          isPublic: true,
          status: VOUCHER_STATUS.APPROVED,
        })
      );

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.code).toBe('SUPER_ADMIN_FIXED_1');
    expect(res.body.payload.source).toBe(VOUCHER_SOURCE.SYSTEM);
    expect(String(res.body.payload.createdBy)).toBe(String(superAdmin._id));
  });

  test('200 create voucher trims description and accepts explicit isActive/isPublic', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(
        createBody({
          code: 'ADMIN_DESC_1',
          description: '  hello  ',
          isActive: false,
          isPublic: false,
        })
      );

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.code).toBe('ADMIN_DESC_1');
    expect(res.body.payload.description).toBe('hello');
    expect(res.body.payload.isActive).toBe(false);
    expect(res.body.payload.isPublic).toBe(false);
  });

  test('200 create voucher uses default isActive/isPublic when omitted', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'ADMIN_DEFAULTS_1' }));

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.code).toBe('ADMIN_DEFAULTS_1');
    expect(res.body.payload.isActive).toBe(true);
    expect(res.body.payload.isPublic).toBe(false);
  });

  test('400 when code is not uppercase', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'lowercase_1' }));
    expectValidationError(res, { field: 'code', message: 'Voucher code must be uppercase.' });
  });

  test('400 when code is whitespace only', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(createBody({ code: '   ' }));
    expectValidationError(res, {
      field: 'code',
      message: 'Field code cannot be empty or contain only whitespace.',
    });
  });

  test('400 when code contains invalid chars', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'ABC$' }));
    expectValidationError(res, {
      field: 'code',
      message: 'Voucher code only allows A-Z, 0-9, underscore (_) or hyphen (-).',
    });
  });

  test('400 when code contains both underscore and hyphen', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'A_-A' }));
    expectValidationError(res, {
      field: 'code',
      message: 'Voucher code cannot contain both underscore (_) and hyphen (-).',
    });
  });

  test('400 when code contains consecutive underscores', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'AA__BB' }));
    expectValidationError(res, {
      field: 'code',
      message: 'Voucher code cannot contain two consecutive underscores or hyphens.',
    });
  });

  test('400 when code starts with underscore', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(createBody({ code: '_ABC' }));
    expectValidationError(res, {
      field: 'code',
      message: 'Voucher code cannot start or end with an underscore or hyphen.',
    });
  });

  test('400 when code is missing (hits exists() message)', async () => {
    await asAdmin();
    const body = createBody({ code: undefined });
    delete body.code;
    const res = await request(app).post('/admin/vouchers').set(authHeader()).send(body);
    expectValidationError(res, { field: 'code', message: 'Field code is required.' });
  });

  test('400 when discountValue cannot be validated because type is missing', async () => {
    await asAdmin();
    const body = createBody({ code: 'NO_TYPE_1' });
    delete body.type;
    const res = await request(app).post('/admin/vouchers').set(authHeader()).send(body);
    expectValidationError(res, {
      field: 'discountValue',
      message: 'Invalid or missing type — cannot validate discountValue.',
    });
  });

  test('400 when fixed discount exceeds 1,000,000,000', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(
        createBody({
          code: 'FIX_TOO_BIG',
          type: VOUCHER_TYPE.FIXED,
          discountValue: 1_000_000_001,
        })
      );
    expectValidationError(res, {
      field: 'discountValue',
      message: 'Fixed discount cannot exceed 1,000,000,000.',
    });
  });

  test('400 when duplicate code exists', async () => {
    await asAdmin();
    await Voucher.create({
      code: 'DUP_1',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'DUP_1' }));

    expectValidationError(res, { field: 'code', message: 'Voucher code already exists' });
  });

  test('400 when applicableUsers contains invalid ObjectId (non-DB validation)', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(createBody({ code: 'BAD_OID_CREATE', applicableUsers: ['not-an-objectid'] }));
    expectValidationError(res, {
      field: 'applicableUsers',
      message: 'Invalid ObjectId: not-an-objectid',
    });
  });

  test('400 when duplicate code check throws (db error path)', async () => {
    await asAdmin();
    const spy = jest.spyOn(Voucher, 'findOne').mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await request(app)
        .post('/admin/vouchers')
        .set(authHeader())
        .send(createBody({ code: 'DB_DOWN_1' }));
      expectValidationError(res, { field: 'code', message: 'db down' });
    } finally {
      spy.mockRestore();
    }
  });

  test('400 when validateEntityExistence throws (covers helper catch branch)', async () => {
    await asAdmin();
    const spy = jest.spyOn(User, 'find').mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await request(app)
        .post('/admin/vouchers')
        .set(authHeader())
        .send(
          createBody({
            code: 'ENTITY_FIND_FAIL',
            applicableUsers: [String(new mongoose.Types.ObjectId())],
          })
        );
      expectValidationError(res, { field: 'applicableUsers', message: 'db down' });
    } finally {
      spy.mockRestore();
    }
  });

  test('400 when startDate is in the past (admin business rule)', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(
        createBody({
          code: 'PAST_START',
          startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
      );
    expectValidationError(res, {
      field: 'startDate',
      message: 'Field startDate must be greater than or equal to current date.',
    });
  });

  test('400 when endDate is not after startDate', async () => {
    await asAdmin();
    const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const end = new Date(Date.now() + 23 * 60 * 60 * 1000);
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(
        createBody({ code: 'BAD_END', startDate: start.toISOString(), endDate: end.toISOString() })
      );
    expectValidationError(res, { field: 'endDate', message: 'endDate must be after startDate.' });
  });

  test('400 when percentage discountValue exceeds 100', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send(
        createBody({
          code: 'PCT_101',
          type: VOUCHER_TYPE.PERCENTAGE,
          discountValue: 101,
        })
      );
    expectValidationError(res, {
      field: 'discountValue',
      message: 'Percentage discount cannot exceed 100%.',
    });
  });

  test('400 when disallowed field present on create', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/vouchers')
      .set(authHeader())
      .send({ ...createBody({ code: 'DISALLOWED_1' }), someWeirdField: 'x' });
    expectValidationError(res, {
      field: 'someWeirdField',
      message: 'Field someWeirdField is not allowed.',
    });
  });

  test('404 update voucher when not found', async () => {
    await asAdmin();
    const res = await request(app)
      .patch(`/admin/vouchers/${new mongoose.Types.ObjectId()}`)
      .set(authHeader())
      .send({ isActive: false });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Voucher not found');
  });

  test('400 update voucher rejects status REJECTED without rejectReason', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'REJECT_ME',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ status: VOUCHER_STATUS.REJECTED });
    expectValidationError(res, {
      field: 'rejectReason',
      message: 'Reject reason is required when status is REJECTED.',
    });
  });

  test('200 update started voucher allows isActive only (covers allowed-field path)', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'STARTED_CAN_TOGGLE',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.APPROVED,
      isActive: true,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.isActive).toBe(false);
  });

  test('200 update not-started voucher supports maxDiscount/minOrderValue/quantity/date updates', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_FIELDS_OK',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 10 * 86400000),
      endDate: new Date(Date.now() + 11 * 86400000),
      quantity: 10,
      minOrderValue: 0,
      maxDiscount: 0,
      usageLimitPerUser: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const startDate = new Date(Date.now() + 3 * 86400000);
    const endDate = new Date(Date.now() + 4 * 86400000);
    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({
        maxDiscount: 0,
        minOrderValue: 0,
        quantity: 5,
        usageLimitPerUser: 2,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.maxDiscount).toBe(0);
    expect(res.body.payload.minOrderValue).toBe(0);
    expect(res.body.payload.quantity).toBe(5);
    expect(res.body.payload.usageLimitPerUser).toBe(2);
  });

  test('200 update not-started voucher can set applicableSellers/applicableUsers', async () => {
    await asAdmin();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const user = await seedUser({ role: USER_ROLES.BUYER });

    const v = await Voucher.create({
      code: 'UPD_SCOPE_OK',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 10 * 86400000),
      endDate: new Date(Date.now() + 11 * 86400000),
      quantity: 10,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({
        applicableSellers: [String(seller._id)],
        applicableUsers: [String(user._id)],
      });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.applicableSellers.map(String)).toEqual([String(seller._id)]);
    expect(res.body.payload.applicableUsers.map(String)).toEqual([String(user._id)]);
  });

  test('200 update not-started voucher can set applicableProducts/applicableCategories', async () => {
    await asAdmin();
    const cat = await seedCategory('UpdCat');
    const p = await seedProduct();

    const v = await Voucher.create({
      code: 'UPD_PROD_CAT_OK',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 10 * 86400000),
      endDate: new Date(Date.now() + 11 * 86400000),
      quantity: 10,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({
        applicableProducts: [String(p._id)],
        applicableCategories: [String(cat._id)],
      });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.applicableProducts.map(String)).toEqual([String(p._id)]);
    expect(res.body.payload.applicableCategories.map(String)).toEqual([String(cat._id)]);
  });

  test('200 update not-started voucher can update target', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_TARGET_OK',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 10 * 86400000),
      endDate: new Date(Date.now() + 11 * 86400000),
      quantity: 10,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ target: VOUCHER_TARGET.SHIPPING_DISCOUNT });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.target).toBe(VOUCHER_TARGET.SHIPPING_DISCOUNT);
  });

  test('400 update voucher discountValue without type validates against current voucher type', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'PCT_BASE',
      type: VOUCHER_TYPE.PERCENTAGE,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 10,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ discountValue: 101 });
    expectValidationError(res, {
      field: 'discountValue',
      message: 'Percentage discount cannot exceed 100%.',
    });
  });

  test('400 update voucher discountValue validator errors when voucher not found (validator phase)', async () => {
    await asAdmin();
    const id = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/admin/vouchers/${String(id)}`)
      .set(authHeader())
      .send({ discountValue: 50 });
    expectValidationError(res, {
      field: 'discountValue',
      message: 'Voucher not found for discountValue validation.',
    });
  });

  test('400 update voucher when type updated without discountValue', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_TYPE_NEEDS_DV',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ type: VOUCHER_TYPE.PERCENTAGE });
    expectValidationError(res, {
      field: 'type',
      message: 'Field discountValue is required when type is updated.',
    });
  });

  test('400 update voucher when type is invalid and discountValue present (covers discountValueOptional type check)', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_BAD_TYPE_DV',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ type: 'NOT_A_TYPE', discountValue: 10 });

    expectValidationError(res, {
      field: 'discountValue',
      message: 'Invalid or missing type — cannot validate discountValue.',
    });
  });

  test('400 update voucher when type FIXED and discountValue too big (covers discountValueOptional FIXED branch)', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_FIXED_TOO_BIG',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ type: VOUCHER_TYPE.FIXED, discountValue: 1_000_000_001 });

    expectValidationError(res, {
      field: 'discountValue',
      message: 'Fixed discount cannot exceed 1,000,000,000.',
    });
  });

  test('400 update voucher validates discountValue against current type (FIXED too big)', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'FIX_BASE',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ discountValue: 1_000_000_001 });
    expectValidationError(res, {
      field: 'discountValue',
      message: 'Fixed discount cannot exceed 1,000,000,000.',
    });
  });

  test('400 update voucher when type PERCENTAGE and discountValue > 100 (covers discountValueOptional PERCENTAGE branch)', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_PCT_TOO_BIG',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ type: VOUCHER_TYPE.PERCENTAGE, discountValue: 101 });

    expectValidationError(res, {
      field: 'discountValue',
      message: 'Percentage discount cannot exceed 100%.',
    });
  });

  test('200 update voucher when type present and discountValue valid (covers discountValueOptional return true)', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_PCT_OK',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ type: VOUCHER_TYPE.PERCENTAGE, discountValue: 50 });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.type).toBe(VOUCHER_TYPE.PERCENTAGE);
    expect(res.body.payload.discountValue).toBe(50);
  });

  test('400 update voucher requires rejectReason when status REJECTED and rejectReason provided empty', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'REJ_EMPTY_REASON',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ status: VOUCHER_STATUS.REJECTED, rejectReason: '' });
    expectValidationError(res, {
      field: 'rejectReason',
      message: 'Reject reason is required when status is REJECTED.',
    });
  });

  test('200 update voucher accepts status REJECTED when rejectReason provided (covers rejectReason pass branch)', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'REJECT_WITH_REASON',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ status: VOUCHER_STATUS.REJECTED, rejectReason: 'Not eligible' });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.status).toBe(VOUCHER_STATUS.REJECTED);
    expect(res.body.payload.rejectReason).toBe('Not eligible');
  });

  test('400 update voucher when disallowed field present', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_DISALLOW',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ someWeirdField: 'x' });
    expectValidationError(res, {
      field: 'someWeirdField',
      message: 'Field someWeirdField is not allowed.',
    });
  });

  test('403 update voucher when voucher source is SHOP (admin only updates SYSTEM)', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'SHOP_V',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SHOP,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ isActive: false });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Only admin-created vouchers can be updated');
  });

  test('500 update voucher when DB throws while finding voucher (covers catch)', async () => {
    await asAdmin();
    const spy = jest.spyOn(Voucher, 'findById').mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await request(app)
        .patch(`/admin/vouchers/${String(new mongoose.Types.ObjectId())}`)
        .set(authHeader())
        .send({ isActive: false });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Error finding voucher');
    } finally {
      spy.mockRestore();
    }
  });

  test('400 update voucher when reference ObjectId format invalid', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_BAD_OID',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ applicableUsers: ['not-an-objectid'] });
    expectValidationError(res, {
      field: 'applicableUsers',
      message: 'Invalid ObjectId: not-an-objectid',
    });
  });

  test('400 update voucher when referenced entities do not exist', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'UPD_MISS_ENTITY',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.PENDING,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ applicableUsers: [String(new mongoose.Types.ObjectId())] });
    expectValidationError(res, { field: 'applicableUsers', message: 'Some users do not exist' });
  });

  test('400 update voucher when voucher id format invalid', async () => {
    await asAdmin();
    const res = await request(app)
      .patch('/admin/vouchers/not-an-id')
      .set(authHeader())
      .send({ isActive: false });
    expectValidationError(res, { field: 'id', message: 'Invalid voucher ID format.' });
  });

  test('400 update voucher when already started: only isActive allowed', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'STARTED_SYS',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() - 86400000),
      endDate: new Date(Date.now() + 86400000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.APPROVED,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ description: 'nope' });
    expectValidationError(res, {
      field: 'general',
      message:
        'Cannot update fields: description. Voucher has already started. Only isActive can be modified.',
    });
  });

  test('200 update voucher before start does not automatically set status (current behavior)', async () => {
    await asAdmin();
    const v = await Voucher.create({
      code: 'FUTURE_SYS',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 7 * 86400000),
      endDate: new Date(Date.now() + 8 * 86400000),
      quantity: 1,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.APPROVED,
    });

    const res = await request(app)
      .patch(`/admin/vouchers/${String(v._id)}`)
      .set(authHeader())
      .send({ isPublic: true });

    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.status).toBe(VOUCHER_STATUS.APPROVED);
    expect(res.body.payload.isPublic).toBe(true);
  });

  test('200 get vouchers admin supports filters (code/date/isActive/isPublic)', async () => {
    await asAdmin();
    await Voucher.create([
      {
        code: 'LIST_A',
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
      },
      {
        code: 'LIST_B',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 1000,
        startDate: new Date('2031-01-01T00:00:00.000Z'),
        endDate: new Date('2031-01-10T00:00:00.000Z'),
        quantity: 10,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: new mongoose.Types.ObjectId(),
        status: VOUCHER_STATUS.APPROVED,
        isActive: false,
        isPublic: false,
      },
    ]);

    const res = await request(app).get('/admin/vouchers').set(authHeader()).query({
      code: 'LIST_',
      startDate: '2029-12-31T00:00:00.000Z',
      endDate: '2030-01-11T00:00:00.000Z',
      isActive: 'true',
      isPublic: 'true',
    });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.payload.data)).toBe(true);
    expect(res.body.payload.data.length).toBe(1);
    expect(res.body.payload.data[0].code).toBe('LIST_A');
  });

  test('200 get vouchers admin supports full filter set (status/type/source/target/createdBy/numbers)', async () => {
    await asAdmin();
    const creatorA = new mongoose.Types.ObjectId();
    const creatorB = new mongoose.Types.ObjectId();

    await Voucher.create([
      {
        code: 'FULL_MATCH',
        type: VOUCHER_TYPE.PERCENTAGE,
        target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
        discountValue: 10,
        maxDiscount: 5000,
        minOrderValue: 20000,
        startDate: new Date('2032-01-01T00:00:00.000Z'),
        endDate: new Date('2032-01-10T00:00:00.000Z'),
        quantity: 7,
        source: VOUCHER_SOURCE.SYSTEM,
        createdBy: creatorA,
        status: VOUCHER_STATUS.APPROVED,
        isActive: true,
        isPublic: false,
      },
      {
        code: 'FULL_OTHER',
        type: VOUCHER_TYPE.FIXED,
        target: VOUCHER_TARGET.ORDER_DISCOUNT,
        discountValue: 999,
        maxDiscount: 0,
        minOrderValue: 0,
        startDate: new Date('2033-01-01T00:00:00.000Z'),
        endDate: new Date('2033-01-10T00:00:00.000Z'),
        quantity: 99,
        source: VOUCHER_SOURCE.SHOP,
        createdBy: creatorB,
        status: VOUCHER_STATUS.PENDING,
        isActive: false,
        isPublic: true,
      },
    ]);

    const res = await request(app)
      .get('/admin/vouchers')
      .set(authHeader())
      .query({
        code: 'FULL_',
        status: VOUCHER_STATUS.APPROVED,
        type: VOUCHER_TYPE.PERCENTAGE,
        source: VOUCHER_SOURCE.SYSTEM,
        target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
        createdBy: String(creatorA),
        isActive: 'true',
        isPublic: 'false',
        minOrderValue: 20000,
        maxDiscount: 5000,
        discountValue: 10,
        quantity: 7,
        startDate: '2031-12-31T00:00:00.000Z',
        endDate: '2032-01-11T00:00:00.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.payload.data.length).toBe(1);
    expect(res.body.payload.data[0].code).toBe('FULL_MATCH');
  });

  test('200 get vouchers admin without filters (covers false branches for optional query)', async () => {
    await asAdmin();
    await Voucher.create({
      code: 'NO_FILTER_1',
      type: VOUCHER_TYPE.FIXED,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      discountValue: 1000,
      startDate: new Date(Date.now() + 86400000),
      endDate: new Date(Date.now() + 172800000),
      quantity: 10,
      source: VOUCHER_SOURCE.SYSTEM,
      createdBy: new mongoose.Types.ObjectId(),
      status: VOUCHER_STATUS.APPROVED,
      isActive: true,
      isPublic: false,
    });

    const res = await request(app).get('/admin/vouchers').set(authHeader());
    expect(res.status).toBe(200);
    const codes = res.body.payload.data.map(v => v.code);
    expect(codes).toContain('NO_FILTER_1');
  });
  //
  test('400 get vouchers admin when query validation fails (status invalid)', async () => {
    await asAdmin();
    const res = await request(app)
      .get('/admin/vouchers')
      .set(authHeader())
      .query({ status: 'NOT_A_STATUS' });
    expectValidationError(res, { field: 'status', message: 'Status is invalid.' });
  });
});
