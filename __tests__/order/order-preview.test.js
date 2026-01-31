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
const { expectValidationError } = require('../helpers/expect');

const Product = require('../../Models/product.model');
const Category = require('../../Models/category.model');
const Voucher = require('../../Models/voucher.model');
const Order = require('../../Models/order.model');
const {
  USER_ROLES,
  PRODUCT_STATUS,
  VOUCHER_STATUS,
  VOUCHER_SOURCE,
  VOUCHER_TARGET,
  VOUCHER_TYPE,
  DELIVERY_METHOD,
  ORDER_STATUS,
} = require('../../Utils/constant');

setupInMemoryMongo();

describe('Order API - Preview (POST /buyer/order-preview)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ mountBuyer: true, mountAuth: false });
  });

  async function asBuyer() {
    const buyer = await seedUser({ role: USER_ROLES.BUYER });
    await authAs(jwtUtils, buyer);
    return buyer;
  }

  async function seedCategory(name = 'Cat') {
    return Category.create({
      name,
      slug: `${name.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      isActive: true,
    });
  }

  async function seedProduct(overrides = {}) {
    const seller = overrides.seller ?? (await seedUser({ role: USER_ROLES.SELLER }));
    return Product.create({
      name: overrides.name ?? 'P',
      description: overrides.description ?? 'd',
      price: overrides.price ?? 100000,
      discountPrice: overrides.discountPrice,
      status: overrides.status ?? PRODUCT_STATUS.APPROVED,
      isActive: overrides.isActive ?? true,
      quantity: overrides.quantity ?? 10,
      categories: overrides.categories ?? [],
      createdBy: seller._id,
      variantGroups: overrides.variantGroups ?? [],
      variantCombinations: overrides.variantCombinations ?? [],
    });
  }

  async function seedVoucher(overrides = {}) {
    const creator = overrides.createdBy ?? (await seedUser({ role: USER_ROLES.ADMIN }));
    const now = Date.now();
    return Voucher.create({
      code: overrides.code ?? `VOUCHER_${now}`,
      type: overrides.type ?? VOUCHER_TYPE.FIXED,
      discountValue: overrides.discountValue ?? 10000,
      maxDiscount: overrides.maxDiscount ?? 0,
      minOrderValue: overrides.minOrderValue ?? 0,
      target: overrides.target ?? VOUCHER_TARGET.ORDER_DISCOUNT,
      applicableSellers: overrides.applicableSellers ?? [],
      applicableUsers: overrides.applicableUsers ?? [],
      applicableProducts: overrides.applicableProducts ?? [],
      applicableCategories: overrides.applicableCategories ?? [],
      startDate: overrides.startDate ?? new Date(Date.now() - 86400000),
      endDate: overrides.endDate ?? new Date(Date.now() + 86400000),
      quantity: overrides.quantity ?? 100,
      currentUsage: overrides.currentUsage ?? 0,
      usageLimitPerUser: overrides.usageLimitPerUser ?? 10,
      description: overrides.description,
      isActive: overrides.isActive ?? true,
      isPublic: overrides.isPublic ?? false,
      status: overrides.status ?? VOUCHER_STATUS.APPROVED,
      source: overrides.source ?? VOUCHER_SOURCE.SYSTEM,
      createdBy: creator._id,
    });
  }

  function previewBody(items, overrides = {}) {
    return {
      items,
      deliveryLocation: overrides.deliveryLocation ?? {
        fullName: 'Test',
        address: 'Test',
        phone: '0123456789',
      },
      deliveryMethod: overrides.deliveryMethod ?? DELIVERY_METHOD.STANDARD,
    };
  }

  test('401 when missing token', async () => {
    const res = await request(app).post('/buyer/order-preview').send({});
    expect(res.status).toBe(401);
  });

  test('400 when items missing', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send({
        deliveryLocation: { fullName: 'Test', address: 'Test', phone: '0123456789' },
        deliveryMethod: DELIVERY_METHOD.STANDARD,
      });
    expectValidationError(res, { field: 'items', message: 'items is required.' });
  });

  test('400 when items[].product is invalid MongoId', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: 'abc', quantity: 1 }]));
    expectValidationError(res, {
      field: 'items[0].product',
      message: 'items[].product must be a valid MongoId.',
    });
  });

  test('404 when product not found', async () => {
    await asBuyer();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: '507f1f77bcf86cd799439011', quantity: 1 }]));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Validation failed');
  });

  test('400 cannot order own product', async () => {
    const buyer = await asBuyer();
    const p = await Product.create({
      name: 'Own',
      description: 'd',
      price: 100000,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      quantity: 10,
      createdBy: buyer._id,
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'items',
      message: `Cannot order your own product: ${String(p._id)}`,
    });
  });

  test('400 when product inactive', async () => {
    await asBuyer();
    const p = await seedProduct({ isActive: false });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'items',
      message: `Product is inactive: ${String(p._id)}`,
    });
  });

  test('400 when product not approved', async () => {
    await asBuyer();
    const p = await seedProduct({ status: PRODUCT_STATUS.PENDING });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'items',
      message: `Product is not approved: ${String(p._id)}`,
    });
  });

  test('400 when requested quantity exceeds stock (no variants)', async () => {
    await asBuyer();
    const p = await seedProduct({ quantity: 2 });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: String(p._id), quantity: 3 }]));
    expectValidationError(res, {
      field: 'items',
      message: `Requested quantity (3) exceeds available stock (2) for product: ${String(p._id)}`,
    });
  });

  test('400 when product has variants but variantCombinationId missing', async () => {
    await asBuyer();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await seedProduct({
      seller,
      quantity: 5,
      variantGroups: [{ name: 'Size', options: [{ value: 'S' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Size', optionValue: 'S' }],
          quantity: 5,
          price: 100000,
          discountPrice: 80000,
          sku: `SKU-${Date.now()}-S`,
        },
      ],
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'items',
      message: `variantCombinationId is required for product: ${String(p._id)}`,
    });
  });

  test('400 when product has no variants but variantCombinationId provided', async () => {
    await asBuyer();
    const p = await seedProduct({ quantity: 10 });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(
        previewBody([
          { product: String(p._id), quantity: 1, variantCombinationId: '507f1f77bcf86cd799439011' },
        ])
      );
    expectValidationError(res, {
      field: 'items',
      message: `Product has no variants. Remove variantCombinationId for product: ${String(p._id)}`,
    });
  });

  test('400 when duplicate item (same product and variant) detected', async () => {
    await asBuyer();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await seedProduct({
      seller,
      quantity: 2,
      variantGroups: [{ name: 'Color', options: [{ value: 'Red' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Color', optionValue: 'Red' }],
          quantity: 2,
          price: 100000,
          sku: `SKU-${Date.now()}-RED`,
        },
      ],
    });
    const combId = String(p.variantCombinations[0]._id);
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(
        previewBody([
          { product: String(p._id), quantity: 1, variantCombinationId: combId },
          { product: String(p._id), quantity: 1, variantCombinationId: combId },
        ])
      );
    expectValidationError(res, {
      field: 'items',
      message: `Duplicate item (same product and variant) detected: ${String(p._id)}#${combId}`,
    });
  });

  test('400 when voucherOrderCode invalid format (must be uppercase)', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: 'abc' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Voucher code must be uppercase.',
    });
  });

  test('400 when voucherOrderCode contains both "_" and "-"', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: 'A_-B' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Voucher code cannot contain both underscore (_) and hyphen (-).',
    });
  });

  test('400 when voucherOrderCode and voucherShippingCode are the same', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: 'SAMECODE', voucherShippingCode: 'SAMECODE' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'voucherOrderCode and voucherShippingCode cannot be the same.',
    });
  });

  test('404 when voucher not found', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: 'NOTFOUND' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Validation failed');
  });

  test('403 when voucher applicableUsers does not include user', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'USER_ONLY',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      applicableUsers: ['507f1f77bcf86cd799439011'],
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors.some(e => e.field === 'voucherOrderCode')).toBe(true);
    // sanity: buyer is different user
    expect(String(buyer._id)).not.toBe('507f1f77bcf86cd799439011');
  });

  test('400 when voucher applicableSellers has no matching items', async () => {
    await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'SELLER_ONLY',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      applicableSellers: ['507f1f77bcf86cd799439011'],
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, { field: 'voucherOrderCode' });
  });

  test('400 when voucher minOrderValue not met', async () => {
    await asBuyer();
    const p = await seedProduct({ price: 10000, discountPrice: null });
    const v = await seedVoucher({
      code: 'MINORDER',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      minOrderValue: 999999,
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Order total does not meet voucher minimum order value',
    });
  });

  test('400 when voucher global usage limit reached', async () => {
    await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'LIMITED',
      quantity: 1,
      currentUsage: 1,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Voucher usage limit reached',
    });
  });

  test('400 when voucher status is not APPROVED', async () => {
    await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'REJECTED',
      status: VOUCHER_STATUS.REJECTED,
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, { field: 'voucherOrderCode', message: 'Voucher is not available' });
  });

  test('400 when voucher per-user usage limit reached', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'PERUSER',
      usageLimitPerUser: 1,
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
    });

    // Existing order (not cancelled) that used this voucher
    await Order.create({
      user: buyer._id,
      status: ORDER_STATUS.PENDING,
      shippingAddress: { fullName: 'Test', address: 'Test', phone: '0123456789' },
      paymentMethod: 'COD',
      voucherCode: [v.code],
      subtotal: 100000,
      totalPrice: 100000,
    });

    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));

    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Voucher usage limit per user reached',
    });
  });

  test('200 returns preview summary with order+shipping vouchers applied', async () => {
    await asBuyer();
    const cat = await seedCategory('ScopeCat');
    const p = await seedProduct({ price: 100000, discountPrice: 80000, categories: [cat._id] });
    const shippingVoucher = await seedVoucher({
      code: 'SHIP10',
      target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
      type: VOUCHER_TYPE.PERCENTAGE,
      discountValue: 10,
      maxDiscount: 5000,
    });
    const orderVoucher = await seedVoucher({
      code: 'ORDERFIX',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      type: VOUCHER_TYPE.FIXED,
      discountValue: 20000,
      applicableCategories: [cat._id],
    });

    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: orderVoucher.code, voucherShippingCode: shippingVoucher.code })
      .send(previewBody([{ product: String(p._id), quantity: 2 }]));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Order preview generated successfully');
    expect(res.body.payload).toBeTruthy();
    expect(res.body.payload.summary.subtotal).toBe(160000); // 80k * 2
    expect(res.body.payload.summary.discount).toBe(20000);
    expect(res.body.payload.summary.shippingFee).toBe(30000);
    expect(res.body.payload.summary.shippingDiscount).toBe(3000); // 10% of 30k, under max 5k
    expect(res.body.payload.summary.total).toBe(167000); // 160k - 20k + (30k - 3k)
  });

  test('200 shipping voucher FIXED caps at shipping fee', async () => {
    await asBuyer();
    const p = await seedProduct({ price: 100000, discountPrice: null });
    const shipVoucher = await seedVoucher({
      code: 'SHIP_FIXED',
      target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
      type: VOUCHER_TYPE.FIXED,
      discountValue: 999999, // larger than fee
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherShippingCode: shipVoucher.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));

    expect(res.status).toBe(200);
    expect(res.body.payload.summary.shippingFee).toBe(30000);
    expect(res.body.payload.summary.shippingDiscount).toBe(30000);
    expect(res.body.payload.summary.total).toBe(100000); // subtotal + (30k - 30k)
  });

  test('200 voucher eligibility filters out ineligible items (covers isItemEligible return false)', async () => {
    await asBuyer();
    const p1 = await seedProduct({ price: 100000, discountPrice: null, name: 'Eligible' });
    const p2 = await seedProduct({ price: 50000, discountPrice: null, name: 'Ineligible' });
    const v = await seedVoucher({
      code: 'SCOPE_ONE',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      type: VOUCHER_TYPE.FIXED,
      discountValue: 20000,
      applicableProducts: [p1._id],
    });

    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(
        previewBody([
          { product: String(p1._id), quantity: 1 },
          { product: String(p2._id), quantity: 1 },
        ])
      );

    expect(res.status).toBe(200);
    expect(res.body.payload.summary.subtotal).toBe(150000);
    expect(res.body.payload.summary.discount).toBe(20000); // applies only to p1 subtotal 100k
  });

  test('400 when items[].variantCombinationId is invalid MongoId', async () => {
    await asBuyer();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await seedProduct({
      seller,
      quantity: 2,
      variantGroups: [{ name: 'Size', options: [{ value: 'S' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Size', optionValue: 'S' }],
          quantity: 2,
          price: 100000,
          sku: `SKU-${Date.now()}-S1`,
        },
      ],
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: String(p._id), quantity: 1, variantCombinationId: 'abc' }]));
    expectValidationError(res, {
      field: 'items[0].variantCombinationId',
      message: 'items[].variantCombinationId must be a valid MongoId.',
    });
  });

  test('400 when voucherOrderCode contains invalid characters', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: 'ABC$' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Voucher code only allows A-Z, 0-9, underscore (_) or hyphen (-).',
    });
  });

  test('400 when voucherOrderCode has consecutive underscores/hyphens', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: 'AB__C' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Voucher code cannot contain two consecutive underscores or hyphens.',
    });
  });

  test('400 when voucherOrderCode starts or ends with underscore/hyphen', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: '_ABC' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Voucher code cannot start or end with an underscore or hyphen.',
    });
  });

  test('400 when requested quantity exceeds available stock for selected variant', async () => {
    await asBuyer();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await seedProduct({
      seller,
      quantity: 1,
      variantGroups: [{ name: 'Color', options: [{ value: 'Red' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Color', optionValue: 'Red' }],
          quantity: 1,
          price: 100000,
          sku: `SKU-${Date.now()}-Q`,
        },
      ],
    });
    const combId = String(p.variantCombinations[0]._id);
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: String(p._id), quantity: 2, variantCombinationId: combId }]));
    expectValidationError(res, {
      field: 'items',
      message: `Requested quantity (2) exceeds available stock (1) for selected variant of product: ${String(p._id)}`,
    });
  });

  test('400 when product is out of stock (no variants)', async () => {
    await asBuyer();
    const p = await seedProduct({ quantity: 0 });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'items',
      message: `Product is out of stock: ${String(p._id)}`,
    });
  });

  test('404 when voucherShippingCode not found', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherShippingCode: 'SHIP_NOTFOUND' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Validation failed');
  });

  test('400 when voucherShippingCode invalid format (must be uppercase)', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherShippingCode: 'abc' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherShippingCode',
      message: 'Voucher code must be uppercase.',
    });
  });

  test('400 when voucherShippingCode contains both "_" and "-"', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherShippingCode: 'A_-B' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherShippingCode',
      message: 'Voucher code cannot contain both underscore (_) and hyphen (-).',
    });
  });

  test('400 when voucherShippingCode has consecutive underscores/hyphens', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherShippingCode: 'AB--C' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherShippingCode',
      message: 'Voucher code cannot contain two consecutive underscores or hyphens.',
    });
  });

  test('400 when voucherShippingCode contains invalid characters', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherShippingCode: 'ABC$' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherShippingCode',
      message: 'Voucher code only allows A-Z, 0-9, underscore (_) or hyphen (-).',
    });
  });

  test('400 when voucherShippingCode starts or ends with underscore/hyphen', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherShippingCode: '-ABC' })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherShippingCode',
      message: 'Voucher code cannot start or end with an underscore or hyphen.',
    });
  });

  test('400 when shipping voucher minOrderValue not met', async () => {
    await asBuyer();
    const p = await seedProduct({ price: 10000, discountPrice: null });
    const v = await seedVoucher({
      code: 'SHIP_MIN',
      target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
      minOrderValue: 999999,
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherShippingCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherShippingCode',
      message: 'Order total does not meet voucher minimum order value',
    });
  });

  test('200 order voucher percentage respects maxDiscount and product scope', async () => {
    await asBuyer();
    const p = await seedProduct({ price: 100000, discountPrice: null });
    const v = await seedVoucher({
      code: 'PERC_MAX',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      type: VOUCHER_TYPE.PERCENTAGE,
      discountValue: 50, // 50%
      maxDiscount: 20000, // cap
      applicableProducts: [p._id],
    });

    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));

    expect(res.status).toBe(200);
    expect(res.body.payload.summary.subtotal).toBe(100000);
    expect(res.body.payload.summary.discount).toBe(20000); // capped
  });

  test('200 order voucher eligible by seller scope', async () => {
    await asBuyer();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await seedProduct({ seller, price: 100000, discountPrice: 90000 });
    const v = await seedVoucher({
      code: 'SELLER_SCOPE_OK',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      type: VOUCHER_TYPE.FIXED,
      discountValue: 10000,
      applicableSellers: [seller._id],
    });

    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));

    expect(res.status).toBe(200);
    expect(res.body.payload.summary.subtotal).toBe(90000);
    expect(res.body.payload.summary.discount).toBe(10000);
  });

  test('400 when voucher is not yet active (startDate in future)', async () => {
    await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'FUTURE',
      startDate: new Date(Date.now() + 86400000),
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, { field: 'voucherOrderCode', message: 'Voucher is not yet active' });
  });

  test('400 when voucher has expired (endDate in past)', async () => {
    await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'EXPIRED',
      endDate: new Date(Date.now() - 86400000),
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, { field: 'voucherOrderCode', message: 'Voucher has expired' });
  });

  test('400 when voucher is not available (inactive)', async () => {
    await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'INACTIVE',
      isActive: false,
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, { field: 'voucherOrderCode', message: 'Voucher is not available' });
  });

  test('400 when voucher target mismatch', async () => {
    await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'SHIP_AS_ORDER',
      target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: `Voucher target must be ${VOUCHER_TARGET.ORDER_DISCOUNT}`,
    });
  });

  test('400 when voucher product scope does not match any items', async () => {
    await asBuyer();
    const p = await seedProduct();
    const other = await seedProduct({ name: 'Other' });
    const v = await seedVoucher({
      code: 'PROD_SCOPE_MISS',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      applicableProducts: [other._id],
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, { field: 'voucherOrderCode' });
  });

  test('400 when voucher category scope does not match any items', async () => {
    await asBuyer();
    const cat = await seedCategory('CatX');
    const otherCat = await seedCategory('CatY');
    const p = await seedProduct({ categories: [cat._id] });
    const v = await seedVoucher({
      code: 'CAT_SCOPE_MISS',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      applicableCategories: [otherCat._id],
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, { field: 'voucherOrderCode' });
  });

  test('400 when voucher is not applicable to any items (zero subtotal)', async () => {
    await asBuyer();
    // price 0 -> itemTotal 0 -> diagnostic should report ineligible
    const p = await seedProduct({ price: 0, discountPrice: 0, quantity: 10 });
    const v = await seedVoucher({
      code: 'ZERO_SUBTOTAL',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      applicableProducts: [], // no scopes => diagnose uses eligibleSubtotal (0) -> fallback error
      applicableCategories: [],
      applicableSellers: [],
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .query({ voucherOrderCode: v.code })
      .send(previewBody([{ product: String(p._id), quantity: 1 }]));
    expectValidationError(res, { field: 'voucherOrderCode' });
  });

  test('400 when invalid variantCombinationId for variant product', async () => {
    await asBuyer();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await seedProduct({
      seller,
      quantity: 2,
      variantGroups: [{ name: 'Color', options: [{ value: 'Red' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Color', optionValue: 'Red' }],
          quantity: 2,
          price: 100000,
          sku: `SKU-${Date.now()}-R`,
        },
      ],
    });
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(
        previewBody([
          { product: String(p._id), quantity: 1, variantCombinationId: '507f1f77bcf86cd799439011' },
        ])
      );
    expectValidationError(res, { field: 'items' });
  });

  test('400 when selected variant is out of stock', async () => {
    await asBuyer();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await seedProduct({
      seller,
      quantity: 0,
      variantGroups: [{ name: 'Color', options: [{ value: 'Red' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Color', optionValue: 'Red' }],
          quantity: 0,
          price: 100000,
          sku: `SKU-${Date.now()}-OUT`,
        },
      ],
    });
    const combId = String(p.variantCombinations[0]._id);
    const res = await request(app)
      .post('/buyer/order-preview')
      .set(authHeader())
      .send(previewBody([{ product: String(p._id), quantity: 1, variantCombinationId: combId }]));
    expectValidationError(res, {
      field: 'items',
      message: `Variant is out of stock for product: ${String(p._id)}`,
    });
  });
});
