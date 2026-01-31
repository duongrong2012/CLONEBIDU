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
const BecomeSellerRequest = require('../../Models/becomeSellerRequest.model');
const User = require('../../Models/user.model');
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { USER_ROLES, SELLER_REQUEST_STATUS, MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Seller Requests API (/seller/requests)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountSeller: true, mountAuth: false });
  });

  async function asBuyer() {
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    await authAs(jwtUtils, buyer);
    return buyer;
  }

  async function asSeller() {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    await authAs(jwtUtils, seller);
    return seller;
  }

  async function asAdmin() {
    const admin = await seedUser({ role: USER_ROLES.ADMIN });
    await authAs(jwtUtils, admin);
    return admin;
  }

  function requestBody(overrides = {}) {
    return {
      birthday: overrides.birthday ?? '1990-01-01',
      identityNumber: overrides.identityNumber ?? 'ID123',
      bankName: overrides.bankName ?? 'Bank',
      bankBranch: overrides.bankBranch ?? 'Branch',
      taxCode: overrides.taxCode,
      national: overrides.national ?? 'VN',
      shop: overrides.shop ?? 'Shop',
      shopName: overrides.shopName ?? 'Shop Name',
      isCompanyRegistered: overrides.isCompanyRegistered,
      address: overrides.address ?? 'Addr',
      province: overrides.province ?? 'P',
      district: overrides.district ?? 'D',
      ward: overrides.ward ?? 'W',
      currentDigitalPlatforms: overrides.currentDigitalPlatforms,
      ...overrides,
    };
  }

  test('401 when missing token for submit request', async () => {
    const res = await request(app).post('/seller/requests').send({});
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('403 when seller tries to submit seller request', async () => {
    await asSeller();
    const res = await request(app).post('/seller/requests').set(authHeader()).send(requestBody());
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(MESSAGES.AUTH.FORBIDDEN);
  });

  test('400 when user has pending request', async () => {
    const buyer = await asBuyer();
    await BecomeSellerRequest.create({
      user: buyer._id,
      status: SELLER_REQUEST_STATUS.PENDING,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop Name',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await request(app).post('/seller/requests').set(authHeader()).send(requestBody());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already has a pending request');
  });

  test('400 when submit request missing required fields', async () => {
    await asBuyer();
    const res = await request(app).post('/seller/requests').set(authHeader()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Field 'birthday' is required.");
  });

  test('400 when submit request has extra fields', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send({ ...requestBody(), extraField: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Field 'extraField' is not allowed.");
  });

  test('400 when submit request birthday invalid', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send(requestBody({ birthday: 'invalid-date' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Field birthday must be a valid date.');
  });

  test('400 when submit request under 13 years old', async () => {
    await asBuyer();
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 5);
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send(requestBody({ birthday: recent.toISOString() }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User must be at least 13 years old.');
  });

  test('400 when submit request isCompanyRegistered not boolean', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send(requestBody({ isCompanyRegistered: 'yes' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Field 'isCompanyRegistered' must be a boolean.");
  });

  test('400 when submit request has empty string field', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send(requestBody({ identityNumber: '' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Field 'identityNumber' is required.");
    expect(res.body.message).toContain("Field 'identityNumber' must be a non-empty string.");
  });

  test('400 when submit request taxCode is not string', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send(requestBody({ taxCode: 123 }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Field 'taxCode' must be a string.");
  });

  test('400 when submit request currentDigitalPlatforms invalid', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send(requestBody({ currentDigitalPlatforms: 'facebook' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Field 'currentDigitalPlatforms' must be an array of string.");
  });

  test('400 when submit request currentDigitalPlatforms has non-string items', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send(requestBody({ currentDigitalPlatforms: ['facebook', 1] }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("All items in 'currentDigitalPlatforms' must be string.");
  });

  test('201 submit request success', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send(requestBody({ taxCode: 'TAX-01' }));
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Request submitted successfully');
    expect(res.body.payload.status).toBe(SELLER_REQUEST_STATUS.PENDING);
  });

  test('201 submit request supports isCompanyRegistered and currentDigitalPlatforms', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/seller/requests')
      .set(authHeader())
      .send(
        requestBody({
          isCompanyRegistered: true,
          currentDigitalPlatforms: ['facebook', 'tiktok'],
        })
      );
    expect(res.status).toBe(201);
    expect(res.body.payload.isCompanyRegistered).toBe(true);
    expect(res.body.payload.currentDigitalPlatforms).toEqual(['facebook', 'tiktok']);
  });

  test('400 when my-requests has invalid page', async () => {
    await asBuyer();
    const res = await request(app).get('/seller/my-requests').set(authHeader()).query({ page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Page must be a positive integer');
  });

  test('400 when my-requests has invalid status filter', async () => {
    await asBuyer();
    const res = await request(app)
      .get('/seller/my-requests')
      .set(authHeader())
      .query({ status: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Status must be one of: PENDING, APPROVED, REJECTED');
  });

  test('200 get my requests returns own data', async () => {
    const buyer = await asBuyer();
    await BecomeSellerRequest.create({
      user: buyer._id,
      status: SELLER_REQUEST_STATUS.PENDING,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop Name',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await request(app).get('/seller/my-requests').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Your requests retrieved successfully');
    expect(res.body.payload.data).toHaveLength(1);
  });

  test('403 when buyer tries to access all requests', async () => {
    await asBuyer();
    const res = await request(app).get('/seller/all-requests').set(authHeader());
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(MESSAGES.AUTH.FORBIDDEN);
  });

  test('200 admin gets all requests with filter', async () => {
    const admin = await asAdmin();
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    await BecomeSellerRequest.create({
      user: buyer._id,
      status: SELLER_REQUEST_STATUS.PENDING,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop Name',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await request(app)
      .get('/seller/all-requests')
      .set(authHeader())
      .query({ userId: String(buyer._id) });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Requests retrieved successfully');
    expect(String(admin._id)).toBeDefined();
  });

  test('400 when process request status invalid', async () => {
    await asAdmin();
    const res = await request(app)
      .patch(`/seller/requests/${String(new mongoose.Types.ObjectId())}`)
      .set(authHeader())
      .send({ status: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Status must be either APPROVED or REJECTED');
  });

  test('404 when process request not found', async () => {
    await asAdmin();
    const res = await request(app)
      .patch(`/seller/requests/${String(new mongoose.Types.ObjectId())}`)
      .set(authHeader())
      .send({ status: SELLER_REQUEST_STATUS.APPROVED });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Seller request not found');
  });

  test('400 when process request already processed', async () => {
    await asAdmin();
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    const requestDoc = await BecomeSellerRequest.create({
      user: buyer._id,
      status: SELLER_REQUEST_STATUS.APPROVED,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop Name',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await request(app)
      .patch(`/seller/requests/${String(requestDoc._id)}`)
      .set(authHeader())
      .send({ status: SELLER_REQUEST_STATUS.REJECTED, rejectReason: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Request has already been processed');
  });

  test('400 when process request rejected without reason', async () => {
    await asAdmin();
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    const requestDoc = await BecomeSellerRequest.create({
      user: buyer._id,
      status: SELLER_REQUEST_STATUS.PENDING,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop Name',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await request(app)
      .patch(`/seller/requests/${String(requestDoc._id)}`)
      .set(authHeader())
      .send({ status: SELLER_REQUEST_STATUS.REJECTED });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Rejection reason is required when status is REJECTED');
  });

  test('200 process request approved updates user role', async () => {
    await asAdmin();
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    const requestDoc = await BecomeSellerRequest.create({
      user: buyer._id,
      status: SELLER_REQUEST_STATUS.PENDING,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop Name',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await request(app)
      .patch(`/seller/requests/${String(requestDoc._id)}`)
      .set(authHeader())
      .send({ status: SELLER_REQUEST_STATUS.APPROVED });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Request processed successfully');

    const updatedUser = await User.findById(buyer._id);
    expect(updatedUser.role).toBe(USER_ROLES.SELLER);
  });

  test('400 when cancel request has invalid id', async () => {
    await asBuyer();
    const res = await request(app).patch('/seller/requests/not-an-id/cancel').set(authHeader());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid request ID');
  });

  test('404 when cancel request not found', async () => {
    await asBuyer();
    const res = await request(app)
      .patch(`/seller/requests/${String(new mongoose.Types.ObjectId())}/cancel`)
      .set(authHeader());
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Request not found');
  });

  test('403 when cancel request not owner', async () => {
    const buyer = await asBuyer();
    const other = await seedUser({ role: USER_ROLES.BUYER });
    const reqDoc = await BecomeSellerRequest.create({
      user: other._id,
      status: SELLER_REQUEST_STATUS.PENDING,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop Name',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    expect(String(buyer._id)).not.toBe(String(other._id));
    const res = await request(app)
      .patch(`/seller/requests/${String(reqDoc._id)}/cancel`)
      .set(authHeader());
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Forbidden');
  });

  test('400 when cancel request is not pending', async () => {
    const buyer = await asBuyer();
    const reqDoc = await BecomeSellerRequest.create({
      user: buyer._id,
      status: SELLER_REQUEST_STATUS.APPROVED,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop Name',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await request(app)
      .patch(`/seller/requests/${String(reqDoc._id)}/cancel`)
      .set(authHeader());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Only pending requests can be cancelled');
  });

  test('200 cancel request success', async () => {
    const buyer = await asBuyer();
    const reqDoc = await BecomeSellerRequest.create({
      user: buyer._id,
      status: SELLER_REQUEST_STATUS.PENDING,
      birthday: new Date('1990-01-01'),
      identityNumber: 'ID123',
      bankName: 'Bank',
      bankBranch: 'Branch',
      national: 'VN',
      shop: 'Shop',
      shopName: 'Shop Name',
      address: 'Addr',
      province: 'P',
      district: 'D',
      ward: 'W',
    });
    const res = await request(app)
      .patch(`/seller/requests/${String(reqDoc._id)}/cancel`)
      .set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Request cancelled successfully');

    const updated = await BecomeSellerRequest.findById(reqDoc._id);
    expect(updated.status).toBe('CANCELLED');
  });

  test('500 when cancel request lookup throws', async () => {
    await asBuyer();
    const spy = jest
      .spyOn(BecomeSellerRequest, 'findById')
      .mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await request(app)
        .patch(`/seller/requests/${String(new mongoose.Types.ObjectId())}/cancel`)
        .set(authHeader());
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('db down');
    } finally {
      spy.mockRestore();
    }
  });
});
