const { USER_ROLES, VOUCHER_STATUS, VOUCHER_TYPE, VOUCHER_SOURCE } = require('../Utils/constant');
const { AppError } = require('../Utils/error.utils');
const { body, param, validationResult } = require('express-validator');
const Voucher = require('../Models/voucher.model');
const User = require('../Models/user.model');
const Product = require('../Models/product.model');
const Category = require('../Models/category.model');
const mongoose = require('mongoose');

// Helper functions for validation
const createArrayValidation = (fieldName, entityName) => [
  body(fieldName)
    .optional()
    .bail()
    .isArray()
    .withMessage(`Field ${fieldName} must be an array of string (${entityName} ids).`)
    .bail()
    .custom(value => {
      if (value && !value.every(i => typeof i === 'string')) {
        throw new Error(`Field ${fieldName} must be an array of string (${entityName} ids).`);
      }
      return true;
    }),
];

const createBooleanValidation = fieldName => [
  body(fieldName)
    .optional()
    .bail()
    .toBoolean()
    .bail()
    .isBoolean()
    .withMessage(`Field ${fieldName} must be a boolean.`),
];

const validateEntityExistence = async (
  ids,
  Model,
  fieldName,
  errorMessage,
  additionalQuery = {}
) => {
  if (!ids || ids.length === 0) return null;

  try {
    const entities = await Model.find({ _id: { $in: ids }, ...additionalQuery });
    if (entities.length !== ids.length) {
      return {
        field: fieldName,
        message: errorMessage,
      };
    }
    return null;
  } catch (err) {
    return { field: fieldName, message: err.message };
  }
};

/**
 * Validate ObjectId format for reference fields
 * @param {Array<{field: string, value: any[]}>} fields - Array of field objects
 * @param {Array} errors - Array to push validation errors
 */
const validateObjectIdFields = (fields, errors) => {
  for (const { field, value } of fields) {
    if (value && Array.isArray(value)) {
      for (const id of value) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          errors.push({
            field,
            message: `Invalid ObjectId: ${id}`,
          });
        }
      }
    }
  }
};

// Common validation rules
const commonValidations = {
  code: [
    body('code')
      .exists()
      .withMessage('Field code is required.')
      .bail()
      .notEmpty()
      .withMessage('Field code is required and must be a non-empty string.')
      .bail()
      .isString()
      .withMessage('Field code must be a string.')
      .bail()
      .trim()
      .custom(value => {
        if (!value || value.trim() === '') {
          throw new Error('Field code cannot be empty or contain only whitespace.');
        }
        const codeTrim = value.trim();
        if (codeTrim !== codeTrim.toUpperCase()) {
          throw new Error('Voucher code must be uppercase.');
        }
        if (!/^[A-Z0-9_-]+$/.test(codeTrim)) {
          throw new Error('Voucher code only allows A-Z, 0-9, underscore (_) or hyphen (-).');
        }
        if (codeTrim.includes('_') && codeTrim.includes('-')) {
          throw new Error('Voucher code cannot contain both underscore (_) and hyphen (-).');
        }
        if (/__|--/.test(codeTrim)) {
          throw new Error('Voucher code cannot contain two consecutive underscores or hyphens.');
        }
        if (/^[_-]|[_-]$/.test(codeTrim)) {
          throw new Error('Voucher code cannot start or end with an underscore or hyphen.');
        }
        return true;
      }),
  ],

  type: [
    body('type')
      .exists()
      .withMessage('Field type is required.')
      .bail()
      .notEmpty()
      .withMessage(
        'Field type is required and must be one of: ' + Object.values(VOUCHER_TYPE).join(', ')
      )
      .bail()
      .isString()
      .withMessage('Field type must be a string.')
      .bail()
      .isIn(Object.values(VOUCHER_TYPE))
      .withMessage('Field type must be one of: ' + Object.values(VOUCHER_TYPE).join(', ')),
  ],

  discountValue: [
    body('discountValue')
      .exists()
      .withMessage('Field discountValue is required.')
      .bail()
      .notEmpty()
      .withMessage('Field discountValue is required and must be a positive number.')
      .bail()
      .isFloat({ min: 0.01 })
      .withMessage('Field discountValue must be a positive number.')
      .bail()
      .custom((value, { req }) => {
        const type = req.body.type;
        if (!Object.values(VOUCHER_TYPE).includes(type)) {
          throw new Error('Invalid or missing type — cannot validate discountValue.');
        }
        if (type === VOUCHER_TYPE.PERCENTAGE && value > 100) {
          throw new Error('Percentage discount cannot exceed 100%.');
        }
        if (type === VOUCHER_TYPE.FIXED && value > 1000000000) {
          throw new Error('Fixed discount cannot exceed 1,000,000,000.');
        }
        return true;
      }),
  ],

  quantity: [
    body('quantity')
      .exists()
      .withMessage('Field quantity is required.')
      .bail()
      .isInt({ min: 1 })
      .withMessage('Field quantity must be an integer >= 1.'),
  ],

  optionalFields: [
    body('description').optional().isString().withMessage('Field description must be a string.'),
    body('minOrderValue')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Field minOrderValue must be a non-negative number.'),
    body('maxDiscount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Field maxDiscount must be a non-negative number.'),
    body('usageLimitPerUser')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Field usageLimitPerUser must be a positive integer.'),
    ...createArrayValidation('applicableUsers', 'user'),
    ...createArrayValidation('applicableProducts', 'product'),
    ...createArrayValidation('applicableCategories', 'category'),
    ...createBooleanValidation('isActive'),
    ...createBooleanValidation('isPublic'),
  ],
};

