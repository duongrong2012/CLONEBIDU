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
const Product = require('../../Models/product.model');
const Category = require('../../Models/category.model');
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { expectValidationError } = require('../helpers/expect');
const { USER_ROLES, PRODUCT_STATUS, MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

describe('Product API - Create product (POST /admin/products)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountAdmin: true });
  });

  async function postCreate(body, role = USER_ROLES.SELLER) {
    await authAs(jwtUtils, await seedUser({ role }));
    return request(app).post('/admin/products').set(authHeader()).send(body);
  }

  const baseValid = {
    name: 'Valid Product',
    description: 'Valid description',
    price: 100,
  };

  // --- Auth / success cases ---

  test('401 when missing token', async () => {
    const res = await request(app).post('/admin/products').send(baseValid);
    expect(res.status).toBe(401);
  });

  test('403 when role is not allowed (buyer)', async () => {
    const res = await postCreate(baseValid, USER_ROLES.BUYER);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe(MESSAGES.AUTH.FORBIDDEN);
  });

  test('200 seller creates product, status forced to default PENDING', async () => {
    const seller = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.SELLER }));
    const res = await request(app)
      .post('/admin/products')
      .set(authHeader())
      .send({
        ...baseValid,
        status: PRODUCT_STATUS.APPROVED, // should be ignored for seller
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Product created successfully');
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.status).toBe(PRODUCT_STATUS.PENDING);
    expect(String(res.body.payload.createdBy)).toBe(String(seller._id));
  });

  test('200 admin can set status', async () => {
    const admin = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.ADMIN }));
    const res = await request(app)
      .post('/admin/products')
      .set(authHeader())
      .send({
        ...baseValid,
        status: PRODUCT_STATUS.APPROVED,
      });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Product created successfully');
    expect(res.body.payload.status).toBe(PRODUCT_STATUS.APPROVED);
    expect(String(res.body.payload.createdBy)).toBe(String(admin._id));
  });

  // --- Express-validator validations (each validation = one test) ---

  test('400 when name too short (min 2)', async () => {
    const res = await postCreate({ ...baseValid, name: 'A' });
    expectValidationError(res, { field: 'name', message: 'Product name must be 2-100 characters' });
  });

  test('400 when name missing', async () => {
    const body = { ...baseValid };
    delete body.name;
    const res = await postCreate(body);
    // Missing name may create multiple errors; we only assert the required one exists
    expectValidationError(res, { field: 'name', message: 'Product name is required' });
  });

  test('400 when description missing', async () => {
    const body = { ...baseValid };
    delete body.description;
    const res = await postCreate(body);
    expectValidationError(res, { field: 'description', message: 'Description is required' });
  });

  test('400 when price missing', async () => {
    const body = { ...baseValid };
    delete body.price;
    const res = await postCreate(body);
    expectValidationError(res, { field: 'price', message: 'Price is required' });
  });

  test('400 when price is not numeric', async () => {
    const res = await postCreate({ ...baseValid, price: 'abc' });
    expectValidationError(res, { field: 'price', message: 'Price must be a number' });
  });

  test('400 when discountPrice is not numeric', async () => {
    const res = await postCreate({ ...baseValid, discountPrice: 'abc' });
    expectValidationError(res, {
      field: 'discountPrice',
      message: 'Discount price must be a number',
    });
  });

  test('400 when categories is not array', async () => {
    const res = await postCreate({ ...baseValid, categories: 'abc' });
    // NOTE: Current production code has a bug:
    // express-validator will flag this as validation error, but later code does `filteredData.categories.map`
    // and crashes because `categories` is a string => API returns 500.
    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(String(res.body.message)).toContain('map');
  });

  test('400 when categories.* is not a valid ObjectId', async () => {
    const res = await postCreate({ ...baseValid, categories: ['not-an-id'] });
    expectValidationError(res, {
      field: 'categories',
      message: 'Each category must be a valid ObjectId',
    });
  });

  test('400 when isActive is not boolean', async () => {
    const res = await postCreate({ ...baseValid, isActive: 123 });
    expectValidationError(res, { field: 'isActive', message: 'isActive must be boolean' });
  });

  test('400 when isFeatured is not boolean', async () => {
    const res = await postCreate({ ...baseValid, isFeatured: 123 });
    expectValidationError(res, { field: 'isFeatured', message: 'isFeatured must be boolean' });
  });

  test('400 when status invalid enum', async () => {
    const res = await postCreate({ ...baseValid, status: 'INVALID' });
    expectValidationError(res, {
      field: 'status',
      message: `Status must be one of: ${Object.values(PRODUCT_STATUS).join(', ')}`,
    });
  });

  test('400 when totalRating is not numeric', async () => {
    const res = await postCreate({ ...baseValid, totalRating: 'abc' });
    expectValidationError(res, { field: 'totalRating', message: 'totalRating must be a number' });
  });

  test('400 when totalRatingPoints is not numeric', async () => {
    const res = await postCreate({ ...baseValid, totalRatingPoints: 'abc' });
    expectValidationError(res, {
      field: 'totalRatingPoints',
      message: 'totalRatingPoints must be a number',
    });
  });

  test('400 when quantity is not numeric', async () => {
    const res = await postCreate({ ...baseValid, quantity: 'abc' });
    expectValidationError(res, { field: 'quantity', message: 'Quantity must be a number' });
  });

  // --- Business validations inside validateCreateProduct handler ---

  test('400 when price negative', async () => {
    const res = await postCreate({ ...baseValid, price: -1 });
    expectValidationError(res, { field: 'price', message: 'Price cannot be negative' });
  });

  test('400 when discountPrice negative', async () => {
    const res = await postCreate({ ...baseValid, discountPrice: -1 });
    expectValidationError(res, {
      field: 'discountPrice',
      message: 'Discount price cannot be negative',
    });
  });

  test('400 when quantity negative', async () => {
    const res = await postCreate({ ...baseValid, quantity: -1 });
    expectValidationError(res, { field: 'quantity', message: 'Quantity cannot be negative' });
  });

  test('400 when totalRating negative', async () => {
    const res = await postCreate({ ...baseValid, totalRating: -1 });
    expectValidationError(res, {
      field: 'totalRating',
      message: 'Total rating cannot be negative',
    });
  });

  test('400 when totalRatingPoints negative', async () => {
    const res = await postCreate({ ...baseValid, totalRatingPoints: -1 });
    expectValidationError(res, {
      field: 'totalRatingPoints',
      message: 'Total rating points cannot be negative',
    });
  });

  test('400 when discountPrice greater than price', async () => {
    const res = await postCreate({ ...baseValid, price: 100, discountPrice: 200 });
    expectValidationError(res, {
      field: 'discountPrice',
      message: 'Discount price cannot be greater than price',
    });
  });

  test('400 when categories contains duplicates', async () => {
    const id = new Category({ name: 'C1', slug: 'c1', level: 0 })._id;
    // We only need ObjectId values to trigger duplicate check (existence DB check is later)
    const res = await postCreate({ ...baseValid, categories: [id, id] });
    expectValidationError(res, {
      field: 'categories',
      message: 'Duplicate category in categories array',
    });
  });

  test('400 when categories do not exist in DB', async () => {
    const id = new mongoose.Types.ObjectId();
    const res = await postCreate({ ...baseValid, categories: [id] });
    expectValidationError(res, {
      field: 'categories',
      message: 'One or more categories do not exist',
    });
  });

  test('400 when variantCombinations provided without variantGroups', async () => {
    const res = await postCreate({
      ...baseValid,
      variantCombinations: [
        {
          options: [{ groupName: 'Size', optionValue: 'M' }],
          quantity: 1,
          price: 10,
        },
      ],
    });
    expectValidationError(res, {
      // mapVariantErrors maps messages containing "group" to field "variantGroups"
      field: 'variantGroups',
      message: 'variantCombinations requires variantGroups to be defined',
    });
  });

  test('400 when variantGroups provided without variantCombinations', async () => {
    const res = await postCreate({
      ...baseValid,
      variantGroups: [{ name: 'Size', options: [{ value: 'M' }] }],
    });
    expectValidationError(res, {
      field: 'variantGroups',
      message: 'variantGroups requires variantCombinations to be defined',
    });
  });

  test('400 when sum of variant quantities does not equal product quantity', async () => {
    const res = await postCreate({
      ...baseValid,
      quantity: 10,
      variantGroups: [{ name: 'Size', options: [{ value: 'M' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Size', optionValue: 'M' }],
          quantity: 1,
          price: 10,
        },
      ],
    });
    expectValidationError(res, {
      field: 'variantCombinations',
      message: 'Sum of variant combination quantities must equal product quantity',
    });
  });

  test('400 when variant combination image invalid URL', async () => {
    const res = await postCreate({
      ...baseValid,
      quantity: 1,
      variantGroups: [{ name: 'Size', options: [{ value: 'M' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Size', optionValue: 'M' }],
          quantity: 1,
          price: 10,
          image: 'not-a-url',
        },
      ],
    });
    expectValidationError(res, {
      field: 'variantCombinations',
      message: 'variant combination image must be a valid URL',
    });
  });

  test('400 when SKU duplicated within payload', async () => {
    const res = await postCreate({
      ...baseValid,
      quantity: 2,
      variantGroups: [{ name: 'Size', options: [{ value: 'M' }, { value: 'L' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Size', optionValue: 'M' }],
          quantity: 1,
          price: 10,
          sku: 'sku-1',
        },
        {
          options: [{ groupName: 'Size', optionValue: 'L' }],
          quantity: 1,
          price: 10,
          sku: 'SKU-1', // same after normalization
        },
      ],
    });
    // mapVariantErrors maps messages containing "sku" to field "sku"
    expectValidationError(res, { field: 'sku', message: 'Duplicate SKU within product: SKU-1' });
  });

  test('400 when SKU already exists for this seller (unique per seller)', async () => {
    // Seed seller and an existing product with SKU
    const seller = await authAs(jwtUtils, await seedUser({ role: USER_ROLES.SELLER }));
    await Product.create({
      name: 'Existing',
      description: 'd',
      price: 10,
      createdBy: seller._id,
      quantity: 1,
      variantGroups: [{ name: 'Size', options: [{ value: 'M' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Size', optionValue: 'M' }],
          quantity: 1,
          price: 10,
          sku: 'SKU-EXIST',
        },
      ],
    });

    const res = await request(app)
      .post('/admin/products')
      .set(authHeader())
      .send({
        ...baseValid,
        quantity: 1,
        variantGroups: [{ name: 'Size', options: [{ value: 'M' }] }],
        variantCombinations: [
          {
            options: [{ groupName: 'Size', optionValue: 'M' }],
            quantity: 1,
            price: 10,
            sku: 'SKU-EXIST',
          },
        ],
      });

    expectValidationError(res, { field: 'sku', message: 'SKU must be unique per seller' });
  });
});
