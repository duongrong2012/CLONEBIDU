const { validationResult, query, body } = require('express-validator');
const { AppError } = require('../Utils/error.utils');
const Voucher = require('../Models/voucher.model');
const { VOUCHER_STATUS, VOUCHER_TARGET } = require('../Utils/constant');
// const Cart = require('../Models/cart.model');
const Product = require('../Models/product.model');

// Validate query voucher codes (optional) and business rules
const validateOrderPreview = [
  // Helpers
  (req, _res, next) => {
    /**
     * Check basic voucher constraints (active, status, time window, target)
     * @returns {Array<{field:string,message:string}>} errors
     */
    req.__checkVoucherBasics = (voucher, expectedTarget, fieldName, now) => {
      const errs = [];
      if (!voucher.isActive) {
        errs.push({ field: fieldName, message: 'Voucher is not available' });
      }
      if (voucher.status !== VOUCHER_STATUS.APPROVED) {
        errs.push({ field: fieldName, message: 'Voucher is not available' });
      }
      if (voucher.startDate && now < new Date(voucher.startDate)) {
        errs.push({ field: fieldName, message: 'Voucher is not yet active' });
      }
      if (voucher.endDate && now > new Date(voucher.endDate)) {
        errs.push({ field: fieldName, message: 'Voucher has expired' });
      }
      if (expectedTarget && voucher.target !== expectedTarget) {
        errs.push({ field: fieldName, message: `Voucher target must be ${expectedTarget}` });
      }
      // Global usage availability (quantity vs currentUsage)
      if (
        typeof voucher.quantity === 'number' &&
        typeof voucher.currentUsage === 'number' &&
        voucher.currentUsage >= voucher.quantity
      ) {
        errs.push({ field: fieldName, message: 'Voucher usage limit reached' });
      }
      // Note: Per-user usage (usageLimitPerUser) requires usage tracking at redemption time.
      // It will be enforced during actual apply step, not preview, unless usage records are available.
      return errs;
    };

    /**
     * Enforce user scope when applicableUsers is provided (non-empty)
     */
    req.__enforceApplicableUsers = (voucher, userId, fieldName) => {
      if (Array.isArray(voucher.applicableUsers) && voucher.applicableUsers.length > 0) {
        const allowed = voucher.applicableUsers.some(id => String(id) === String(userId));
        if (!allowed) {
          return [{ field: fieldName, message: 'Voucher is not applicable for this user' }];
        }
      }
      return [];
    };

    /**
     * Enforce seller scope strictly when applicableSellers is provided (non-empty)
     */
    req.__enforceApplicableSellers = (voucher, items, fieldName) => {
      if (Array.isArray(voucher.applicableSellers) && voucher.applicableSellers.length > 0) {
        const sellerMatch = items.some(it =>
          voucher.applicableSellers.some(id => String(id) === it.sellerId)
        );
        if (!sellerMatch) {
          const preview = voucher.applicableSellers.slice(0, 5).map(String).join(', ');
          return [
            {
              field: fieldName,
              message: `No items belong to allowed sellers. applicableSellers: [${preview}]`,
            },
          ];
        }
      }
      return [];
    };

    /**
     * Diagnose item eligibility across product/category/seller scopes
     * Returns [] if at least one item eligible or all scopes empty; otherwise detailed errors
     */
    req.__diagnoseEligibility = (voucher, items, fieldName) => {
      const hasScope = arr => Array.isArray(arr) && arr.length > 0;
      const scopedByProducts = hasScope(voucher.applicableProducts);
      const scopedByCategories = hasScope(voucher.applicableCategories);
      // Seller scope is enforced earlier as a hard constraint; do not include in item-level OR

      const eligibleFlags = items.map(item => {
        if (!scopedByProducts && !scopedByCategories) return true;
        if (
          scopedByProducts &&
          voucher.applicableProducts.some(id => String(id) === item.productId)
        )
          return true;
        if (
          scopedByCategories &&
          item.categories.some(cid => voucher.applicableCategories.some(id => String(id) === cid))
        )
          return true;
        return false;
      });

      const eligibleSubtotal = items
        .filter((_, idx) => eligibleFlags[idx])
        .reduce((sum, it) => sum + it.itemTotal, 0);

      if (eligibleSubtotal > 0) return [];

      const productMatch = scopedByProducts
        ? items.some(it => voucher.applicableProducts.some(id => String(id) === it.productId))
        : true;
      const categoryMatch = scopedByCategories
        ? items.some(it =>
            it.categories.some(cid => voucher.applicableCategories.some(id => String(id) === cid))
          )
        : true;

      const errors = [];
      if (scopedByProducts && !productMatch) {
        const preview = voucher.applicableProducts.slice(0, 5).map(String).join(', ');
        errors.push({
          field: fieldName,
          message: `No items match product scope. applicableProducts: [${preview}]`,
        });
      }
      if (scopedByCategories && !categoryMatch) {
        const preview = voucher.applicableCategories.slice(0, 5).map(String).join(', ');
        errors.push({
          field: fieldName,
          message: `No items match category scope. applicableCategories: [${preview}]`,
        });
      }
      if (errors.length === 0) {
        const ineligibleIds = items
          .map(i => i.productId)
          .slice(0, 5)
          .join(', ');
        errors.push({
          field: fieldName,
          message: `Voucher is not applicable to any items. Ineligible productIds: [${ineligibleIds}]`,
        });
      }
      return errors;
    };

    next();
  },
  // Validate items array in body
  body('items')
    .exists()
    .withMessage('items is required.')
    .bail()
    .isArray({ min: 1 })
    .withMessage('items must be a non-empty array.'),
  body('items.*.product')
    .exists()
    .withMessage('items[].product is required.')
    .bail()
    .isString()
    .withMessage('items[].product must be a string.')
    .bail()
    .custom(value => {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('items[].product must be a valid MongoId.');
      }
      return true;
    }),
  body('items.*.quantity')
    .exists()
    .withMessage('items[].quantity is required.')
    .bail()
    .isInt({ min: 1 })
    .withMessage('items[].quantity must be an integer >= 1.'),
  // Validate delivery info
  body('deliveryLocation')
    .exists()
    .withMessage('deliveryLocation is required.')
    .bail()
    .isObject()
    .withMessage('deliveryLocation must be an object.'),
  body('deliveryMethod')
    .exists()
    .withMessage('deliveryMethod is required.')
    .bail()
    .isString()
    .withMessage('deliveryMethod must be a string.'),
  query('voucherOrderCode')
    .optional()
    .isString()
    .withMessage('voucherOrderCode must be a string.')
    .bail()
    .customSanitizer(v => (typeof v === 'string' ? v.trim() : v))
    .bail()
    .custom(value => {
      if (!value) return true;
      if (value !== value.toUpperCase()) {
        throw new Error('Voucher code must be uppercase.');
      }
      if (!/^[A-Z0-9_-]+$/.test(value)) {
        throw new Error('Voucher code only allows A-Z, 0-9, underscore (_) or hyphen (-).');
      }
      if (value.includes('_') && value.includes('-')) {
        throw new Error('Voucher code cannot contain both underscore (_) and hyphen (-).');
      }
      if (/__|--/.test(value)) {
        throw new Error('Voucher code cannot contain two consecutive underscores or hyphens.');
      }
      if (/^[_-]|[_-]$/.test(value)) {
        throw new Error('Voucher code cannot start or end with an underscore or hyphen.');
      }
      return true;
    }),

  query('voucherShippingCode')
    .optional()
    .isString()
    .withMessage('voucherShippingCode must be a string.')
    .bail()
    .customSanitizer(v => (typeof v === 'string' ? v.trim() : v))
    .bail()
    .custom(value => {
      if (!value) return true;
      if (value !== value.toUpperCase()) {
        throw new Error('Voucher code must be uppercase.');
      }
      if (!/^[A-Z0-9_-]+$/.test(value)) {
        throw new Error('Voucher code only allows A-Z, 0-9, underscore (_) or hyphen (-).');
      }
      if (value.includes('_') && value.includes('-')) {
        throw new Error('Voucher code cannot contain both underscore (_) and hyphen (-).');
      }
      if (/__|--/.test(value)) {
        throw new Error('Voucher code cannot contain two consecutive underscores or hyphens.');
      }
      if (/^[_-]|[_-]$/.test(value)) {
        throw new Error('Voucher code cannot start or end with an underscore or hyphen.');
      }
      return true;
    }),

  async (req, _res, next) => {
    // Handle express-validator errors first
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formatted = errors.array().map(err => ({ field: err.path, message: err.msg }));
      return next(new AppError('Validation failed', 400, formatted));
    }

    const { voucherOrderCode, voucherShippingCode } = req.query;
    req.validatedData = {
      voucherOrder: null,
      voucherShipping: null,
      items: [],
      deliveryLocation: null,
      deliveryMethod: null,
    };

    // Validate and enrich items from body
    const rawItems = Array.isArray(req.body.items) ? req.body.items : [];
    req.validatedData.deliveryLocation = req.body.deliveryLocation;
    req.validatedData.deliveryMethod = req.body.deliveryMethod;
    const productIds = rawItems.map(i => i.product);

    // Reject duplicate product ids in request items
    const seenIds = new Set();
    const duplicateIds = [];
    for (const id of productIds) {
      const key = String(id);
      if (seenIds.has(key)) {
        if (!duplicateIds.includes(key)) duplicateIds.push(key);
      } else {
        seenIds.add(key);
      }
    }
    if (duplicateIds.length > 0) {
      return next(
        new AppError(
          'Validation failed',
          400,
          duplicateIds.map(id => ({ field: 'items', message: `Duplicate product in items: ${id}` }))
        )
      );
    }
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map(products.map(p => [String(p._id), p]));

    for (const { product, quantity } of rawItems) {
      const p = productMap.get(String(product));
      if (!p) {
        return next(
          new AppError('Validation failed', 404, [
            { field: 'items', message: `Product not found: ${product}` },
          ])
        );
      }
      // Prevent applying voucher to own products (for sellers)
      if (String(p.createdBy) === String(req.user._id)) {
        return next(
          new AppError('Validation failed', 400, [
            { field: 'items', message: `Cannot apply voucher to your own product: ${product}` },
          ])
        );
      }
      if (!p.isActive) {
        return next(
          new AppError('Validation failed', 400, [
            { field: 'items', message: `Product is inactive: ${product}` },
          ])
        );
      }
      const { PRODUCT_STATUS } = require('../Utils/constant');
      if (p.status !== PRODUCT_STATUS.APPROVED) {
        return next(
          new AppError('Validation failed', 400, [
            { field: 'items', message: `Product is not approved: ${product}` },
          ])
        );
      }
      // Stock checks
      const requestedQty = Number(quantity);
      if (!Number.isFinite(requestedQty) || requestedQty < 1) {
        return next(
          new AppError('Validation failed', 400, [
            { field: 'items', message: `Invalid quantity for product: ${product}` },
          ])
        );
      }
      if (typeof p.quantity === 'number') {
        if (p.quantity <= 0) {
          return next(
            new AppError('Validation failed', 400, [
              { field: 'items', message: `Product is out of stock: ${product}` },
            ])
          );
        }
        if (requestedQty > p.quantity) {
          return next(
            new AppError('Validation failed', 400, [
              {
                field: 'items',
                message: `Requested quantity (${requestedQty}) exceeds available stock (${p.quantity}) for product: ${product}`,
              },
            ])
          );
        }
      }
      const hasDiscount = typeof p.discountPrice === 'number' && p.discountPrice >= 0;
      const unitPrice = hasDiscount ? p.discountPrice : p.price;
      const itemTotal = unitPrice * requestedQty;
      req.validatedData.items.push({
        productId: String(p._id),
        name: p.name,
        price: p.price,
        discountPrice: p.discountPrice ?? null,
        unitPrice,
        quantity: requestedQty,
        itemTotal,
        sellerId: String(p.createdBy),
        categories: (p.categories || []).map(c => String(c)),
        image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
      });
    }

    if (voucherOrderCode && voucherShippingCode && voucherOrderCode === voucherShippingCode) {
      return next(
        new AppError('Validation failed', 400, [
          {
            field: 'voucherOrderCode',
            message: 'voucherOrderCode and voucherShippingCode cannot be the same.',
          },
          {
            field: 'voucherShippingCode',
            message: 'voucherOrderCode and voucherShippingCode cannot be the same.',
          },
        ])
      );
    }

    const now = new Date();

    if (voucherOrderCode) {
      const voucher = await Voucher.findOne({ code: voucherOrderCode }).lean();
      if (!voucher) {
        return next(
          new AppError('Validation failed', 404, [
            { field: 'voucherOrderCode', message: 'Voucher not found' },
          ])
        );
      }
      const basicsErr = req.__checkVoucherBasics(
        voucher,
        VOUCHER_TARGET.ORDER_DISCOUNT,
        'voucherOrderCode',
        now
      );
      if (basicsErr.length) return next(new AppError('Validation failed', 400, basicsErr));

      const userErr = req.__enforceApplicableUsers(voucher, req.user._id, 'voucherOrderCode');
      if (userErr.length) return next(new AppError('Validation failed', 403, userErr));

      const sellerErr = req.__enforceApplicableSellers(
        voucher,
        req.validatedData.items,
        'voucherOrderCode'
      );
      if (sellerErr.length) return next(new AppError('Validation failed', 400, sellerErr));

      req.validatedData.voucherOrder = voucher;
    }

    if (voucherShippingCode) {
      const voucher = await Voucher.findOne({ code: voucherShippingCode }).lean();
      if (!voucher) {
        return next(
          new AppError('Validation failed', 404, [
            { field: 'voucherShippingCode', message: 'Voucher not found' },
          ])
        );
      }
      const basicsErr = req.__checkVoucherBasics(
        voucher,
        VOUCHER_TARGET.SHIPPING_DISCOUNT,
        'voucherShippingCode',
        now
      );
      if (basicsErr.length) return next(new AppError('Validation failed', 400, basicsErr));

      const userErr = req.__enforceApplicableUsers(voucher, req.user._id, 'voucherShippingCode');
      if (userErr.length) return next(new AppError('Validation failed', 403, userErr));

      const sellerErr = req.__enforceApplicableSellers(
        voucher,
        req.validatedData.items,
        'voucherShippingCode'
      );
      if (sellerErr.length) return next(new AppError('Validation failed', 400, sellerErr));

      req.validatedData.voucherShipping = voucher;
    }

    // Enforce minOrderValue against request subtotal (before discount) for each voucher
    if (req.validatedData.voucherOrder || req.validatedData.voucherShipping) {
      const subtotal = req.validatedData.items.reduce((sum, it) => sum + it.itemTotal, 0);
      if (
        req.validatedData.voucherOrder &&
        typeof req.validatedData.voucherOrder.minOrderValue === 'number' &&
        req.validatedData.voucherOrder.minOrderValue > 0 &&
        subtotal < req.validatedData.voucherOrder.minOrderValue
      ) {
        return next(
          new AppError('Validation failed', 400, [
            {
              field: 'voucherOrderCode',
              message: 'Order total does not meet voucher minimum order value',
            },
          ])
        );
      }
      if (
        req.validatedData.voucherShipping &&
        typeof req.validatedData.voucherShipping.minOrderValue === 'number' &&
        req.validatedData.voucherShipping.minOrderValue > 0 &&
        subtotal < req.validatedData.voucherShipping.minOrderValue
      ) {
        return next(
          new AppError('Validation failed', 400, [
            {
              field: 'voucherShippingCode',
              message: 'Order total does not meet voucher minimum order value',
            },
          ])
        );
      }
    }

    // Validate per-item applicability for order voucher (products/categories OR) – sellers enforced earlier
    if (req.validatedData.voucherOrder) {
      const diag = req.__diagnoseEligibility(
        req.validatedData.voucherOrder,
        req.validatedData.items,
        'voucherOrderCode'
      );
      if (diag.length) return next(new AppError('Validation failed', 400, diag));
    }

    // Shipping voucher scope diagnostics (if present)
    if (req.validatedData.voucherShipping) {
      const diag = req.__diagnoseEligibility(
        req.validatedData.voucherShipping,
        req.validatedData.items,
        'voucherShippingCode'
      );
      if (diag.length) return next(new AppError('Validation failed', 400, diag));
    }
    next();
  },
];

module.exports = { validateOrderPreview };