// Common date validations
const createDateValidations = (includeBusinessRules = false, isOptional = false) => {
  const startDateChain = body('startDate');
  const endDateChain = body('endDate');

  const startDateRules = isOptional
    ? startDateChain.optional()
    : startDateChain
        .exists()
        .withMessage('Field startDate is required.')
        .bail()
        .notEmpty()
        .withMessage('Field startDate must not be empty.');

  const endDateRules = isOptional
    ? endDateChain.optional()
    : endDateChain
        .exists()
        .withMessage('Field endDate is required.')
        .bail()
        .notEmpty()
        .withMessage('Field endDate must not be empty.');

  const validations = [
    startDateRules
      .bail()
      .isISO8601()
      .withMessage('Field startDate must be a valid ISO8601 date string.'),

    endDateRules
      .bail()
      .isISO8601()
      .withMessage('Field endDate must be a valid ISO8601 date string.'),
  ];

  if (includeBusinessRules) {
    // Add business rules for admin
    validations[0] = validations[0].custom(value => {
      const startDateObj = new Date(value);
      const now = new Date();
      if (startDateObj < now) {
        throw new Error('Field startDate must be greater than or equal to current date.');
      }
      return true;
    });

    validations[1] = validations[1].custom((value, { req }) => {
      const startDate = req.body.startDate;
      if (startDate && new Date(value) <= new Date(startDate)) {
        throw new Error('endDate must be after startDate.');
      }
      return true;
    });
  }

  return validations;
};

// Helper function to make validations optional
const makeOptional = validations => {
  return validations.map(validation => {
    if (validation.optional) return validation;
    return validation.optional();
  });
};

/**
 * Middleware to validate create voucher request for ADMIN only using express-validator
 * - Only accept allowed fields
 * - Validate required, type, business rule
 * - Check duplicate code (case-insensitive, always uppercase)
 * - If valid, assign req.validatedData for controller
 */
