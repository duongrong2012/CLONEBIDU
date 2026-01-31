/* eslint-env jest */
/* global jest */
const { describe, test, expect, beforeAll, beforeEach } = require('@jest/globals');

const request = require('supertest');

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const { createTestApp, setupInMemoryMongo } = require('../index');
const jwtUtils = require('../../Utils/jwt.utils');
const Product = require('../../Models/product.model');
const { authHeader, seedUser, authAs, mockTokenInvalid } = require('../helpers/auth');
const { USER_ROLES, PRODUCT_STATUS, MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Product API - Get product by id (GET /admin/products/:productId)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountAdmin: true });
  });

  beforeEach(() => {
    jwtUtils.verifyToken.mockReset();
  });

  async function getById(productId, role) {
    if (role) {
      await authAs(jwtUtils, await seedUser({ role }));
    }
    const req = request(app).get(`/admin/products/${productId}`);
    if (role) req.set(authHeader());
    return req;
  }

  test('400 when productId invalid format', async () => {
    const res = await request(app).get('/admin/products/not-an-id');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid product ID format');
  });

  test('404 when product not found', async () => {
    const res = await request(app).get('/admin/products/66f000000000000000000001');
    expect(res.status).toBe(404);
    expect(res.body.message).toBe(MESSAGES.PRODUCT.NOT_FOUND);
  });

  test('guest cannot view non-approved product', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'Pending',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: seller._id,
    });
    const res = await request(app).get(`/admin/products/${p._id}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Product not available for public viewing');
  });

  test('guest cannot view approved but inactive product', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'ApprovedInactive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: false,
      createdBy: seller._id,
    });
    const res = await request(app).get(`/admin/products/${p._id}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Product not available for public viewing');
  });

  test('guest can view approved + active product', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'ApprovedActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    const res = await request(app).get(`/admin/products/${p._id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product retrieved successfully');
    expect(String(res.body.payload._id)).toBe(String(p._id));
  });

  test('buyer cannot view non-approved product', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'PendingForBuyer',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: seller._id,
    });
    const res = await getById(String(p._id), USER_ROLES.BUYER);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Product not available for viewing');
  });

  test('buyer can view approved + active product', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'ApprovedForBuyer',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    const res = await getById(String(p._id), USER_ROLES.BUYER);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product retrieved successfully');
    expect(String(res.body.payload._id)).toBe(String(p._id));
  });

  test('seller cannot view other seller non-approved product', async () => {
    const otherSeller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'OtherPending',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: otherSeller._id,
    });
    const res = await getById(String(p._id), USER_ROLES.SELLER);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Product not available for viewing');
  });

  test('seller can view other seller approved + active product', async () => {
    const otherSeller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'OtherApproved',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: otherSeller._id,
    });
    const res = await getById(String(p._id), USER_ROLES.SELLER);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product retrieved successfully');
  });

  test('seller can view own non-approved product', async () => {
    const seller = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.SELLER }));
    const p = await Product.create({
      name: 'OwnPending',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: seller._id,
    });
    const res = await request(app).get(`/admin/products/${p._id}`).set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product retrieved successfully');
    expect(String(res.body.payload._id)).toBe(String(p._id));
  });

  test('admin can view non-approved product', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'PendingForAdmin',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: false,
      createdBy: seller._id,
    });
    const res = await getById(String(p._id), USER_ROLES.ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product retrieved successfully');
  });

  test('invalid token behaves like guest (optionalAuth)', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'PendingInvalidToken',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: seller._id,
    });

    mockTokenInvalid(jwtUtils);
    const res = await request(app).get(`/admin/products/${p._id}`).set(authHeader());
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Product not available for public viewing');
  });

  test('500 when get product by id throws', async () => {
    const spy = jest.spyOn(Product, 'findById').mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await request(app).get('/admin/products/66f000000000000000000001');
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('db down');
    } finally {
      spy.mockRestore();
    }
  });
});
