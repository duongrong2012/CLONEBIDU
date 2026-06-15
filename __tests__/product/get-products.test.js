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
const Category = require('../../Models/category.model');
const { authHeader, seedUser, authAs, mockTokenInvalid } = require('../helpers/auth');
const { USER_ROLES, PRODUCT_STATUS } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Product API - Get products (GET /admin/products)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountAdmin: true });
  });

  beforeEach(() => {
    jwtUtils.verifyToken.mockReset();
  });

  async function getProducts({ query = {}, role } = {}) {
    if (role) {
      await authAs(jwtUtils, await seedUser({ role }));
    }
    return request(app)
      .get('/admin/products')
      .set(role ? authHeader() : {})
      .query(query);
  }

  test('guest sees only APPROVED + isActive products', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    await Product.create({
      name: 'ApprovedActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'PendingActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'ApprovedInactive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: false,
      createdBy: seller._id,
    });

    const res = await request(app).get('/admin/products');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    const items = res.body.payload.data;
    expect(items.every(p => p.status === PRODUCT_STATUS.APPROVED && p.isActive === true)).toBe(
      true
    );
    expect(items.length).toBe(1);
  });

  test('buyer (authenticated) still sees only APPROVED + isActive products (query is forced)', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    await Product.create({
      name: 'ApprovedActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'PendingActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: seller._id,
    });

    const res = await getProducts({
      role: USER_ROLES.BUYER,
      query: { status: PRODUCT_STATUS.PENDING, isActive: false },
    });
    expect(res.status).toBe(200);
    const items = res.body.payload.data;
    expect(items.length).toBe(1);
    expect(items.every(p => p.status === PRODUCT_STATUS.APPROVED && p.isActive === true)).toBe(
      true
    );
  });

  test('seller without createdBy filter is limited to APPROVED + isActive products', async () => {
    const seller = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.SELLER }));
    const otherSeller = await seedUser({ role: USER_ROLES.SELLER });

    await Product.create({
      name: 'OwnPendingInactive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: false,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'OwnApprovedActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'OtherApprovedActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: otherSeller._id,
    });

    const res = await request(app).get('/admin/products').set(authHeader());
    expect(res.status).toBe(200);
    const items = res.body.payload.data;
    expect(items.length).toBe(2);
    expect(items.every(p => p.status === PRODUCT_STATUS.APPROVED && p.isActive === true)).toBe(
      true
    );
  });

  test('seller with createdBy=self can see own products with any status', async () => {
    const seller = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.SELLER }));
    await Product.create({
      name: 'OwnPending',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: false,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'OwnApproved',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });

    const res = await request(app)
      .get('/admin/products')
      .set(authHeader())
      .query({ createdBy: String(seller._id) });
    expect(res.status).toBe(200);
    const items = res.body.payload.data;
    expect(items.length).toBe(2);
  });

  test('seller filtering by createdBy != self is limited to APPROVED + isActive products', async () => {
    const seller = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.SELLER }));
    const otherSeller = await seedUser({ role: USER_ROLES.SELLER });

    await Product.create({
      name: 'OtherPendingActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: otherSeller._id,
    });
    await Product.create({
      name: 'OtherApprovedActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: otherSeller._id,
    });

    const res = await request(app)
      .get('/admin/products')
      .set(authHeader())
      .query({ createdBy: String(otherSeller._id) });
    expect(res.status).toBe(200);
    const items = res.body.payload.data;
    expect(items.length).toBe(1);
    expect(items[0].status).toBe(PRODUCT_STATUS.APPROVED);
    expect(items[0].isActive).toBe(true);
    // Ensure createdBy filter is applied
    expect(String(items[0].createdBy)).toBe(String(otherSeller._id));
    // Ensure we did authenticate as seller (optionalAuth) but still got restricted
    expect(String(seller._id)).not.toBe(String(otherSeller._id));
  });

  test('admin can see all products (no access limitation)', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    await Product.create({
      name: 'PendingInactive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: false,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'ApprovedActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'ApprovedInactive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: false,
      createdBy: seller._id,
    });

    const res = await getProducts({ role: USER_ROLES.ADMIN });
    expect(res.status).toBe(200);
    const items = res.body.payload.data;
    expect(items.length).toBe(3);
  });

  test('admin can filter by name/price/discount/isActive/isFeatured/status/categories/createdBy/quantity/date ranges', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const admin = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.ADMIN }));

    const catA = await Category.create({
      name: 'CatA',
      slug: `cat-a-${Date.now()}`,
      isActive: true,
    });
    const catB = await Category.create({
      name: 'CatB',
      slug: `cat-b-${Date.now()}`,
      isActive: true,
    });

    const inRange = await Product.create({
      name: 'MatchMe',
      description: 'd',
      price: 100,
      discountPrice: 80,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      isFeatured: true,
      quantity: 5,
      categories: [catA._id, catB._id],
      createdBy: seller._id,
    });
    const outRange = await Product.create({
      name: 'NoMatch',
      description: 'd',
      price: 999,
      discountPrice: 900,
      status: PRODUCT_STATUS.PENDING,
      isActive: false,
      isFeatured: false,
      quantity: 99,
      categories: [catA._id],
      createdBy: seller._id,
    });

    // Force timestamps to make date-range filters meaningful
    const inRangeDate = new Date('2024-06-01T00:00:00.000Z');
    const outRangeDate = new Date('2023-06-01T00:00:00.000Z');
    await Product.collection.updateOne(
      { _id: inRange._id },
      { $set: { createdAt: inRangeDate, updatedAt: inRangeDate } }
    );
    await Product.collection.updateOne(
      { _id: outRange._id },
      { $set: { createdAt: outRangeDate, updatedAt: outRangeDate } }
    );

    const res = await request(app)
      .get('/admin/products')
      .set(authHeader())
      .query({
        name: 'match',
        priceMin: 90,
        priceMax: 110,
        discountPriceMin: 70,
        discountPriceMax: 90,
        isActive: 'true',
        isFeatured: 'true',
        status: PRODUCT_STATUS.APPROVED,
        categories: [String(catA._id), String(catB._id)],
        createdBy: String(seller._id),
        quantityMin: 1,
        quantityMax: 10,
        createdAtFrom: '2024-01-01T00:00:00.000Z',
        createdAtTo: '2024-12-31T23:59:59.000Z',
        updatedAtFrom: '2024-01-01T00:00:00.000Z',
        updatedAtTo: '2024-12-31T23:59:59.000Z',
      });

    // Ensure this request is authenticated as admin (optionalAuth)
    expect(String(admin._id)).toBeTruthy();

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    const items = res.body.payload.data;
    expect(items.length).toBe(1);
    expect(String(items[0]._id)).toBe(String(inRange._id));
  });

  test('admin filters correctly with combined name + price', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    await authAs(jwtUtils, await seedUser({ role: USER_ROLES.ADMIN }));

    const matched = await Product.create({
      name: 'Laptop Pro 14',
      description: 'd',
      price: 1000,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'Laptop Pro 16',
      description: 'd',
      price: 2200,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'Phone Basic',
      description: 'd',
      price: 1000,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });

    const res = await request(app).get('/admin/products').set(authHeader()).query({
      name: 'laptop',
      priceMin: 900,
      priceMax: 1200,
    });

    expect(res.status).toBe(200);
    const items = res.body.payload.data;
    expect(items.length).toBe(1);
    expect(String(items[0]._id)).toBe(String(matched._id));
  });

  test('admin filters correctly with combined name + price + single category', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    await authAs(jwtUtils, await seedUser({ role: USER_ROLES.ADMIN }));
    const catPhone = await Category.create({
      name: 'Phone',
      slug: `phone-${Date.now()}`,
      isActive: true,
    });
    const catLaptop = await Category.create({
      name: 'Laptop',
      slug: `laptop-${Date.now()}`,
      isActive: true,
    });

    const matched = await Product.create({
      name: 'Laptop Air',
      description: 'd',
      price: 1200,
      categories: [catLaptop._id],
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'Laptop Air',
      description: 'd',
      price: 1200,
      categories: [catPhone._id],
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'Laptop Air Max',
      description: 'd',
      price: 2600,
      categories: [catLaptop._id],
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });

    const res = await request(app)
      .get('/admin/products')
      .set(authHeader())
      .query({
        name: 'laptop',
        priceMin: 1000,
        priceMax: 1500,
        categories: String(catLaptop._id),
      });

    expect(res.status).toBe(200);
    const items = res.body.payload.data;
    expect(items.length).toBe(1);
    expect(String(items[0]._id)).toBe(String(matched._id));
  });

  test('invalid token behaves like guest (optionalAuth)', async () => {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    await Product.create({
      name: 'ApprovedActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      createdBy: seller._id,
    });
    await Product.create({
      name: 'PendingActive',
      description: 'd',
      price: 10,
      status: PRODUCT_STATUS.PENDING,
      isActive: true,
      createdBy: seller._id,
    });

    mockTokenInvalid(jwtUtils);
    const res = await request(app).get('/admin/products').set(authHeader());
    expect(res.status).toBe(200);
    const items = res.body.payload.data;
    expect(items.length).toBe(1);
    expect(items[0].status).toBe(PRODUCT_STATUS.APPROVED);
    expect(items[0].isActive).toBe(true);
  });

  // --- Query validation ---

  test('400 when page is invalid', async () => {
    const res = await request(app).get('/admin/products').query({ page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Page must be a positive integer');
  });

  test('400 when createdBy is invalid', async () => {
    const res = await request(app).get('/admin/products').query({ createdBy: 'not-an-id' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('createdBy must be a valid ObjectId');
  });

  test('400 when categories contains invalid id', async () => {
    const res = await request(app).get('/admin/products').query({ categories: 'not-an-id' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Each category must be a valid ObjectId');
  });

  test('400 when status is not allowed', async () => {
    const res = await request(app).get('/admin/products').query({ status: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Status must be one of:');
  });
});
