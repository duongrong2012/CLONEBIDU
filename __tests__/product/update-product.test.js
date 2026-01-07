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
const Product = require('../../Models/product.model');
const Category = require('../../Models/category.model');
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { USER_ROLES, PRODUCT_STATUS, MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Product API - Update product (PATCH /admin/products/:id)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountAdmin: true });
  });

  async function patchUpdate(id, body, role = USER_ROLES.SELLER) {
    await authAs(jwtUtils, await seedUser({ role }));
    return request(app).patch(`/admin/products/${id}`).set(authHeader()).send(body);
  }

  test('401 when missing token', async () => {
    const res = await request(app)
      .patch('/admin/products/66f000000000000000000001')
      .send({ name: 'X' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('403 when role is not allowed (buyer)', async () => {
    const res = await patchUpdate('66f000000000000000000001', { name: 'Xy' }, USER_ROLES.BUYER);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(MESSAGES.AUTH.FORBIDDEN);
  });

  test('400 when product id invalid format', async () => {
    const res = await patchUpdate('not-an-id', { name: 'Valid Name' }, USER_ROLES.SELLER);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(
      res.body.errors.some(e => e.field === 'id' && e.message === 'Invalid product ID format')
    ).toBe(true);
  });

  test('400 when no fields provided for update', async () => {
    const res = await patchUpdate('66f000000000000000000001', {}, USER_ROLES.SELLER);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(
      res.body.errors.some(
        e => e.field === 'general' && e.message === 'No fields provided for update'
      )
    ).toBe(true);
  });

  test('404 when product not found', async () => {
    const res = await patchUpdate('66f000000000000000000001', { name: 'Xy' }, USER_ROLES.SELLER);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe(MESSAGES.PRODUCT.NOT_FOUND);
  });

  test('seller cannot update other seller product (403)', async () => {
    const seller1 = await seedUser({ role: USER_ROLES.SELLER });
    await authAs(jwtUtils, await seedUser({ role: USER_ROLES.SELLER }));
    const p = await Product.create({
      name: 'Other',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller1._id,
    });

    const res = await request(app)
      .patch(`/admin/products/${p._id}`)
      .set(authHeader())
      .send({ name: 'Hacked' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.some(e => e.field === 'permission')).toBe(true);
  });

  test('seller updating own product forces status to PENDING', async () => {
    const seller = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.SELLER }));
    const p = await Product.create({
      name: 'OwnApproved',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
      rejectedReason: 'old reason',
    });

    const res = await request(app)
      .patch(`/admin/products/${p._id}`)
      .set(authHeader())
      .send({ name: 'Updated by seller', status: PRODUCT_STATUS.APPROVED });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product updated successfully');
    expect(res.body.payload.name).toBe('Updated by seller');
    expect(res.body.payload.status).toBe(PRODUCT_STATUS.PENDING);
    expect(res.body.payload.rejectedReason).toBe(null);
  });

  test('400 when discountPrice is greater than price', async () => {
    const res = await patchUpdate('66f000000000000000000001', { price: 100, discountPrice: 200 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    const expectedMsg = 'Discount price cannot be greater than price';
    expect(
      res.body.errors.some(e => e.field === 'discountPrice' && e.message === expectedMsg)
    ).toBe(true);
  });

  test('400 when categories has duplicates', async () => {
    const c = await Category.create({ name: 'Cat 1', slug: 'cat-1', isActive: true });
    const res = await patchUpdate('66f000000000000000000001', {
      categories: [String(c._id), String(c._id)],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(
      res.body.errors.some(
        e => e.field === 'categories' && e.message === 'Duplicate category in categories array'
      )
    ).toBe(true);
  });

  test('400 when categories contains non-existing category', async () => {
    const c = await Category.create({ name: 'Cat 1', slug: 'cat-1', isActive: true });
    const missingId = '66f0000000000000000000aa';
    const res = await patchUpdate('66f000000000000000000001', {
      categories: [String(c._id), missingId],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(
      res.body.errors.some(
        e => e.field === 'categories' && e.message === 'One or more categories do not exist'
      )
    ).toBe(true);
  });

  test('400 when admin sets status REJECTED but missing rejectedReason', async () => {
    const res = await patchUpdate(
      '66f000000000000000000001',
      { status: PRODUCT_STATUS.REJECTED },
      USER_ROLES.ADMIN
    );
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(
      res.body.errors.some(
        e =>
          e.field === 'rejectedReason' &&
          e.message === 'Rejected reason is required when status is REJECTED'
      )
    ).toBe(true);
  });

  test('200 admin can update other seller product and set status', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'ToApprove',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: seller._id,
    });

    const res = await patchUpdate(
      String(p._id),
      { status: PRODUCT_STATUS.APPROVED },
      USER_ROLES.ADMIN
    );
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product updated successfully');
    expect(res.body.payload.status).toBe(PRODUCT_STATUS.APPROVED);
  });
});
