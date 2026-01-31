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
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { USER_ROLES, MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Admin API - Users (/admin/users)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountAdmin: true, mountAuth: false });
  });

  async function asSuperAdmin() {
    const superAdmin = await seedUser({ role: USER_ROLES.SUPER_ADMIN });
    await authAs(jwtUtils, superAdmin);
    return superAdmin;
  }

  async function asAdmin() {
    const admin = await seedUser({ role: USER_ROLES.ADMIN });
    await authAs(jwtUtils, admin);
    return admin;
  }

  test('401 when missing token', async () => {
    const res = await request(app).get('/admin/users');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('403 when role is not allowed', async () => {
    await asAdmin();
    const res = await request(app).get('/admin/users').set(authHeader());
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(MESSAGES.AUTH.FORBIDDEN);
  });

  test('400 when get users has invalid page', async () => {
    await asSuperAdmin();
    const res = await request(app).get('/admin/users').set(authHeader()).query({ page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Page must be a positive integer');
  });

  test('400 when get users has invalid role', async () => {
    await asSuperAdmin();
    const res = await request(app).get('/admin/users').set(authHeader()).query({ role: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid role value');
  });

  test('400 when get users has invalid sortBy', async () => {
    await asSuperAdmin();
    const res = await request(app)
      .get('/admin/users')
      .set(authHeader())
      .query({ sortBy: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid sort field');
  });

  test('200 get users with name filter', async () => {
    await asSuperAdmin();
    await seedUser({ firstName: 'John', lastName: 'Doe' });
    const res = await request(app).get('/admin/users').set(authHeader()).query({ name: 'John' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Users retrieved successfully');
    expect(res.body.payload.data.length).toBeGreaterThan(0);
  });

  test('400 when update user email invalid', async () => {
    const admin = await asAdmin();
    const target = await seedUser({ role: USER_ROLES.BUYER });
    const res = await request(app)
      .patch(`/admin/users/${String(target._id)}`)
      .set(authHeader())
      .send({ email: 'bad-email' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.INVALID_EMAIL);
    expect(String(admin._id)).toBeDefined();
  });

  test('400 when update user has invalid id', async () => {
    await asAdmin();
    const res = await request(app)
      .patch('/admin/users/not-an-id')
      .set(authHeader())
      .send({ isActive: false });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid user id');
  });

  test('400 when update user has no fields', async () => {
    const admin = await asAdmin();
    const target = await seedUser({ role: USER_ROLES.BUYER });
    const res = await request(app)
      .patch(`/admin/users/${String(target._id)}`)
      .set(authHeader())
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.NO_FIELDS_TO_UPDATE);
    expect(String(admin._id)).toBeDefined();
  });

  test('404 when update user not found', async () => {
    await asAdmin();
    const res = await request(app)
      .patch('/admin/users/66f000000000000000000001')
      .set(authHeader())
      .send({ isActive: false });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe(MESSAGES.USER.NOT_FOUND);
  });

  test('400 when update user email already exists', async () => {
    await asAdmin();
    const userA = await seedUser({ email: 'a@test.com' });
    const userB = await seedUser({ email: 'b@test.com' });
    const res = await request(app)
      .patch(`/admin/users/${String(userA._id)}`)
      .set(authHeader())
      .send({ email: userB.email });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.AUTH.EMAIL_EXISTS);
  });

  test('200 update user isActive success', async () => {
    await asAdmin();
    const target = await seedUser({ role: USER_ROLES.BUYER, isActive: true });
    const res = await request(app)
      .patch(`/admin/users/${String(target._id)}`)
      .set(authHeader())
      .send({ isActive: false });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('User updated successfully');
    expect(res.body.payload.isActive).toBe(false);
  });
});
