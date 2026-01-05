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
const User = require('../../Models/user.model');
const jwtUtils = require('../../Utils/jwt.utils');
const { MESSAGES, GENDERS, TOKEN_TYPES } = require('../../Utils/constant');

// Use in-memory MongoDB for this suite
setupInMemoryMongo();

describe('Login API - Buyer (/auth-buyer/login)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validCreds = {
    email: 'login.user@example.com',
    password: 'Aa123456',
  };

  test('400 when email missing', async () => {
    const res = await request(app).post('/auth-buyer/login').send({ password: 'Aa123456' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
    const msgs = res.body.errors.map(e => e.msg);
    expect(msgs).toContain(MESSAGES.VALIDATION.REQUIRED_EMAIL);
  });

  test.each([
    'bad',
    'user@domain', // missing TLD
    'user@domain.', // trailing dot
    '@domain.com', // missing local part
    'name@@domain.com', // double @
    ' user@ex.com', // leading space
    'user@ex.com ', // trailing space
    'user@.com', // missing domain label
    'userdomain.com', // missing @
  ])('400 when email invalid format: %s', async invalid => {
    const res = await request(app)
      .post('/auth-buyer/login')
      .send({ email: invalid, password: 'Aa123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    // Ensure errors array and belongs to the 'email' field
    expect(Array.isArray(res.body.errors)).toBe(true);
    const msgs = res.body.errors.map(e => e.msg);
    const fields = res.body.errors.map(e => e.path || e.param).filter(Boolean);
    expect(msgs).toContain(MESSAGES.VALIDATION.INVALID_EMAIL);
    // express-validator uses 'param' or 'path' depending on version
    if (fields.length > 0) expect(fields.every(f => f === 'email')).toBe(true);
  });

  test('400 when password missing', async () => {
    const res = await request(app).post('/auth-buyer/login').send({ email: validCreds.email });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    const msgs = res.body.errors.map(e => e.msg);
    expect(msgs).toContain('Password is required');
  });

  test('400 when password too short', async () => {
    const res = await request(app)
      .post('/auth-buyer/login')
      .send({ email: validCreds.email, password: 'Aa123' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation failed');
    const msgs = res.body.errors.map(e => e.msg);
    expect(msgs).toContain('Password must be at least 6 characters long');
  });

  test('401 when user not found', async () => {
    const res = await request(app).post('/auth-buyer/login').send(validCreds);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  test('403 when account inactive', async () => {
    await User.create({
      email: validCreds.email,
      password: validCreds.password,
      firstName: 'Inactive',
      lastName: 'User',
      gender: GENDERS.MALE,
      isActive: false,
    });
    const res = await request(app).post('/auth-buyer/login').send(validCreds);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(MESSAGES.AUTH.ACCOUNT_INACTIVE);
  });

  test('401 when wrong password', async () => {
    await User.create({
      email: validCreds.email,
      password: validCreds.password,
      firstName: 'Wrong',
      lastName: 'Pass',
      gender: GENDERS.MALE,
    });
    const res = await request(app)
      .post('/auth-buyer/login')
      .send({ email: validCreds.email, password: 'Wrong123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.INVALID_CREDENTIALS);
  });

  test('200 when login successful returns tokens', async () => {
    // Seed active user
    await User.create({
      email: validCreds.email,
      password: validCreds.password,
      firstName: 'Login',
      lastName: 'Ok',
      gender: GENDERS.MALE,
    });
    // Mock token generation
    jwtUtils.generateToken
      .mockReturnValueOnce('access-token-123')
      .mockReturnValueOnce('refresh-token-456');

    const res = await request(app).post('/auth-buyer/login').send(validCreds);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Login successful');
    expect(res.body.payload.accessToken).toBe('access-token-123');
    expect(res.body.payload.refreshToken).toBe('refresh-token-456');
    expect(res.body.payload.tokenType).toBe(TOKEN_TYPES.BEARER);
  });
});
