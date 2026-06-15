/* eslint-env jest */
/* global jest */
const { describe, test, expect, beforeAll, beforeEach, afterAll } = require('@jest/globals');

const request = require('supertest');
const axios = require('axios');

jest.mock('axios');
jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const { createTestApp, setupInMemoryMongo } = require('../index');
const User = require('../../Models/user.model');
const jwtUtils = require('../../Utils/jwt.utils');
const { AUTH_PROVIDERS, MESSAGES, TOKEN_TYPES, GENDERS } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Social Login API - Buyer (/auth-buyer/social-login)', () => {
  let app;
  const originalGoogleClientIds = process.env.GOOGLE_CLIENT_IDS;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_IDS =
      'google-web-client-id, google-android-client-id, google-ios-client-id';
    jwtUtils.generateToken
      .mockReturnValueOnce('access-token-123')
      .mockReturnValueOnce('refresh-token-456');
  });

  afterAll(() => {
    if (originalGoogleClientIds === undefined) {
      delete process.env.GOOGLE_CLIENT_IDS;
      return;
    }
    process.env.GOOGLE_CLIENT_IDS = originalGoogleClientIds;
  });

  test('400 when provider is invalid', async () => {
    const res = await request(app)
      .post('/auth-buyer/social-login')
      .send({ provider: 'apple', token: 'token' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toContainEqual({
      field: 'provider',
      message: 'Provider must be either google or facebook',
    });
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('400 when token is missing', async () => {
    const res = await request(app)
      .post('/auth-buyer/social-login')
      .send({ provider: AUTH_PROVIDERS.GOOGLE });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toContainEqual({
      field: 'token',
      message: 'Social login token is required',
    });
  });

  test('401 when provider rejects token', async () => {
    axios.get.mockRejectedValueOnce(new Error('invalid token'));

    const res = await request(app)
      .post('/auth-buyer/social-login')
      .send({ provider: AUTH_PROVIDERS.GOOGLE, token: 'bad-token' });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN);
  });

  test('500 when Google client IDs are not configured', async () => {
    delete process.env.GOOGLE_CLIENT_IDS;

    const res = await request(app)
      .post('/auth-buyer/social-login')
      .send({ provider: AUTH_PROVIDERS.GOOGLE, token: 'google-id-token' });

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe(MESSAGES.AUTH.GOOGLE_SOCIAL_LOGIN_NOT_CONFIGURED);
    expect(axios.get).not.toHaveBeenCalled();
  });

  test('401 when Google token audience is not allowed', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        sub: 'google-user-123',
        email: 'google.user@example.com',
        email_verified: true,
        aud: 'unknown-google-client-id',
      },
    });

    const res = await request(app)
      .post('/auth-buyer/social-login')
      .send({ provider: AUTH_PROVIDERS.GOOGLE, token: 'google-id-token' });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN);
    expect(await User.countDocuments()).toBe(0);
  });

  test('200 creates user from Google token and returns tokens', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        sub: 'google-user-123',
        email: 'Google.User@Example.com',
        email_verified: 'true',
        given_name: 'Google',
        family_name: 'User',
        picture: 'https://example.com/google-avatar.png',
        aud: 'google-android-client-id',
      },
    });

    const res = await request(app)
      .post('/auth-buyer/social-login')
      .send({ provider: AUTH_PROVIDERS.GOOGLE, token: 'google-id-token' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe(MESSAGES.AUTH.SOCIAL_LOGIN_SUCCESS);
    expect(res.body.payload).toMatchObject({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      tokenType: TOKEN_TYPES.BEARER,
    });

    const user = await User.findOne({ email: 'google.user@example.com' });
    expect(user).toBeTruthy();
    expect(user.googleId).toBe('google-user-123');
    expect(user.authProvider).toBe(AUTH_PROVIDERS.GOOGLE);
    expect(user.isEmailVerified).toBe(true);
    expect(user.avatar).toBe('https://example.com/google-avatar.png');
  });

  test('200 links Google provider to existing local user', async () => {
    await User.create({
      email: 'local.user@example.com',
      password: 'Aa123456',
      firstName: 'Local',
      lastName: 'User',
      gender: GENDERS.OTHER,
      authProvider: AUTH_PROVIDERS.LOCAL,
    });
    axios.get.mockResolvedValueOnce({
      data: {
        sub: 'google-local-123',
        email: 'local.user@example.com',
        email_verified: true,
        name: 'Local User',
        aud: 'google-ios-client-id',
      },
    });

    const res = await request(app)
      .post('/auth-buyer/social-login')
      .send({ provider: AUTH_PROVIDERS.GOOGLE, token: 'google-id-token' });

    expect(res.status).toBe(200);

    const users = await User.find({ email: 'local.user@example.com' });
    expect(users).toHaveLength(1);
    expect(users[0].googleId).toBe('google-local-123');
    expect(users[0].authProvider).toBe(AUTH_PROVIDERS.LOCAL);
  });

  test('403 when matched user account is inactive', async () => {
    await User.create({
      email: 'inactive.social@example.com',
      password: 'Aa123456',
      firstName: 'Inactive',
      lastName: 'User',
      gender: GENDERS.OTHER,
      isActive: false,
    });
    axios.get.mockResolvedValueOnce({
      data: {
        sub: 'google-inactive-123',
        email: 'inactive.social@example.com',
        email_verified: true,
        name: 'Inactive User',
        aud: 'google-web-client-id',
      },
    });

    const res = await request(app)
      .post('/auth-buyer/social-login')
      .send({ provider: AUTH_PROVIDERS.GOOGLE, token: 'google-id-token' });

    expect(res.status).toBe(403);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe(MESSAGES.AUTH.ACCOUNT_INACTIVE);

    const user = await User.findOne({ email: 'inactive.social@example.com' });
    expect(user.googleId).toBeUndefined();
  });

  test('200 creates user from Facebook token and returns tokens', async () => {
    axios.get.mockResolvedValueOnce({
      data: {
        id: 'facebook-user-123',
        email: 'facebook.user@example.com',
        first_name: 'Facebook',
        last_name: 'User',
        picture: {
          data: {
            url: 'https://example.com/facebook-avatar.png',
          },
        },
      },
    });

    const res = await request(app)
      .post('/auth-buyer/social-login')
      .send({ provider: AUTH_PROVIDERS.FACEBOOK, token: 'facebook-access-token' });

    expect(res.status).toBe(200);
    expect(res.body.payload.accessToken).toBe('access-token-123');

    const user = await User.findOne({ email: 'facebook.user@example.com' });
    expect(user).toBeTruthy();
    expect(user.facebookId).toBe('facebook-user-123');
    expect(user.authProvider).toBe(AUTH_PROVIDERS.FACEBOOK);
    expect(user.avatar).toBe('https://example.com/facebook-avatar.png');
  });
});