const validateCreateVoucherAdmin = [
  // Common validations
  ...commonValidations.code,
  ...commonValidations.type,
  ...commonValidations.discountValue,
  ...createDateValidations(true), // Include business rules for admin
  ...commonValidations.quantity,
  ...commonValidations.optionalFields,

  // Admin-specific validations
  ...createArrayValidation('applicableSellers', 'seller'),
  body('status')
    .optional()
    .bail()
    .isString()
    .withMessage('Field status must be a string.')
    .bail()
    .isIn(Object.values(VOUCHER_STATUS))
    .withMessage('Field status must be one of: ' + Object.values(VOUCHER_STATUS).join(', ')),

  // Check for validation errors and format them
  (req, res, next) => {
    const errors = validationResult(req);
    let allErrors = [];

    // Add express-validator errors
    if (!errors.isEmpty()) {
      allErrors = errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      }));
    }

    // Check for disallowed fields (non-DB validation)
    const allowedFields = [
      'code',
      'type',
      'discountValue',
      'startDate',
      'endDate',
      'quantity',
      'description',
      'minOrderValue',
      'maxDiscount',
      'usageLimitPerUser',
      'applicableSellers',
      'applicableUsers',
      'applicableProducts',
      'applicableCategories',
      'isActive',
      'isPublic',
      'status',
    ];
    const disallowedFields = Object.keys(req.body).filter(f => !allowedFields.includes(f));
    if (disallowedFields.length > 0) {
      disallowedFields.forEach(f => {
        allErrors.push({ field: f, message: `Field ${f} is not allowed.` });
      });
    }

    if (allErrors.length > 0) {
      return next(new AppError('Validation failed', 400, allErrors));
    }

    // Normalize data for DB validation step
    req.filteredData = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) req.filteredData[f] = req.body[f];
    });
    next();
  },

  // Business validations with DB queries
  async (req, res, next) => {
    const errors = [];
    const { code, applicableSellers, applicableUsers, applicableProducts, applicableCategories } =
      req.filteredData;

    // Validate ObjectId format for all reference fields (non-DB validation)
    const objectIdFields = [
      { field: 'applicableSellers', value: applicableSellers },
      { field: 'applicableUsers', value: applicableUsers },
      { field: 'applicableProducts', value: applicableProducts },
      { field: 'applicableCategories', value: applicableCategories },
    ];

    validateObjectIdFields(objectIdFields, errors);

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 400, errors));
    }

    // Check duplicate code
    try {
      if (code) {
        const codeUpper = code.trim().toUpperCase();
        const exists = await Voucher.findOne({ code: codeUpper });
        if (exists) {
          errors.push({
            field: 'code',
            message: 'Voucher code already exists',
          });
        }
      }
    } catch (err) {
      errors.push({ field: 'code', message: err.message });
    }

    // Validate entity existence using helper function
    const entityValidations = [
      {
        ids: applicableSellers,
        Model: User,
        fieldName: 'applicableSellers',
        errorMessage: 'Some sellers do not exist or do not have seller role',
        additionalQuery: { role: USER_ROLES.SELLER },
      },
      {
        ids: applicableUsers,
        Model: User,
        fieldName: 'applicableUsers',
        errorMessage: 'Some users do not exist',
      },
      {
        ids: applicableProducts,
        Model: Product,
        fieldName: 'applicableProducts',
        errorMessage: 'Some products do not exist',
      },
      {
        ids: applicableCategories,
        Model: Category,
        fieldName: 'applicableCategories',
        errorMessage: 'Some categories do not exist',
      },
    ];

    // Run all entity validations in parallel
    const validationResults = await Promise.all(
      entityValidations.map(validation =>
        validateEntityExistence(
          validation.ids,
          validation.Model,
          validation.fieldName,
          validation.errorMessage,
          validation.additionalQuery
        )
      )
    );

    // Add non-null validation results to errors
    validationResults.forEach(result => {
      if (result) errors.push(result);
    });

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 400, errors));
    }

    // Normalize data for controller
    const {
      description,
      type,
      discountValue,
      maxDiscount,
      startDate,
      endDate,
      quantity,
      minOrderValue,
      usageLimitPerUser,
      status,
      isActive,
      isPublic,
    } = req.body;

    req.validatedData = {
      code: code ? code.trim().toUpperCase() : '',
      description: description ? description.trim() : '',
      type,
      discountValue,
      maxDiscount: maxDiscount || 0,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      quantity,
      minOrderValue: minOrderValue || 0,
      usageLimitPerUser: usageLimitPerUser || 1,
      applicableSellers: applicableSellers || [],
      status: status || VOUCHER_STATUS.PENDING,
      applicableUsers: applicableUsers || [],
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      isActive: isActive !== undefined ? isActive : true,
      isPublic: isPublic !== undefined ? isPublic : false,
      source: VOUCHER_SOURCE.SYSTEM,
    };

    next();
  },
];

