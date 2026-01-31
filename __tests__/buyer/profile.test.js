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

describe('Buyer API - Profile (/buyer/profile)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountBuyer: true, mountAuth: false });
  });

  async function asBuyer() {
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    await authAs(jwtUtils, buyer);
    return buyer;
  }

  test('401 when missing token for get profile', async () => {
    const res = await request(app).get('/buyer/profile');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe(MESSAGES.AUTH.TOKEN_REQUIRED);
  });

  test('200 get profile returns user data', async () => {
    const buyer = await asBuyer();
    const res = await request(app).get('/buyer/profile').set(authHeader());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(MESSAGES.USER.PROFILE_RETRIEVED);
    expect(res.body.payload).toBeTruthy();
    expect(String(res.body.payload._id)).toBe(String(buyer._id));
  });

  test('400 when update profile has no fields', async () => {
    await asBuyer();
    const res = await request(app).patch('/buyer/profile').set(authHeader()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.NO_FIELDS_TO_UPDATE);
  });

  test('400 when update profile has invalid firstName', async () => {
    await asBuyer();
    const res = await request(app)
      .patch('/buyer/profile')
      .set(authHeader())
      .send({ firstName: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.FIRST_NAME_LENGTH);
  });

  test('400 when update profile has invalid gender', async () => {
    await asBuyer();
    const res = await request(app)
      .patch('/buyer/profile')
      .set(authHeader())
      .send({ gender: 'INVALID' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.INVALID_GENDER);
  });

  test('400 when update profile has invalid birthday format', async () => {
    await asBuyer();
    const res = await request(app)
      .patch('/buyer/profile')
      .set(authHeader())
      .send({ birthday: 'not-a-date' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.INVALID_BIRTHDAY_FORMAT);
  });

  test('400 when update profile birthday is under 13', async () => {
    await asBuyer();
    const recent = new Date();
    recent.setFullYear(recent.getFullYear() - 5);
    const res = await request(app)
      .patch('/buyer/profile')
      .set(authHeader())
      .send({ birthday: recent.toISOString().slice(0, 10) });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.VALIDATION.BIRTHDAY_AGE);
  });

  test('200 update profile success', async () => {
    await asBuyer();
    const res = await request(app).patch('/buyer/profile').set(authHeader()).send({
      firstName: 'Valid',
      lastName: 'Name',
      gender: 'MALE',
      birthday: '1990-01-01',
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(MESSAGES.USER.PROFILE_UPDATED);
    expect(res.body.payload.firstName).toBe('Valid');
  });
});
