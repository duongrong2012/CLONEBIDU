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
const Cart = require('../../Models/cart.model');
const Product = require('../../Models/product.model');
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { seedProduct } = require('../helpers/seed');
const { USER_ROLES, PRODUCT_STATUS, MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Cart API - Buyer (/buyer/cart)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountBuyer: true, mountAuth: false });
  });

  async function asBuyer() {
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    await authAs(jwtUtils, buyer);
    return buyer;
  }

  function postCart(body) {
    return request(app).post('/buyer/cart').set(authHeader()).send(body);
  }

  function getCart(query = {}) {
    return request(app).get('/buyer/cart').set(authHeader()).query(query);
  }

  test('401 when missing token for add cart', async () => {
    const res = await request(app).post('/buyer/cart').send({});
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('400 when product id is invalid', async () => {
    await asBuyer();
    const res = await postCart({ product: 'not-an-id', quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid product id');
  });

  test('400 when quantity is not a non-negative integer', async () => {
    await asBuyer();
    const res = await postCart({ product: new mongoose.Types.ObjectId(), quantity: -1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Quantity must be a non-negative integer');
  });

  test('400 when quantity is not a number', async () => {
    await asBuyer();
    const res = await postCart({ product: new mongoose.Types.ObjectId(), quantity: '2' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Quantity must be a non-negative integer');
  });

  test('404 when product not found', async () => {
    await asBuyer();
    const res = await postCart({ product: new mongoose.Types.ObjectId(), quantity: 1 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Product not found');
  });

  test('400 when product is not approved or inactive', async () => {
    await asBuyer();
    const p = await seedProduct({ status: PRODUCT_STATUS.PENDING, isActive: true });
    const res = await postCart({ product: String(p._id), quantity: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Product must be approved and active to add to cart');
  });

  test('200 add product to cart (new item)', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    const res = await postCart({ product: String(p._id), quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product added to cart successfully');
    expect(res.body.payload).toBeTruthy();
    expect(String(res.body.payload.product._id)).toBe(String(p._id));
    expect(res.body.payload.quantity).toBe(2);

    const items = await Cart.find({ user: buyer._id, product: p._id });
    expect(items).toHaveLength(1);
  });

  test('200 add product to cart updates existing quantity', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    await postCart({ product: String(p._id), quantity: 1 });

    const res = await postCart({ product: String(p._id), quantity: 5 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product added to cart successfully');
    expect(res.body.payload.quantity).toBe(5);

    const items = await Cart.find({ user: buyer._id, product: p._id });
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  test('200 when quantity is 0, item is removed from cart', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    await Cart.create({ user: buyer._id, product: p._id, quantity: 2 });

    const res = await postCart({ product: String(p._id), quantity: 0 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product removed from cart successfully');
    expect(res.body.payload).toBe(null);

    const item = await Cart.findOne({ user: buyer._id, product: p._id });
    expect(item).toBeNull();
  });

  test('500 when product lookup throws error', async () => {
    await asBuyer();
    const spy = jest.spyOn(Product, 'findById').mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await postCart({ product: new mongoose.Types.ObjectId(), quantity: 1 });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('db down');
    } finally {
      spy.mockRestore();
    }
  });

  test('401 when missing token for get cart', async () => {
    const res = await request(app).get('/buyer/cart');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('400 when page is invalid', async () => {
    await asBuyer();
    const res = await getCart({ page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid page parameter');
  });

  test('400 when limit is invalid', async () => {
    await asBuyer();
    const res = await getCart({ limit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid limit parameter');
  });

  test('400 when sortBy is invalid', async () => {
    await asBuyer();
    const res = await getCart({ sortBy: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid sortBy parameter');
  });

  test('400 when sortOrder is invalid', async () => {
    await asBuyer();
    const res = await getCart({ sortOrder: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid sortOrder parameter');
  });

  test('200 get cart returns only current user items with populated product', async () => {
    const buyer = await asBuyer();
    const other = await seedUser({ role: USER_ROLES.BUYER });
    const p1 = await seedProduct();
    const p2 = await seedProduct();
    const p3 = await seedProduct();

    await Cart.create({ user: buyer._id, product: p1._id, quantity: 1 });
    await Cart.create({ user: buyer._id, product: p2._id, quantity: 2 });
    await Cart.create({ user: other._id, product: p3._id, quantity: 3 });

    const res = await getCart();
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Get cart successfully');
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.data).toHaveLength(2);
    expect(res.body.payload.pagination.total).toBe(2);

    const productIds = res.body.payload.data.map(item => String(item.product._id)).sort();
    expect(productIds).toEqual([String(p1._id), String(p2._id)].sort());
  });

  test('200 get cart supports pagination', async () => {
    const buyer = await asBuyer();
    const p1 = await seedProduct();
    const p2 = await seedProduct();

    await Cart.create({
      user: buyer._id,
      product: p1._id,
      quantity: 1,
    });
    await Cart.create({
      user: buyer._id,
      product: p2._id,
      quantity: 1,
    });

    const res = await getCart({ page: 2, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.payload.data).toHaveLength(1);
    expect(res.body.payload.pagination.page).toBe(2);
    expect(res.body.payload.pagination.limit).toBe(1);
  });

  test('200 get cart accepts ascending sortOrder', async () => {
    const buyer = await asBuyer();
    const p1 = await seedProduct();
    const p2 = await seedProduct();

    await Cart.create({ user: buyer._id, product: p1._id, quantity: 1 });
    await Cart.create({ user: buyer._id, product: p2._id, quantity: 1 });

    const res = await getCart({ sortBy: 'createdAt', sortOrder: 'ascending' });
    expect(res.status).toBe(200);
    expect(res.body.payload.data).toHaveLength(2);
  });
});
