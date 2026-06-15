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
const uploadController = require('../../Controllers/upload.controller');
const uploadService = require('../../Services/upload.service');
const Media = require('../../Models/media.model');
const Category = require('../../Models/category.model');
const Product = require('../../Models/product.model');
const User = require('../../Models/user.model');
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { seedProduct } = require('../helpers/seed');
const { USER_ROLES, IMAGE_OWNER_TYPE, MEDIA_TYPE } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Upload API - /api/upload', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountUpload: true, mountAuth: false, mountAdmin: true });
  });

  async function asBuyer() {
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    await authAs(jwtUtils, buyer);
    return buyer;
  }

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

  async function asSeller() {
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    await authAs(jwtUtils, seller);
    return seller;
  }

  test('uploadFile returns success and failed lists', async () => {
    const spy = jest
      .spyOn(uploadService, 'uploadFile')
      .mockResolvedValueOnce({ url: 'u1', mediaId: 'm1', mediaType: 'IMAGE' })
      .mockRejectedValueOnce(new Error('bad'));
    const req = {
      files: [
        { originalname: 'a.png', mimetype: 'image/png', buffer: Buffer.from('x'), folder: 'IMAGE' },
        { originalname: 'b.png', mimetype: 'image/png', buffer: Buffer.from('y'), folder: 'IMAGE' },
      ],
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    uploadController.uploadFile(req, res, () => {});
    await new Promise(resolve => setImmediate(resolve));
    expect(res.statusCode).toBe(200);
    expect(res.payload.data).toHaveLength(1);
    expect(res.payload.failed).toEqual(['bad']);
    spy.mockRestore();
  });

  test('400 when upload product images productId invalid', async () => {
    await asSeller();
    const res = await request(app)
      .patch('/api/upload/product/not-an-id/images')
      .set(authHeader())
      .send({ mediaIds: [new mongoose.Types.ObjectId()] });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid product ID format');
  });

  test('400 when upload product images mediaIds empty', async () => {
    await asSeller();
    const res = await request(app)
      .patch(`/api/upload/product/${String(new mongoose.Types.ObjectId())}/images`)
      .set(authHeader())
      .send({ mediaIds: [] });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('mediaIds must be a non-empty array');
  });

  test('400 when upload product images mediaIds invalid', async () => {
    await asSeller();
    const res = await request(app)
      .patch(`/api/upload/product/${String(new mongoose.Types.ObjectId())}/images`)
      .set(authHeader())
      .send({ mediaIds: ['bad-id'] });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Each mediaId must be a valid ObjectId');
  });

  test('404 when upload product images product not found', async () => {
    await asSeller();
    const res = await request(app)
      .patch(`/api/upload/product/${String(new mongoose.Types.ObjectId())}/images`)
      .set(authHeader())
      .send({ mediaIds: [new mongoose.Types.ObjectId()] });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Product not found');
  });

  test('400 when upload product images duplicate mediaIds', async () => {
    await asSeller();
    const product = await seedProduct();
    const id = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/upload/product/${String(product._id)}/images`)
      .set(authHeader())
      .send({ mediaIds: [id, id] });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Duplicate mediaId in mediaIds array');
  });

  test('404 when upload product images media not found', async () => {
    await asSeller();
    const product = await seedProduct();
    const res = await request(app)
      .patch(`/api/upload/product/${String(product._id)}/images`)
      .set(authHeader())
      .send({ mediaIds: [new mongoose.Types.ObjectId()] });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('One or more media not found');
  });

  test('400 when upload product images media owned by another entity', async () => {
    await asSeller();
    const product = await seedProduct();
    const media = await Media.create({
      url: 'u',
      type: MEDIA_TYPE.IMAGE,
      ownerType: IMAGE_OWNER_TYPE.USER,
      ownerId: new mongoose.Types.ObjectId(),
    });
    const res = await request(app)
      .patch(`/api/upload/product/${String(product._id)}/images`)
      .set(authHeader())
      .send({ mediaIds: [String(media._id)] });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Media is already owned by another entity');
  });

  test('400 when upload product images media owned by another product', async () => {
    await asSeller();
    const product = await seedProduct();
    const otherProduct = await seedProduct();
    const media = await Media.create({
      url: 'u',
      type: MEDIA_TYPE.IMAGE,
      ownerType: IMAGE_OWNER_TYPE.PRODUCT,
      ownerId: otherProduct._id,
    });
    const res = await request(app)
      .patch(`/api/upload/product/${String(product._id)}/images`)
      .set(authHeader())
      .send({ mediaIds: [String(media._id)] });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Media is already owned by another product');
  });

  test('200 upload product images success', async () => {
    await asSeller();
    const product = await seedProduct();
    const media = await Media.create({ url: 'u', type: MEDIA_TYPE.IMAGE });
    const res = await request(app)
      .patch(`/api/upload/product/${String(product._id)}/images`)
      .set(authHeader())
      .send({ mediaIds: [String(media._id)] });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Product images updated successfully');
    expect(res.body.payload.success).toHaveLength(1);
  });

  test('500 when upload product images throws in validation', async () => {
    await asSeller();
    const product = await seedProduct();
    const spy = jest.spyOn(Product, 'findById').mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await request(app)
        .patch(`/api/upload/product/${String(product._id)}/images`)
        .set(authHeader())
        .send({ mediaIds: [new mongoose.Types.ObjectId()] });
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('db down');
    } finally {
      spy.mockRestore();
    }
  });

  test('400 when update user avatar invalid mediaId', async () => {
    await asBuyer();
    const res = await request(app)
      .patch('/api/upload/avatar')
      .set(authHeader())
      .send({ mediaId: 'bad-id' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid mediaId format');
  });

  test('404 when update user avatar media not found', async () => {
    await asBuyer();
    const res = await request(app)
      .patch('/api/upload/avatar')
      .set(authHeader())
      .send({ mediaId: String(new mongoose.Types.ObjectId()) });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Record not found');
  });

  test('200 update user avatar success', async () => {
    const buyer = await asBuyer();
    const media = await Media.create({ url: 'u', type: MEDIA_TYPE.IMAGE });
    const res = await request(app)
      .patch('/api/upload/avatar')
      .set(authHeader())
      .send({ mediaId: String(media._id) });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User avatar updated successfully');
    expect(res.body.data.avatar).toBe('u');

    const updated = await User.findById(buyer._id);
    expect(updated.avatar).toBe('u');
  });

  test('400 when update category image has invalid ids', async () => {
    await asAdmin();
    const res = await request(app)
      .patch('/api/upload/category/not-an-id/image')
      .set(authHeader())
      .send({ mediaId: 'bad-id' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid category ID format, Invalid media ID format');
  });

  test('404 when update category image category not found', async () => {
    await asAdmin();
    const media = await Media.create({ url: 'u', type: MEDIA_TYPE.IMAGE });
    const res = await request(app)
      .patch(`/api/upload/category/${String(new mongoose.Types.ObjectId())}/image`)
      .set(authHeader())
      .send({ mediaId: String(media._id) });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Category not found');
  });

  test('404 when update category image media not found', async () => {
    await asAdmin();
    const category = await Category.create({ name: 'Cat', slug: 'cat', level: 0 });
    const res = await request(app)
      .patch(`/api/upload/category/${String(category._id)}/image`)
      .set(authHeader())
      .send({ mediaId: String(new mongoose.Types.ObjectId()) });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Media not found');
  });

  test('400 when update category image media owned by another entity', async () => {
    await asAdmin();
    const category = await Category.create({ name: 'Cat', slug: 'cat', level: 0 });
    const media = await Media.create({
      url: 'u',
      type: MEDIA_TYPE.IMAGE,
      ownerType: IMAGE_OWNER_TYPE.USER,
      ownerId: new mongoose.Types.ObjectId(),
    });
    const res = await request(app)
      .patch(`/api/upload/category/${String(category._id)}/image`)
      .set(authHeader())
      .send({ mediaId: String(media._id) });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Media is already owned by another entity');
  });

  test('400 when update category image media owned by another category', async () => {
    await asAdmin();
    const category = await Category.create({ name: 'Cat', slug: 'cat', level: 0 });
    const otherCategory = await Category.create({ name: 'Cat2', slug: 'cat2', level: 0 });
    const media = await Media.create({
      url: 'u',
      type: MEDIA_TYPE.IMAGE,
      ownerType: IMAGE_OWNER_TYPE.CATEGORY,
      ownerId: otherCategory._id,
    });
    const res = await request(app)
      .patch(`/api/upload/category/${String(category._id)}/image`)
      .set(authHeader())
      .send({ mediaId: String(media._id) });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Media is already owned by another category');
  });

  test('200 update category image success', async () => {
    await asAdmin();
    const category = await Category.create({ name: 'Cat', slug: 'cat', level: 0 });
    const media = await Media.create({ url: 'u', type: MEDIA_TYPE.IMAGE });
    const res = await request(app)
      .patch(`/api/upload/category/${String(category._id)}/image`)
      .set(authHeader())
      .send({ mediaId: String(media._id) });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Category image updated successfully');
    expect(res.body.payload.image).toBe('u');
  });

  test('200 super admin update category image success', async () => {
    await asSuperAdmin();
    const category = await Category.create({ name: 'CatSuper', slug: 'cat-super', level: 0 });
    const media = await Media.create({ url: 'u-super', type: MEDIA_TYPE.IMAGE });
    const res = await request(app)
      .patch(`/api/upload/category/${String(category._id)}/image`)
      .set(authHeader())
      .send({ mediaId: String(media._id) });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Category image updated successfully');
    expect(res.body.payload.image).toBe('u-super');
  });
});