/**
 * Middleware to validate create voucher request for SELLER only using express-validator
 * - Only accept allowed fields
 * - Validate required, type, business rule
 * - Seller voucher only applies to their own shop (no applicableSellers field allowed)
 * - Default status is pending, source is SHOP
 * - If valid, assign req.validatedData for controller
 */
const validateCreateVoucherSeller = [
  // Common validations
  ...commonValidations.code,
  ...commonValidations.type,
  ...commonValidations.discountValue,
  ...createDateValidations(true), // No business rules for seller
  ...commonValidations.quantity,
  ...commonValidations.optionalFields,

  // Seller-specific validations - no applicableSellers allowed

  // Check for validation errors and format them
  (req, res, next) => {
    const errors = validationResult(req);
    let allErrors = [];
    if (!errors.isEmpty()) {
      allErrors = errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      }));
    }
    // Only allow valid fields (no applicableSellers for seller vouchers)
    const allowedFields = [
      'code',
      'type',
      'discountValue',
      'startDate',
      'endDate',
      'quantity',
      'description',
      'minOrderValue',
      'maxDiscount',
      'usageLimitPerUser',
      'applicableUsers',
      'applicableProducts',
      'applicableCategories',
      'isActive',
      'isPublic',
    ];
    const disallowedFields = Object.keys(req.body).filter(f => !allowedFields.includes(f));
    if (disallowedFields.length > 0) {
      disallowedFields.forEach(f => {
        allErrors.push({ field: f, message: `Field ${f} is not allowed.` });
      });
    }
    if (allErrors.length > 0) {
      return next(new AppError('Validation failed', 400, allErrors));
    }
    // Normalize data for DB validation step
    req.filteredData = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) req.filteredData[f] = req.body[f];
    });
    next();
  },
  // DB validations
  async (req, res, next) => {
    const errors = [];
    const { code, applicableUsers, applicableProducts, applicableCategories } = req.filteredData;

    // Validate ObjectId format for all reference fields (non-DB validation)
    const objectIdFields = [
      { field: 'applicableUsers', value: applicableUsers },
      { field: 'applicableProducts', value: applicableProducts },
      { field: 'applicableCategories', value: applicableCategories },
    ];

    validateObjectIdFields(objectIdFields, errors);

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 400, errors));
    }

    // Check duplicate code
    try {
      if (code) {
        const codeUpper = code.trim().toUpperCase();
        const exists = await require('../Models/voucher.model').findOne({ code: codeUpper });
        if (exists) {
          errors.push({ field: 'code', message: 'Voucher code already exists' });
        }
      }
    } catch (err) {
      errors.push({ field: 'code', message: err.message });
    }
    // Validate entity existence (no applicableSellers validation for seller vouchers)
    const entityValidations = [
      {
        ids: applicableUsers,
        Model: require('../Models/user.model'),
        fieldName: 'applicableUsers',
        errorMessage: 'Some users do not exist',
      },
      {
        ids: applicableProducts,
        Model: require('../Models/product.model'),
        fieldName: 'applicableProducts',
        errorMessage: 'Some products do not exist',
      },
      {
        ids: applicableCategories,
        Model: require('../Models/category.model'),
        fieldName: 'applicableCategories',
        errorMessage: 'Some categories do not exist',
      },
    ];
    const validationResults = await Promise.all(
      entityValidations.map(validation =>
        validateEntityExistence(
          validation.ids,
          validation.Model,
          validation.fieldName,
          validation.errorMessage,
          validation.additionalQuery
        )
      )
    );
    validationResults.forEach(result => {
      if (result) errors.push(result);
    });
    if (errors.length > 0) {
      return next(new AppError('Validation failed', 400, errors));
    }
    // Normalize data for controller
    const {
      description: seller_description,
      type: seller_type,
      discountValue: seller_discountValue,
      maxDiscount: seller_maxDiscount,
      startDate: seller_startDate,
      endDate: seller_endDate,
      quantity: seller_quantity,
      minOrderValue: seller_minOrderValue,
      usageLimitPerUser: seller_usageLimitPerUser,
      isActive: seller_isActive,
      isPublic: seller_isPublic,
      applicableUsers: seller_applicableUsers,
      applicableProducts: seller_applicableProducts,
      applicableCategories: seller_applicableCategories,
    } = req.body;
    req.validatedData = {
      code: code ? code.trim().toUpperCase() : '',
      description: seller_description ? seller_description.trim() : '',
      type: seller_type,
      discountValue: seller_discountValue,
      maxDiscount: seller_maxDiscount || 0,
      startDate: new Date(seller_startDate),
      endDate: new Date(seller_endDate),
      quantity: seller_quantity,
      minOrderValue: seller_minOrderValue || 0,
      usageLimitPerUser: seller_usageLimitPerUser || 1,
      applicableUsers: seller_applicableUsers || [],
      applicableProducts: seller_applicableProducts || [],
      applicableCategories: seller_applicableCategories || [],
      isActive: seller_isActive !== undefined ? seller_isActive : true,
      isPublic: seller_isPublic !== undefined ? seller_isPublic : false,
      status: VOUCHER_STATUS.PENDING,
      source: VOUCHER_SOURCE.SHOP,
    };
    next();
  },
];

