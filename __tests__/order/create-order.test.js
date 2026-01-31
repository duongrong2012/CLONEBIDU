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
const { authHeader, seedUser, authAs } = require('../helpers/auth');
const { expectValidationError } = require('../helpers/expect');

const Product = require('../../Models/product.model');
const Category = require('../../Models/category.model');
const Voucher = require('../../Models/voucher.model');
const Order = require('../../Models/order.model');
const OrderDetail = require('../../Models/order-detail.model');
const {
  USER_ROLES,
  PRODUCT_STATUS,
  VOUCHER_STATUS,
  VOUCHER_SOURCE,
  VOUCHER_TARGET,
  VOUCHER_TYPE,
  DELIVERY_METHOD,
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
  ORDER_STATUS,
} = require('../../Utils/constant');

setupInMemoryMongo();

describe('Order API - Create (POST /buyer/orders)', () => {
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

  function baseBody(items, overrides = {}) {
    return {
      items,
      deliveryLocation: overrides.deliveryLocation ?? {
        fullName: 'Test',
        address: 'Test',
        phone: '0123456789',
      },
      deliveryMethod: overrides.deliveryMethod ?? DELIVERY_METHOD.STANDARD,
      paymentMethod: overrides.paymentMethod,
      paymentProvider: overrides.paymentProvider,
    };
  }

  async function postCreate(body, query = {}) {
    return request(app).post('/buyer/orders').set(authHeader()).query(query).send(body);
  }

  test('401 when missing token', async () => {
    const res = await request(app).post('/buyer/orders').send({});
    expect(res.status).toBe(401);
  });

  test('400 when paymentMethod missing', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/orders')
      .set(authHeader())
      .send(baseBody([{ product: String(p._id), quantity: 1 }], { paymentMethod: undefined }));
    expectValidationError(res, { field: 'paymentMethod', message: 'paymentMethod is required.' });
  });

  test('400 when paymentMethod invalid', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/orders')
      .set(authHeader())
      .send(baseBody([{ product: String(p._id), quantity: 1 }], { paymentMethod: 'INVALID' }));
    expectValidationError(res, { field: 'paymentMethod' });
  });

  test('400 when paymentProvider missing for ONLINE', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await request(app)
      .post('/buyer/orders')
      .set(authHeader())
      .send(
        baseBody([{ product: String(p._id), quantity: 1 }], {
          paymentMethod: PAYMENT_METHOD.ONLINE,
        })
      );
    expectValidationError(res, {
      field: 'paymentProvider',
      message: 'paymentProvider is required when paymentMethod is ONLINE.',
    });
  });

  test('400 when paymentProvider invalid enum', async () => {
    await asBuyer();
    const p = await seedProduct();
    const res = await postCreate(
      baseBody([{ product: String(p._id), quantity: 1 }], {
        paymentMethod: PAYMENT_METHOD.ONLINE,
        paymentProvider: 'INVALID_PROVIDER',
      })
    );
    expectValidationError(res, { field: 'paymentProvider' });
  });

  test('400 when requested quantity exceeds product stock (create order)', async () => {
    await asBuyer();
    const p = await seedProduct({ quantity: 1 });
    const res = await postCreate(
      baseBody([{ product: String(p._id), quantity: 2 }], {
        paymentMethod: PAYMENT_METHOD.COD,
      })
    );
    expectValidationError(res, {
      field: 'items',
      message: `Requested quantity (2) exceeds available stock (1) for product: ${String(p._id)}`,
    });
  });

  test('400 when requested quantity exceeds variant stock (create order)', async () => {
    await asBuyer();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const p = await seedProduct({
      seller,
      quantity: 1,
      variantGroups: [{ name: 'Size', options: [{ value: 'S' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Size', optionValue: 'S' }],
          quantity: 1,
          price: 100000,
          sku: `SKU-${Date.now()}-VS2`,
        },
      ],
    });
    const combId = String(p.variantCombinations[0]._id);
    const res = await postCreate(
      baseBody([{ product: String(p._id), quantity: 2, variantCombinationId: combId }], {
        paymentMethod: PAYMENT_METHOD.ONLINE,
        paymentProvider: PAYMENT_PROVIDER.SEPAY,
      })
    );
    expectValidationError(res, {
      field: 'items',
      message: `Requested quantity (2) exceeds available stock (1) for selected variant of product: ${String(p._id)}`,
    });
  });

  test('400 when voucher usage limit reached (create order)', async () => {
    await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'LIMITED_CREATE',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      quantity: 1,
      currentUsage: 1,
    });
    const res = await postCreate(
      baseBody([{ product: String(p._id), quantity: 1 }], { paymentMethod: PAYMENT_METHOD.COD }),
      { voucherOrderCode: v.code }
    );
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Voucher usage limit reached',
    });
  });

  test('400 when voucher per-user usage limit reached (create order)', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct();
    const v = await seedVoucher({
      code: 'PERUSER_CREATE',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      usageLimitPerUser: 1,
    });
    await Order.create({
      user: buyer._id,
      status: ORDER_STATUS.PENDING,
      shippingAddress: { fullName: 'Test', address: 'Test', phone: '0123456789' },
      paymentMethod: PAYMENT_METHOD.COD,
      voucherCode: [v.code],
      subtotal: 100000,
      totalPrice: 100000,
    });

    const res = await postCreate(
      baseBody([{ product: String(p._id), quantity: 1 }], { paymentMethod: PAYMENT_METHOD.COD }),
      { voucherOrderCode: v.code }
    );
    expectValidationError(res, {
      field: 'voucherOrderCode',
      message: 'Voucher usage limit per user reached',
    });
  });

  test('200 create order COD creates order details and decrements product stock', async () => {
    const buyer = await asBuyer();
    const p = await seedProduct({ quantity: 5, discountPrice: 80000 });

    const res = await postCreate(
      baseBody([{ product: String(p._id), quantity: 2 }], {
        paymentMethod: PAYMENT_METHOD.COD,
      })
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Order created successfully');
    expect(res.body.payload).toBeTruthy();
    expect(String(res.body.payload.user)).toBe(String(buyer._id));
    expect(res.body.payload.paymentMethod).toBe(PAYMENT_METHOD.COD);
    expect(res.body.payload.paymentProvider).toBe(null);
    expect(res.body.payload.paymentStatus).toBeTruthy();
    expect(Array.isArray(res.body.payload.orderDetails)).toBe(true);
    expect(res.body.payload.orderDetails.length).toBe(1);

    const saved = await Order.findById(res.body.payload._id).lean();
    expect(saved).toBeTruthy();
    expect(saved.subtotal).toBe(160000);
    expect(saved.totalPrice).toBe(190000); // subtotal + shipping(30k)

    const details = await OrderDetail.find({ order: saved._id }).lean();
    expect(details.length).toBe(1);
    expect(String(details[0].product)).toBe(String(p._id));
    expect(details[0].quantity).toBe(2);
    expect(details[0].finalUnitPrice).toBe(80000);

    const updatedP = await Product.findById(p._id).lean();
    expect(updatedP.quantity).toBe(3);
  });

  test('200 create order ONLINE sets paymentProvider and decrements variant stock', async () => {
    await asBuyer();
    const seller = await seedUser({ role: USER_ROLES.SELLER });
    const cat = await seedCategory('VarCat');
    const p = await seedProduct({
      seller,
      quantity: 4,
      categories: [cat._id],
      variantGroups: [{ name: 'Size', options: [{ value: 'S' }] }],
      variantCombinations: [
        {
          options: [{ groupName: 'Size', optionValue: 'S' }],
          quantity: 4,
          price: 120000,
          discountPrice: 100000,
          sku: `SKU-${Date.now()}-VS`,
          image: 'https://example.com/variant.jpg',
        },
      ],
    });
    const combId = String(p.variantCombinations[0]._id);

    const res = await postCreate(
      baseBody([{ product: String(p._id), quantity: 3, variantCombinationId: combId }], {
        paymentMethod: PAYMENT_METHOD.ONLINE,
        paymentProvider: PAYMENT_PROVIDER.SEPAY,
      })
    );

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.payload.paymentMethod).toBe(PAYMENT_METHOD.ONLINE);
    expect(res.body.payload.paymentProvider).toBe(PAYMENT_PROVIDER.SEPAY);

    const saved = await Order.findById(res.body.payload._id).lean();
    expect(saved).toBeTruthy();
    expect(saved.voucherCode).toEqual([]);

    const details = await OrderDetail.find({ order: saved._id }).lean();
    expect(details.length).toBe(1);
    expect(details[0].variantCombinationId).toBeTruthy();
    expect(String(details[0].variantCombinationId)).toBe(combId);
    expect(details[0].finalUnitPrice).toBe(100000);

    const updatedP = await Product.findById(p._id).lean();
    expect(updatedP.quantity).toBe(1);
    const updatedComb = updatedP.variantCombinations.find(c => String(c._id) === combId);
    expect(updatedComb.quantity).toBe(1);
  });

  test('200 create order with both vouchers increments voucher usage and snapshots voucher codes', async () => {
    const buyer = await asBuyer();
    const cat = await seedCategory('ScopeCat');
    const p = await seedProduct({
      price: 100000,
      discountPrice: 80000,
      categories: [cat._id],
      quantity: 10,
    });

    const orderVoucher = await seedVoucher({
      code: 'ORDER_VOUCH',
      target: VOUCHER_TARGET.ORDER_DISCOUNT,
      type: VOUCHER_TYPE.FIXED,
      discountValue: 20000,
      applicableCategories: [cat._id],
      currentUsage: 0,
    });
    const shipVoucher = await seedVoucher({
      code: 'SHIP_VOUCH',
      target: VOUCHER_TARGET.SHIPPING_DISCOUNT,
      type: VOUCHER_TYPE.PERCENTAGE,
      discountValue: 10,
      maxDiscount: 5000,
      currentUsage: 0,
    });

    const res = await postCreate(
      baseBody([{ product: String(p._id), quantity: 2 }], { paymentMethod: PAYMENT_METHOD.COD }),
      { voucherOrderCode: orderVoucher.code, voucherShippingCode: shipVoucher.code }
    );

    expect(res.status).toBe(200);
    const saved = await Order.findById(res.body.payload._id).lean();
    expect(saved.user.toString()).toBe(buyer._id.toString());
    expect(saved.voucherCode.sort()).toEqual([orderVoucher.code, shipVoucher.code].sort());
    expect(saved.discountAmount).toBe(20000);
    expect(saved.totalPrice).toBe(167000);
    expect(saved.voucher).toBeTruthy();
    expect(saved.voucher.order.code).toBe(orderVoucher.code);
    expect(saved.voucher.shipping.code).toBe(shipVoucher.code);

    const v1 = await Voucher.findOne({ code: orderVoucher.code }).lean();
    const v2 = await Voucher.findOne({ code: shipVoucher.code }).lean();
    expect(v1.currentUsage).toBe(1);
    expect(v2.currentUsage).toBe(1);
  });

  test('500 when dirty product violates variant invariants during stock decrement (transaction abort)', async () => {
    await asBuyer();
    const sellerId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const combId = new mongoose.Types.ObjectId();

    // Insert an inconsistent product that bypasses the model pre-save hook:
    // - product.quantity != sum(variantCombinations.quantity) will fail validateVariantModelInput on save.
    await Product.collection.insertOne({
      _id: productId,
      name: 'DirtyVariant',
      description: 'd',
      price: 100000,
      discountPrice: 90000,
      status: PRODUCT_STATUS.APPROVED,
      isActive: true,
      quantity: 10, // mismatch with combinations sum below
      variantGroups: [{ name: 'Size', options: [{ value: 'S' }] }],
      variantCombinations: [
        {
          _id: combId,
          options: [{ groupName: 'Size', optionValue: 'S' }],
          quantity: 1,
          price: 100000,
          discountPrice: 90000,
          sku: `SKU-${Date.now()}-DIRTY`,
        },
      ],
      createdBy: sellerId,
      categories: [],
      images: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await postCreate(
      baseBody(
        [{ product: String(productId), quantity: 1, variantCombinationId: String(combId) }],
        {
          paymentMethod: PAYMENT_METHOD.ONLINE,
          paymentProvider: PAYMENT_PROVIDER.SEPAY,
        }
      )
    );

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    // Ensure the transaction didn't partially persist order/orderDetails
    expect(await Order.countDocuments({})).toBe(0);
    expect(await OrderDetail.countDocuments({})).toBe(0);
  });
});
