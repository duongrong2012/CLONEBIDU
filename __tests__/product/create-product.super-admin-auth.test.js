/* eslint-env jest */
const { describe, test, expect, beforeAll } = require('@jest/globals');
const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-access-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

const { createTestApp, setupInMemoryMongo } = require('../index');
const jwtUtils = require('../../Utils/jwt.utils');
const { seedUser } = require('../helpers/auth');
const { USER_ROLES, PRODUCT_STATUS } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Product API - Super admin auth token (POST /admin/products)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountAdmin: true });
  });

  test('200 super admin creates product with real JWT access token', async () => {
    const superAdmin = await seedUser({ role: USER_ROLES.SUPER_ADMIN });
    const accessToken = jwtUtils.generateToken(superAdmin);

    const res = await request(app)
      .post('/admin/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Super Admin Product',
        description: 'Created by super admin with real jwt',
        price: 100,
        status: PRODUCT_STATUS.APPROVED,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Product created successfully');
    expect(res.body.payload.status).toBe(PRODUCT_STATUS.APPROVED);
    expect(String(res.body.payload.createdBy)).toBe(String(superAdmin._id));
  });

  test('200 super admin login token can create product', async () => {
    const superAdmin = await seedUser({
      role: USER_ROLES.SUPER_ADMIN,
      email: 'super.admin.auth@test.com',
      password: 'Aa123456',
    });

    const loginRes = await request(app).post('/auth-buyer/login').send({
      email: 'super.admin.auth@test.com',
      password: 'Aa123456',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.payload.accessToken).toBeTruthy();

    const res = await request(app)
      .post('/admin/products')
      .set('Authorization', `Bearer ${loginRes.body.payload.accessToken}`)
      .send({
        name: 'Super Admin Product By Login',
        description: 'Created by token from login endpoint',
        price: 200,
        status: PRODUCT_STATUS.APPROVED,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.payload.status).toBe(PRODUCT_STATUS.APPROVED);
    expect(String(res.body.payload.createdBy)).toBe(String(superAdmin._id));
  });
});