/**
 * Middleware to validate update voucher request for ADMIN only using express-validator
 * - Only accept allowed fields
 * - Validate voucher exists and belongs to admin
 * - Business rules: only admin can update status, rejectReason required if status is REJECTED
 * - Cannot update voucher code
 * - If valid, assign req.validatedData for controller
 */
const validateUpdateVoucherAdmin = [
  // Validate voucher ID parameter from path
  param('id')
    .exists()
    .withMessage('Voucher ID is required.')
    .bail()
    .isString()
    .withMessage('Voucher ID must be a string.')
    .bail()
    .custom(value => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid voucher ID format.');
      }
      return true;
    }),

  // Optional fields validation (all fields are optional for update)
  // Reuse common validations but make them optional
  ...makeOptional(commonValidations.type),
  ...makeOptional(commonValidations.discountValue),
  ...createDateValidations(true, true), // Include business rules and make optional
  ...makeOptional(commonValidations.quantity),
  ...makeOptional(commonValidations.optionalFields),

  ...createArrayValidation('applicableSellers', 'seller'),
  ...createArrayValidation('applicableUsers', 'user'),
  ...createArrayValidation('applicableProducts', 'product'),
  ...createArrayValidation('applicableCategories', 'category'),
  ...createBooleanValidation('isActive'),
  ...createBooleanValidation('isPublic'),

  // Status validation with business rules
  body('status')
    .optional()
    .bail()
    .isString()
    .withMessage('Field status must be a string.')
    .bail()
    .isIn(Object.values(VOUCHER_STATUS))
    .withMessage('Field status must be one of: ' + Object.values(VOUCHER_STATUS).join(', ')),

  // RejectReason validation (required if status is REJECTED)
  body('rejectReason')
    .optional()
    .bail()
    .isString()
    .withMessage('Field rejectReason must be a string.')
    .bail()
    .custom((value, { req }) => {
      const status = req.body.status;
      if (status === VOUCHER_STATUS.REJECTED && (!value || value.trim() === '')) {
        throw new Error('Reject reason is required when status is REJECTED.');
      }
      return true;
    }),

  // Check for validation errors and format them
  (req, res, next) => {
    const errors = validationResult(req);
    let allErrors = [];

    // Add express-validator errors
    if (!errors.isEmpty()) {
      allErrors = errors.array().map(err => ({
        field: err.path,
        message: err.msg,
      }));
    }

    // Check for disallowed fields (non-DB validation)
    const allowedFields = [
      'type',
      'discountValue',
      'startDate',
      'endDate',
      'quantity',
      'description',
      'minOrderValue',
      'maxDiscount',
      'usageLimitPerUser',
      'applicableSellers',
      'applicableUsers',
      'applicableProducts',
      'applicableCategories',
      'isActive',
      'isPublic',
      'status',
      'rejectReason',
    ];
    const disallowedFields = Object.keys(req.body).filter(f => !allowedFields.includes(f));
    if (disallowedFields.length > 0) {
      disallowedFields.forEach(f => {
        allErrors.push({ field: f, message: `Field ${f} is not allowed.` });
      });
    }

    if (allErrors.length > 0) {
      return next(new AppError('Validation failed', 400, allErrors));
    }

    // Normalize data for DB validation step
    req.filteredData = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) req.filteredData[f] = req.body[f];
    });
    next();
  },

  // Business validations with DB queries
  async (req, res, next) => {
    const errors = [];
    const { applicableSellers, applicableUsers, applicableProducts, applicableCategories } =
      req.filteredData;
    const id = req.params.id;

    // Check if voucher exists and belongs to admin
    try {
      const voucher = await Voucher.findById(id);
      if (!voucher) {
        return next(new AppError('Voucher not found', 404));
      }

      // Check if voucher is created by admin (source: SYSTEM)
      if (voucher.source !== VOUCHER_SOURCE.SYSTEM) {
        return next(new AppError('Only admin-created vouchers can be updated', 403));
      }

      // Store voucher in request for controller use
      req.voucher = voucher;
    } catch {
      return next(new AppError('Error finding voucher', 500));
    }

    // Validate ObjectId format for all reference fields (non-DB validation)
    const objectIdFields = [
      { field: 'applicableSellers', value: applicableSellers },
      { field: 'applicableUsers', value: applicableUsers },
      { field: 'applicableProducts', value: applicableProducts },
      { field: 'applicableCategories', value: applicableCategories },
    ];

    validateObjectIdFields(objectIdFields, errors);

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 400, errors));
    }

    // Validate entity existence using helper function
    const entityValidations = [
      {
        ids: applicableSellers,
        Model: User,
        fieldName: 'applicableSellers',
        errorMessage: 'Some sellers do not exist or do not have seller role',
        additionalQuery: { role: USER_ROLES.SELLER },
      },
      {
        ids: applicableUsers,
        Model: User,
        fieldName: 'applicableUsers',
        errorMessage: 'Some users do not exist',
      },
      {
        ids: applicableProducts,
        Model: Product,
        fieldName: 'applicableProducts',
        errorMessage: 'Some products do not exist',
      },
      {
        ids: applicableCategories,
        Model: Category,
        fieldName: 'applicableCategories',
        errorMessage: 'Some categories do not exist',
      },
    ];

    // Run all entity validations in parallel
    const validationResults = await Promise.all(
      entityValidations.map(validation =>
        validateEntityExistence(
          validation.ids,
          validation.Model,
          validation.fieldName,
          validation.errorMessage,
          validation.additionalQuery
        )
      )
    );

    // Add non-null validation results to errors
    validationResults.forEach(result => {
      if (result) errors.push(result);
    });

    if (errors.length > 0) {
      return next(new AppError('Validation failed', 400, errors));
    }

    // Normalize data for controller
    const {
      type,
      discountValue,
      maxDiscount,
      startDate,
      endDate,
      quantity,
      minOrderValue,
      usageLimitPerUser,
      status,
      rejectReason,
      isActive,
      isPublic,
    } = req.body;

    req.validatedData = {
      voucherId: id,
      updateData: {
        ...(type && { type }),
        ...(discountValue && { discountValue }),
        ...(maxDiscount !== undefined && { maxDiscount }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(quantity && { quantity }),
        ...(minOrderValue !== undefined && { minOrderValue }),
        ...(usageLimitPerUser && { usageLimitPerUser }),
        ...(status && { status }),
        ...(rejectReason && { rejectReason }),
        ...(isActive !== undefined && { isActive }),
        ...(isPublic !== undefined && { isPublic }),
        ...(applicableSellers && { applicableSellers }),
        ...(applicableUsers && { applicableUsers }),
        ...(applicableProducts && { applicableProducts }),
        ...(applicableCategories && { applicableCategories }),
      },
    };

    next();
  },
];

module.exports = {
  validateCreateVoucherAdmin,
  validateCreateVoucherSeller,
  validateUpdateVoucherAdmin,
};
