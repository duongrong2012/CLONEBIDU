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
const { MESSAGES, TOKEN_TYPES, GENDERS } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Refresh Token API - Buyer (/auth-buyer/refresh-token)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('401 when missing refresh token', async () => {
    const res = await request(app).post('/auth-buyer/refresh-token');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('401 when invalid refresh token', async () => {
    jwtUtils.extractTokenFromBearer.mockReturnValue('bad-token');
    mockTokenInvalid(jwtUtils);
    const res = await request(app).post('/auth-buyer/refresh-token').set(authHeader('bad-token'));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.INVALID_TOKEN);
  });

  test('401 when refresh token expired', async () => {
    jwtUtils.extractTokenFromBearer.mockReturnValue('expired-token');
    mockTokenExpired(jwtUtils);
    const res = await request(app)
      .post('/auth-buyer/refresh-token')
      .set(authHeader('expired-token'));
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_EXPIRED);
  });

  test('404 when user in refresh token not found', async () => {
    jwtUtils.extractTokenFromBearer.mockReturnValue('rt');
    mockDecodedId(jwtUtils, '66f000000000000000000001', { type: TOKEN_TYPES.REFRESH });
    const res = await request(app).post('/auth-buyer/refresh-token').set(authHeader('rt'));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe(MESSAGES.USER.NOT_FOUND);
  });

  test('403 when user inactive', async () => {
    const u = await seedUser({
      email: 'inactive.rt@example.com',
      firstName: 'In',
      lastName: 'Active',
      gender: GENDERS.MALE,
      isActive: false,
    });
    jwtUtils.extractTokenFromBearer.mockReturnValue('rt');
    authAs(jwtUtils, u, { type: TOKEN_TYPES.REFRESH });
    const res = await request(app).post('/auth-buyer/refresh-token').set(authHeader('rt'));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(MESSAGES.AUTH.ACCOUNT_INACTIVE);
  });

  test('200 when refresh successful returns new access token', async () => {
    const u = await seedUser({
      email: 'ok.rt@example.com',
      firstName: 'Okay',
      lastName: 'Rt',
      gender: GENDERS.MALE,
    });
    jwtUtils.extractTokenFromBearer.mockReturnValue('rt');
    authAs(jwtUtils, u, { type: TOKEN_TYPES.REFRESH });
    jwtUtils.generateToken.mockReturnValue('new-access-token');
    const res = await request(app).post('/auth-buyer/refresh-token').set(authHeader('rt'));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Token refreshed successfully');
    expect(res.body.payload.accessToken).toBe('new-access-token');
  });
});
