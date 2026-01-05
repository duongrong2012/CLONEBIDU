/* eslint-env jest */
/* global jest */
const { describe, test, expect, beforeAll, beforeEach } = require('@jest/globals');

const request = require('supertest');
const mongoose = require('mongoose');

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const { createTestApp, setupInMemoryMongo } = require('../index');
const User = require('../../Models/user.model');
const jwtUtils = require('../../Utils/jwt.utils');
const {
  authHeader,
  seedUser,
  authAs,
  mockTokenInvalid,
  mockTokenExpired,
  mockDecodedId,
} = require('../helpers/auth');
const { MESSAGES, USER_ROLES, GENDERS } = require('../../Utils/constant');

// Global setup for this module
setupInMemoryMongo();

describe('Register API - Buyer (/auth-buyer/register)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseValidBody = {
    email: 'john.doe@example.com',
    password: 'Aa123456',
    firstName: 'John',
    lastName: 'Doe',
    gender: GENDERS.MALE,
  };

  test('400 when firstName missing', async () => {
    const body = { ...baseValidBody };
    delete body.firstName;
    const res = await request(app).post('/auth-buyer/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.REQUIRED_FIRST_NAME);
  });

  test('400 when lastName missing', async () => {
    const body = { ...baseValidBody };
    delete body.lastName;
    const res = await request(app).post('/auth-buyer/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.REQUIRED_LAST_NAME);
  });

  test('400 when gender missing', async () => {
    const body = { ...baseValidBody };
    delete body.gender;
    const res = await request(app).post('/auth-buyer/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.REQUIRED_GENDER);
  });

  test('400 when email missing', async () => {
    const body = { ...baseValidBody };
    delete body.email;
    const res = await request(app).post('/auth-buyer/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.REQUIRED_EMAIL);
  });

  test.each([
    'name@domain',
    'name@domain.',
    '@domain.com',
    'name@@domain.com',
    'name domain@ex.com',
    'invalid-email',
  ])('400 when email invalid shape: %s', async invalidEmail => {
    const body = { ...baseValidBody, email: invalidEmail };
    const res = await request(app).post('/auth-buyer/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.INVALID_EMAIL);
  });

  test.each(['a@b.co', 'user.name+tag@sub.domain.com', 'USER@EXAMPLE.COM', 'u-1_2@d.co'])(
    '201 when email valid shape: %s',
    async validEmail => {
      const body = { ...baseValidBody, email: validEmail };
      const res = await request(app).post('/auth-buyer/register').send(body);
      expect(res.status).toBe(201);
      expect(res.body.message).toBe(MESSAGES.AUTH.REGISTER_SUCCESS);
      const found = await User.findOne({ email: validEmail.toLowerCase() });
      expect(found).toBeTruthy();
    }
  );

  test('400 when password missing', async () => {
    const body = { ...baseValidBody };
    delete body.password;
    const res = await request(app).post('/auth-buyer/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.REQUIRED_PASSWORD);
  });

  test('400 when password weak (regex failed)', async () => {
    const body = { ...baseValidBody, password: 'weakpw' };
    const res = await request(app).post('/auth-buyer/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.PASSWORD_LENGTH);
  });

  test('400 when gender invalid', async () => {
    const body = { ...baseValidBody, gender: 'UNKNOWN' };
    const res = await request(app).post('/auth-buyer/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.INVALID_GENDER);
  });

  test('400 when email already exists', async () => {
    await User.create({
      email: baseValidBody.email,
      password: 'Aa123456',
      firstName: 'Seed',
      lastName: 'User',
      gender: GENDERS.MALE,
    });
    const res = await request(app).post('/auth-buyer/register').send(baseValidBody);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.AUTH.EMAIL_EXISTS);
  });

  test('201 when registration succeeds', async () => {
    const res = await request(app).post('/auth-buyer/register').send(baseValidBody);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe(MESSAGES.AUTH.REGISTER_SUCCESS);
    const created = await User.findOne({ email: baseValidBody.email });
    expect(created).toBeTruthy();
    expect(created.password).toBeDefined();
    expect(created.password).not.toBe(baseValidBody.password);
  });
});

describe('Register API - Admin (/auth-admin/register)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseValidBody = {
    email: 'admin.new@example.com',
    password: 'Aa123456',
    firstName: 'Alice',
    lastName: 'Admin',
    gender: GENDERS.FEMALE,
  };

  test('401 when missing token of super admin', async () => {
    const res = await request(app).post('/auth-admin/register').send(baseValidBody);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('401 when invalid token', async () => {
    mockTokenInvalid(jwtUtils);
    const res = await request(app)
      .post('/auth-admin/register')
      .set(authHeader())
      .send(baseValidBody);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.INVALID_TOKEN);
  });

  test('401 when token expired', async () => {
    mockTokenExpired(jwtUtils);
    const res = await request(app)
      .post('/auth-admin/register')
      .set(authHeader())
      .send(baseValidBody);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_EXPIRED);
  });

  test('404 when user in token not found', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    mockDecodedId(jwtUtils, fakeId);
    const res = await request(app)
      .post('/auth-admin/register')
      .set(authHeader())
      .send(baseValidBody);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe(MESSAGES.USER.NOT_FOUND);
  });

  test('403 when role not SUPER_ADMIN', async () => {
    const admin = await seedUser({ role: USER_ROLES.ADMIN });
    authAs(jwtUtils, admin);
    const res = await request(app)
      .post('/auth-admin/register')
      .set(authHeader())
      .send(baseValidBody);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(MESSAGES.AUTH.FORBIDDEN);
  });

  test('400 validation error after auth (missing firstName)', async () => {
    const superAdmin = await seedUser({ role: USER_ROLES.SUPER_ADMIN });
    authAs(jwtUtils, superAdmin);
    const body = { ...baseValidBody };
    delete body.firstName;
    const res = await request(app).post('/auth-admin/register').set(authHeader()).send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.REQUIRED_FIRST_NAME);
  });

  test('400 when new admin email already exists', async () => {
    const superAdmin = await seedUser({ role: USER_ROLES.SUPER_ADMIN });
    authAs(jwtUtils, superAdmin);
    await seedUser({ email: baseValidBody.email, role: USER_ROLES.BUYER });
    const res = await request(app)
      .post('/auth-admin/register')
      .set(authHeader())
      .send(baseValidBody);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.AUTH.EMAIL_EXISTS);
  });

  test('201 when admin registration succeeds', async () => {
    const superAdmin = await seedUser({ role: USER_ROLES.SUPER_ADMIN });
    authAs(jwtUtils, superAdmin);
    const res = await request(app)
      .post('/auth-admin/register')
      .set(authHeader())
      .send(baseValidBody);
    expect(res.status).toBe(201);
    expect(res.body.message).toBe(MESSAGES.AUTH.REGISTER_SUCCESS);
    const created = await User.findOne({ email: baseValidBody.email });
    expect(created).toBeTruthy();
    expect(created.role).toBe(USER_ROLES.ADMIN);
    expect(created.isActive).toBe(true);
    expect(created.password).toBeDefined();
    expect(created.password).not.toBe(baseValidBody.password);
  });
});
