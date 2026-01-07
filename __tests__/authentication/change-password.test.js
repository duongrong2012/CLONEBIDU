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
const {
  authHeader,
  seedUser,
  authAs,
  mockTokenInvalid,
  mockTokenExpired,
  mockDecodedId,
} = require('../helpers/auth');
const { VALID_CHANGE_PASSWORD_BODY } = require('./mocks/change-password.mock');
const { MESSAGES, GENDERS, USER_ROLES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Change Password API - Buyer (/auth-buyer/change-password)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('401 when missing access token', async () => {
    const res = await request(app)
      .post('/auth-buyer/change-password')
      .send(VALID_CHANGE_PASSWORD_BODY);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('401 when invalid access token', async () => {
    mockTokenInvalid(jwtUtils);
    const res = await request(app)
      .post('/auth-buyer/change-password')
      .set(authHeader('bad'))
      .send(VALID_CHANGE_PASSWORD_BODY);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.INVALID_TOKEN);
  });

  test('401 when token expired', async () => {
    mockTokenExpired(jwtUtils);
    const res = await request(app)
      .post('/auth-buyer/change-password')
      .set(authHeader('expired'))
      .send(VALID_CHANGE_PASSWORD_BODY);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_EXPIRED);
  });

  test('404 when user not found', async () => {
    mockDecodedId(jwtUtils, '66f000000000000000000001');
    const res = await request(app)
      .post('/auth-buyer/change-password')
      .set(authHeader('t'))
      .send(VALID_CHANGE_PASSWORD_BODY);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe(MESSAGES.USER.NOT_FOUND);
  });

  test('403 when user inactive', async () => {
    const u = await seedUser({
      email: 'inactive.cp@example.com',
      firstName: 'In',
      lastName: 'Active',
      gender: GENDERS.MALE,
      isActive: false,
      role: USER_ROLES.BUYER,
    });
    authAs(jwtUtils, u);
    const res = await request(app)
      .post('/auth-buyer/change-password')
      .set(authHeader('t'))
      .send(VALID_CHANGE_PASSWORD_BODY);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(MESSAGES.AUTH.ACCOUNT_INACTIVE);
  });

  test.each([
    'short', // length < 6
    'abcdef', // no uppercase, no digit
    'ABCDEF', // no lowercase, no digit
    'Abcdef', // no digit
    '123456', // no letters
    'AB1234', // no lowercase
    'ab1234', // no uppercase
  ])('400 when newPassword invalid (regex failed) -> %s', async invalidPwd => {
    const u = await seedUser({
      email: `regex.${String(invalidPwd).replace(/[^a-z0-9]/gi, '-')}.${Date.now()}@example.com`,
      firstName: 'Re',
      lastName: 'Gex',
      gender: GENDERS.MALE,
      role: USER_ROLES.BUYER,
    });
    authAs(jwtUtils, u);
    const res = await request(app)
      .post('/auth-buyer/change-password')
      .set(authHeader('t'))
      .send({ ...VALID_CHANGE_PASSWORD_BODY, newPassword: invalidPwd });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.PASSWORD_LENGTH);
  });

  test('400 when newPassword equals oldPassword', async () => {
    const u = await seedUser({
      email: 'dup.cp@example.com',
      firstName: 'Dup',
      lastName: 'Cp',
      gender: GENDERS.MALE,
      role: USER_ROLES.BUYER,
    });
    authAs(jwtUtils, u);
    const res = await request(app)
      .post('/auth-buyer/change-password')
      .set(authHeader('t'))
      .send({ ...VALID_CHANGE_PASSWORD_BODY, newPassword: VALID_CHANGE_PASSWORD_BODY.oldPassword });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.AUTH.PASSWORD_DUPLICATE);
  });

  test('401 when old password incorrect', async () => {
    const u = await seedUser({
      email: 'wrong.cp@example.com',
      firstName: 'Wrong',
      lastName: 'Old',
      gender: GENDERS.MALE,
      role: USER_ROLES.BUYER,
    });
    authAs(jwtUtils, u);
    const res = await request(app)
      .post('/auth-buyer/change-password')
      .set(authHeader('t'))
      .send({ ...VALID_CHANGE_PASSWORD_BODY, oldPassword: 'Cc123456' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.INVALID_PASSWORD);
  });

  test('200 when password changed successfully', async () => {
    const u = await seedUser({
      email: 'ok.cp@example.com',
      firstName: 'Ok',
      lastName: 'Cp',
      gender: GENDERS.MALE,
      role: USER_ROLES.BUYER,
    });
    authAs(jwtUtils, u);
    const res = await request(app)
      .post('/auth-buyer/change-password')
      .set(authHeader('t'))
      .send(VALID_CHANGE_PASSWORD_BODY);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe(MESSAGES.AUTH.PASSWORD_CHANGED);
  });
});
