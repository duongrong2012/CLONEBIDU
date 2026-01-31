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
const Province = require('../../Models/province.model');
const Ward = require('../../Models/ward.model');

setupInMemoryMongo();

describe('Location API - Provinces/Wards', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountBuyer: true, mountAuth: false });
  });

  test('400 when provinces page is invalid', async () => {
    const res = await request(app).get('/buyer/provinces').query({ page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Page must be a positive integer.');
  });

  test('400 when provinces limit is invalid', async () => {
    const res = await request(app).get('/buyer/provinces').query({ limit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Limit must be a positive integer.');
  });

  test('200 get provinces returns data', async () => {
    await Province.create({
      code: '01',
      name: 'A',
      slug: 'a',
      type: 'city',
      name_with_type: 'City A',
    });
    await Province.create({
      code: '02',
      name: 'B',
      slug: 'b',
      type: 'city',
      name_with_type: 'City B',
    });

    const res = await request(app).get('/buyer/provinces');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Get provinces successfully');
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.data.data).toHaveLength(2);
  });

  test('200 get provinces accepts page and limit', async () => {
    const res = await request(app).get('/buyer/provinces').query({ page: 1, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
  });

  test('400 when wards page is invalid', async () => {
    const res = await request(app).get('/buyer/wards').query({ page: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Page must be a positive integer.');
  });

  test('400 when wards limit is invalid', async () => {
    const res = await request(app).get('/buyer/wards').query({ limit: 0 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Limit must be a positive integer.');
  });

  test('400 when wards parentCode is invalid', async () => {
    const res = await request(app).get('/buyer/wards').query({ parentCode: '' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('parentCode must be a non-empty string.');
  });

  test('200 get wards filters by parentCode', async () => {
    await Ward.create({
      code: 'w1',
      name: 'Ward 1',
      slug: 'ward-1',
      type: 'ward',
      name_with_type: 'Ward 1',
      path: 'Ward 1',
      path_with_type: 'Ward 1',
      parent_code: 'p1',
    });
    await Ward.create({
      code: 'w2',
      name: 'Ward 2',
      slug: 'ward-2',
      type: 'ward',
      name_with_type: 'Ward 2',
      path: 'Ward 2',
      path_with_type: 'Ward 2',
      parent_code: 'p2',
    });

    const res = await request(app).get('/buyer/wards').query({ parentCode: 'p1' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Get wards successfully');
    expect(res.body.payload.data).toHaveLength(1);
    expect(res.body.payload.data[0].code).toBe('w1');
  });

  test('200 get wards accepts page and limit', async () => {
    const res = await request(app).get('/buyer/wards').query({ page: 1, limit: 1 });
    expect(res.status).toBe(200);
    expect(res.body.payload).toBeTruthy();
  });
});
