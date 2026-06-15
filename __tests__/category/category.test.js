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
const Category = require('../../Models/category.model');
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { USER_ROLES, CATEGORY_LEVEL, MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Category API - Admin/Buer', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountAdmin: true, mountBuyer: true, mountAuth: false });
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

  test('401 when missing token for create category', async () => {
    const res = await request(app).post('/admin/categories').send({ name: 'Cat' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('400 when create category name too short', async () => {
    await asAdmin();
    const res = await request(app).post('/admin/categories').set(authHeader()).send({ name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Category name must be between 2 and 50 characters');
  });

  test('400 when create category parentId invalid', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/categories')
      .set(authHeader())
      .send({ name: 'Valid', parentId: 'bad-id' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid parent category ID');
  });

  test('404 when create category parent not found', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/categories')
      .set(authHeader())
      .send({ name: 'Valid', parentId: new mongoose.Types.ObjectId() });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Parent category not found');
  });

  test('400 when create category parent is grandchild', async () => {
    await asAdmin();
    const parent = await Category.create({
      name: 'Grand',
      slug: 'grand',
      level: CATEGORY_LEVEL.GRANDCHILD,
      isActive: true,
    });
    const res = await request(app)
      .post('/admin/categories')
      .set(authHeader())
      .send({ name: 'Valid', parentId: String(parent._id) });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot create category deeper than grandchild level');
  });

  test('201 create category success', async () => {
    await asAdmin();
    const res = await request(app)
      .post('/admin/categories')
      .set(authHeader())
      .send({ name: 'Electronics' });
    expect(res.status).toBe(201);
    expect(res.body.data).toBeTruthy();
    expect(res.body.data.name).toBe('Electronics');
  });

  test('201 super admin create category success', async () => {
    await asSuperAdmin();
    const res = await request(app)
      .post('/admin/categories')
      .set(authHeader())
      .send({ name: 'Office' });
    expect(res.status).toBe(201);
    expect(res.body.data).toBeTruthy();
    expect(res.body.data.name).toBe('Office');
  });

  test('400 when update category has no fields', async () => {
    await asAdmin();
    const cat = await Category.create({ name: 'Cat', slug: 'cat', level: 0, isActive: true });
    const res = await request(app).patch(`/admin/categories/${cat._id}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('No fields to update');
  });

  test('400 when update category has invalid isActive type', async () => {
    await asAdmin();
    const cat = await Category.create({ name: 'Cat', slug: 'cat', level: 0, isActive: true });
    const res = await request(app)
      .patch(`/admin/categories/${String(cat._id)}`)
      .send({ isActive: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('isActive must be a boolean value');
  });

  test('400 when update category id invalid', async () => {
    await asAdmin();
    const res = await request(app).patch('/admin/categories/not-an-id').send({ name: 'New' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid category id');
  });

  test('404 when update category not found', async () => {
    await asAdmin();
    const res = await request(app)
      .patch(`/admin/categories/${String(new mongoose.Types.ObjectId())}`)
      .send({ name: 'New' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Category not found');
  });

  test('400 when update category cannot change parent with children', async () => {
    await asAdmin();
    const parent = await Category.create({ name: 'Parent', slug: 'parent', level: 0 });
    const child = await Category.create({
      name: 'Child',
      slug: 'child',
      level: 1,
      parentId: parent._id,
      children: [new mongoose.Types.ObjectId()],
    });
    const res = await request(app)
      .patch(`/admin/categories/${String(child._id)}`)
      .send({ parentId: new mongoose.Types.ObjectId() });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot change parent of a category with children');
  });

  test('404 when update category new parent not found', async () => {
    await asAdmin();
    const cat = await Category.create({ name: 'Cat', slug: 'cat', level: 0 });
    const res = await request(app)
      .patch(`/admin/categories/${String(cat._id)}`)
      .send({ parentId: new mongoose.Types.ObjectId() });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Parent category not found');
  });

  test('400 when update category parent is grandchild', async () => {
    await asAdmin();
    const grand = await Category.create({
      name: 'Grand',
      slug: 'grand',
      level: CATEGORY_LEVEL.GRANDCHILD,
    });
    const cat = await Category.create({ name: 'Cat', slug: 'cat', level: 0 });
    const res = await request(app)
      .patch(`/admin/categories/${String(cat._id)}`)
      .send({ parentId: String(grand._id) });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot set parent to a grandchild category');
  });

  test('200 update category success', async () => {
    await asAdmin();
    const cat = await Category.create({ name: 'Cat', slug: 'cat', level: 0, isActive: true });
    const res = await request(app)
      .patch(`/admin/categories/${String(cat._id)}`)
      .send({ name: 'Cat2', isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Category updated successfully');
    expect(res.body.payload.name).toBe('Cat2');
  });

  test('400 when get categories search invalid', async () => {
    const res = await request(app).get('/buyer/categories').query({ search: 'a' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Search term must be between 2 and 50 characters');
  });

  test('200 get categories with filters', async () => {
    const root = await Category.create({ name: 'Root', slug: 'root', level: 0, isActive: true });
    const res = await request(app)
      .get('/buyer/categories')
      .query({ parentId: String(root._id), level: 0, isActive: true });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Categories retrieved successfully');
  });
});
