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
const User = require('../../Models/user.model');
const Product = require('../../Models/product.model');
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { seedProduct } = require('../helpers/seed');
const { expectValidationError } = require('../helpers/expect');
const { USER_ROLES, PRODUCT_STATUS, MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Bookmark API - Buyer (/buyer/products/:productId/bookmark, /buyer/bookmarks)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountBuyer: true, mountAuth: false });
  });

  async function asBuyer() {
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    await authAs(jwtUtils, buyer);
    return buyer;
  }

  function postAdd(productId) {
    return request(app).post(`/buyer/products/${productId}/bookmark`).set(authHeader()).send();
  }

  function deleteRemove(productId) {
    return request(app).delete(`/buyer/products/${productId}/bookmark`).set(authHeader()).send();
  }

  function getBookmarks(query = {}) {
    return request(app).get('/buyer/bookmarks').set(authHeader()).query(query);
  }

  test('401 when missing token for add bookmark', async () => {
    const res = await request(app).post('/buyer/products/1/bookmark').send();
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('401 when missing token for remove bookmark', async () => {
    const res = await request(app).delete('/buyer/products/1/bookmark').send();
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('401 when missing token for get bookmarks', async () => {
    const res = await request(app).get('/buyer/bookmarks');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('400 when add bookmark has invalid product id', async () => {
    await asBuyer();
    const res = await postAdd('not-an-id');
    expectValidationError(res, { field: 'productId' });
  });

  test('404 when add bookmark product not found', async () => {
    await asBuyer();
    const res = await postAdd(new mongoose.Types.ObjectId());
    expect(res.status).toBe(404);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.PRODUCT_NOT_FOUND);
  });

  test('400 when add bookmark product is inactive', async () => {
    await asBuyer();
    const p = await seedProduct({ isActive: false });
    const res = await postAdd(String(p._id));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.PRODUCT_INACTIVE);
  });

  test('400 when add bookmark product is not approved', async () => {
    await asBuyer();
    const p = await seedProduct({ status: PRODUCT_STATUS.PENDING, isActive: true });
    const res = await postAdd(String(p._id));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.PRODUCT_UNAPPROVED);
  });

  test('400 when add bookmark is own product', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct({ seller: buyer });
    const res = await postAdd(String(p._id));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.OWN_PRODUCT);
  });

  test('400 when add bookmark already bookmarked', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    buyer.bookmarks = [p._id];
    await buyer.save();

    const res = await postAdd(String(p._id));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.ALREADY_BOOKMARKED);
  });

  test('201 add bookmark success', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    const res = await postAdd(String(p._id));
    expect(res.status).toBe(201);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.ADDED_SUCCESS);
    expect(res.body.payload.totalBookmarks).toBe(1);
    expect(res.body.payload.bookmarks.map(String)).toEqual([String(p._id)]);

    const updated = await User.findById(buyer._id);
    expect(updated.bookmarks.map(String)).toEqual([String(p._id)]);
  });

  test('500 when add bookmark service fails', async () => {
    await asBuyer();
    const p = await seedProduct();
    const spy = jest.spyOn(User, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('db'));
    try {
      const res = await postAdd(String(p._id));
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Failed to add bookmark');
    } finally {
      spy.mockRestore();
    }
  });

  test('400 when remove bookmark has invalid product id', async () => {
    await asBuyer();
    const res = await deleteRemove('not-an-id');
    expectValidationError(res, { field: 'productId' });
  });

  test('404 when remove bookmark product not found', async () => {
    await asBuyer();
    const res = await deleteRemove(new mongoose.Types.ObjectId());
    expect(res.status).toBe(404);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.PRODUCT_NOT_FOUND);
  });

  test('400 when remove bookmark not bookmarked', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await deleteRemove(String(p._id));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.NOT_BOOKMARKED);
  });

  test('200 remove bookmark success', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    buyer.bookmarks = [p._id];
    await buyer.save();

    const res = await deleteRemove(String(p._id));
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.REMOVED_SUCCESS);
    expect(res.body.payload.totalBookmarks).toBe(0);

    const updated = await User.findById(buyer._id);
    expect(updated.bookmarks).toHaveLength(0);
  });

  test('500 when remove bookmark service fails', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    buyer.bookmarks = [p._id];
    await buyer.save();
    const spy = jest.spyOn(User, 'findByIdAndUpdate').mockRejectedValueOnce(new Error('db'));
    try {
      const res = await deleteRemove(String(p._id));
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('Failed to remove bookmark');
    } finally {
      spy.mockRestore();
    }
  });

  test('400 when get bookmarks has invalid page', async () => {
    await asBuyer();
    const res = await getBookmarks({ page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Page must be a positive integer');
  });

  test('400 when get bookmarks has invalid limit', async () => {
    await asBuyer();
    const res = await getBookmarks({ limit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Limit must be between 1 and 100');
  });

  test('400 when get bookmarks has invalid sortOrder', async () => {
    await asBuyer();
    const res = await getBookmarks({ sortOrder: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('SortOrder must be either asc or desc');
  });

  test('404 when get bookmarks user not found after auth', async () => {
    const buyer = await asBuyer();
    const spy = jest.spyOn(User, 'findById');
    spy.mockResolvedValueOnce(buyer);
    spy.mockReturnValueOnce({ lean: () => Promise.resolve(null) });
    try {
      const res = await getBookmarks();
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('User not found');
    } finally {
      spy.mockRestore();
    }
  });

  test('200 get bookmarks accepts sortBy and sortOrder', async () => {
    const buyer = await asBuyer();
    const p1 = await seedProduct();
    const p2 = await seedProduct();
    buyer.bookmarks = [p1._id, p2._id];
    await buyer.save();

    const res = await getBookmarks({ sortBy: 'createdAt', sortOrder: 'desc' });
    expect(res.status).toBe(200);
    expect(res.body.payload.data).toHaveLength(2);
  });

  test('200 get bookmarks returns empty when no bookmarks', async () => {
    await asBuyer();
    const res = await getBookmarks();
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.FETCH_SUCCESS);
    expect(res.body.payload.data).toHaveLength(0);
    expect(res.body.payload.pagination.total).toBe(0);
  });

  test('200 get bookmarks returns bookmarked products', async () => {
    const buyer = await asBuyer();
    const p1 = await seedProduct();
    const p2 = await seedProduct();
    buyer.bookmarks = [p1._id, p2._id];
    await buyer.save();

    const res = await getBookmarks({ page: 1, limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(MESSAGES.BOOKMARK.FETCH_SUCCESS);
    expect(res.body.payload.data).toHaveLength(2);
    const ids = res.body.payload.data.map(item => String(item._id)).sort();
    expect(ids).toEqual([String(p1._id), String(p2._id)].sort());
  });
});
