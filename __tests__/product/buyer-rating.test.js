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
const ProductRating = require('../../Models/product-rating.model');
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { USER_ROLES, PRODUCT_STATUS, MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Product API - Rate product (POST /buyer/products/:productId/rate)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountBuyer: true });
  });

  beforeEach(() => {
    jwtUtils.verifyToken.mockReset();
  });

  async function postRate(productId, body, role = USER_ROLES.BUYER) {
    await authAs(jwtUtils, await seedUser({ role }));
    return request(app).post(`/buyer/products/${productId}/rate`).set(authHeader()).send(body);
  }

  test('401 when missing token', async () => {
    const res = await request(app)
      .post('/buyer/products/66f000000000000000000001/rate')
      .send({ rating: 5 });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('400 when productId invalid format', async () => {
    const res = await postRate('not-an-id', { rating: 5 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid product ID format');
  });

  test('404 when product not found', async () => {
    const fakeId = '66f000000000000000000001';
    const res = await postRate(fakeId, { rating: 5 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe(MESSAGES.PRODUCT.NOT_FOUND);
  });

  test('400 when product inactive', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'Inactive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: false,
      createdBy: seller._id,
    });
    const res = await postRate(String(p._id), { rating: 5 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.PRODUCT.INACTIVE_PRODUCT);
  });

  test('400 when rating out of range', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'Active',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    const res = await postRate(String(p._id), { rating: 6 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Rating must be an integer between');
  });

  test('400 when rating is missing', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'MissingRating',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    const res = await postRate(String(p._id), { comment: 'ok' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Rating is required');
  });

  test('400 when comment too long', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'LongComment',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    const longComment = 'a'.repeat(501);
    const res = await postRate(String(p._id), { rating: 5, comment: longComment });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Comment must not exceed 500 characters');
  });

  test('200 when new rating is created and totals updated', async () => {
    const buyer = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.BUYER }));
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'RateMe',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    const res = await request(app)
      .post(`/buyer/products/${p._id}/rate`)
      .set(authHeader())
      .send({ rating: 5, comment: 'great' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe(MESSAGES.PRODUCT.RATED_SUCCESS);
    expect(res.body.payload.isNewRating).toBe(true);
    expect(res.body.payload.product).toBeTruthy();
    expect(res.body.payload.rating).toBeTruthy();

    const updated = await Product.findById(p._id);
    expect(updated.totalRating).toBe(1);
    expect(updated.totalRatingPoints).toBe(5);

    const ratingDoc = await ProductRating.findOne({ product: p._id, user: buyer._id });
    expect(ratingDoc).toBeTruthy();
    expect(ratingDoc.rating).toBe(5);
  });

  test('200 when rating updated (same user) and totals recalculated', async () => {
    const buyer = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.BUYER }));
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'UpdateRating',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    // First rating
    await request(app)
      .post(`/buyer/products/${p._id}/rate`)
      .set(authHeader())
      .send({ rating: 5, comment: 'great' });

    // Update rating
    const res = await request(app)
      .post(`/buyer/products/${p._id}/rate`)
      .set(authHeader())
      .send({ rating: 3, comment: 'ok' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(MESSAGES.PRODUCT.RATING_UPDATED);
    expect(res.body.payload.isNewRating).toBe(false);

    const updated = await Product.findById(p._id);
    expect(updated.totalRating).toBe(1);
    expect(updated.totalRatingPoints).toBe(3);

    // Ensure ratedUsers entry is also updated (service branch coverage + real expected behavior)
    const ratingDoc = await ProductRating.findOne({ product: p._id, user: buyer._id });
    expect(ratingDoc).toBeTruthy();
    expect(ratingDoc.rating).toBe(3);
    expect(Array.isArray(ratingDoc.ratedUsers)).toBe(true);
    expect(ratingDoc.ratedUsers.length).toBeGreaterThan(0);
    expect(ratingDoc.ratedUsers[0].rating).toBe(3);
  });

  test('200 when two different users rate and totals reflect both ratings', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await Product.create({
      name: 'TwoUsers',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });

    const buyer1 = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.BUYER }));
    await request(app).post(`/buyer/products/${p._id}/rate`).set(authHeader()).send({ rating: 5 });

    // Switch user
    const buyer2 = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.BUYER }));
    await request(app).post(`/buyer/products/${p._id}/rate`).set(authHeader()).send({ rating: 3 });

    const updated = await Product.findById(p._id);
    expect(updated.totalRating).toBe(2);
    expect(updated.totalRatingPoints).toBe(8);

    const r1 = await ProductRating.findOne({ product: p._id, user: buyer1._id });
    const r2 = await ProductRating.findOne({ product: p._id, user: buyer2._id });
    expect(r1).toBeTruthy();
    expect(r2).toBeTruthy();
  });
});
