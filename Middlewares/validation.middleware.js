const { AppError } = require('../Utils/error.utils');
const { MESSAGES, REGEX_PATTERNS, GENDERS } = require('../Utils/constant');
const { body, validationResult, query, param } = require('express-validator');
const validationUtils = require('../Utils/validation.utils');
const { HTTP_STATUS } = require('../Utils/constant');
const response = require('../Utils/response.utils');
const User = require('../Models/user.model');
const BecomeSellerRequest = require('../Models/becomeSellerRequest.model');
const { SELLER_REQUEST_STATUS, USER_ROLES } = require('../Utils/constant');
const mongoose = require('mongoose');
const Category = require('../Models/category.model');
const { CATEGORY_LEVEL } = require('../Utils/constant');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');
const Media = require('../Models/media.model');
const { IMAGE_OWNER_TYPE } = require('../Utils/constant');
const Product = require('../Models/product.model');

/**
 * Middleware to validate user registration fields
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body containing user data
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateUserFields = (req, res, next) => {
  const { email, password, firstName, lastName, gender } = req.body;

  // Check required fields
  if (!firstName) {
    return next(new AppError(MESSAGES.VALIDATION.REQUIRED_FIRST_NAME, 400));
  }
  if (!lastName) {
    return next(new AppError(MESSAGES.VALIDATION.REQUIRED_LAST_NAME, 400));
  }
  if (!gender) {
    return next(new AppError(MESSAGES.VALIDATION.REQUIRED_GENDER, 400));
  }

  // Validate email
  if (!email) {
    return next(new AppError(MESSAGES.VALIDATION.REQUIRED_EMAIL, 400));
  }
  if (!REGEX_PATTERNS.EMAIL.test(email)) {
    return next(new AppError(MESSAGES.VALIDATION.INVALID_EMAIL, 400));
  }

  // Validate password
  if (!password) {
    return next(new AppError(MESSAGES.VALIDATION.REQUIRED_PASSWORD, 400));
  }
  if (!REGEX_PATTERNS.PASSWORD.test(password)) {
    return next(new AppError(MESSAGES.VALIDATION.PASSWORD_LENGTH, 400));
  }

  // Validate gender value against allowed values
  if (!Object.values(GENDERS).includes(gender)) {
    return next(new AppError(MESSAGES.VALIDATION.INVALID_GENDER, 400));
  }

  next();
};

/**
 * Middleware to validate buyer login request
 * Validates email format and required fields
 */
const validateBuyerLogin = [
  // Validate email format
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .custom(value => {
      try {
        validationUtils.validateEmail(value);
        return true;
      } catch (error) {
        throw new Error(error.message);
      }
    }),

  // Validate password
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  // Check for validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json(response.error('Validation failed', HTTP_STATUS.BAD_REQUEST, errors.array()));
    }
    next();
  },
];

/**
 * Middleware to validate user profile update request
 * Validates:
 * - firstName: 2-50 characters, letters and spaces only
 * - lastName: 2-50 characters, letters and spaces only
 * - gender: must be one of [MALE, FEMALE, OTHER]
 * - birthday: valid date in ISO format, must be at least 13 years old
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(MESSAGES.VALIDATION.FIRST_NAME_LENGTH)
    .matches(REGEX_PATTERNS.NAME)
    .withMessage(MESSAGES.VALIDATION.FIRST_NAME_PATTERN),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage(MESSAGES.VALIDATION.LAST_NAME_LENGTH)
    .matches(REGEX_PATTERNS.NAME)
    .withMessage(MESSAGES.VALIDATION.LAST_NAME_PATTERN),

  body('gender')
    .optional()
    .isIn(Object.values(GENDERS))
    .withMessage(MESSAGES.VALIDATION.INVALID_GENDER),

  body('birthday')
    .optional()
    .isISO8601()
    .withMessage(MESSAGES.VALIDATION.INVALID_BIRTHDAY_FORMAT)
    .custom(value => {
      try {
        validationUtils.validateBirthday(value);
        return true;
      } catch (error) {
        throw new Error(error.message);
      }
    }),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      throw new AppError(errorMessages.join(', '), 400);
    }
    next();
  },
];

/**
 * Validate seller request:
 * - Check if user is already a seller or has a pending request
 * - Validate all fields sent from client according to BecomeSellerRequest.model.js
 * - Only accept valid fields, check required, type, pattern, enum, etc.
 * - If valid, assign to req.validatedSellerRequest for controller usage
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function validateSellerRequest(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (user.role === USER_ROLES.SELLER) {
      throw new AppError('User is already a seller', 400);
    }
    const pendingRequest = await BecomeSellerRequest.findOne({
      user: req.user._id,
      status: SELLER_REQUEST_STATUS.PENDING,
    });
    if (pendingRequest) {
      throw new AppError('User already has a pending request', 400);
    }

    // Validate fields
    const allowedFields = [
      'birthday',
      'identityNumber',
      'bankName',
      'bankBranch',
      'taxCode',
      'national',
      'shop',
      'shopName',
      'isCompanyRegistered',
      'address',
      'province',
      'district',
      'ward',
      'currentDigitalPlatforms',
    ];
    const requiredFields = [
      'birthday',
      'identityNumber',
      'bankName',
      'bankBranch',
      'national',
      'shop',
      'shopName',
      'address',
      'province',
      'district',
      'ward',
    ];
    const stringFields = [
      'identityNumber',
      'bankName',
      'bankBranch',
      'national',
      'shop',
      'shopName',
      'address',
      'province',
      'district',
      'ward',
    ];
    const errors = [];
    const data = {};
    // Only accept allowed fields
    for (const key of Object.keys(req.body)) {
      if (!allowedFields.includes(key)) {
        errors.push(`Field '${key}' is not allowed.`);
      }
    }
    // Check required fields
    for (const key of requiredFields) {
      if (req.body[key] === undefined || req.body[key] === null || req.body[key] === '') {
        errors.push(`Field '${key}' is required.`);
      }
    }
    // birthday: must be valid date, at least 13 years old
    if (req.body.birthday) {
      const birthday = new Date(req.body.birthday);
      if (isNaN(birthday.getTime())) {
        errors.push('Field birthday must be a valid date.');
      } else {
        const now = new Date();
        const age = now.getFullYear() - birthday.getFullYear();
        if (
          age < 13 ||
          (age === 13 &&
            now < new Date(birthday.getFullYear() + 13, birthday.getMonth(), birthday.getDate()))
        ) {
          errors.push('User must be at least 13 years old.');
        } else {
          data.birthday = birthday;
        }
      }
    }
    // Validate string fields
    stringFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (typeof req.body[field] !== 'string' || req.body[field].trim() === '') {
          errors.push(`Field '${field}' must be a non-empty string.`);
        } else {
          data[field] = req.body[field].trim();
        }
      }
    });
    // taxCode: optional string
    if (req.body.taxCode !== undefined) {
      if (typeof req.body.taxCode !== 'string') {
        errors.push(`Field 'taxCode' must be a string.`);
      } else {
        data.taxCode = req.body.taxCode.trim();
      }
    }
    // isCompanyRegistered: optional boolean
    if (req.body.isCompanyRegistered !== undefined) {
      if (typeof req.body.isCompanyRegistered !== 'boolean') {
        errors.push(`Field 'isCompanyRegistered' must be a boolean.`);
      } else {
        data.isCompanyRegistered = req.body.isCompanyRegistered;
      }
    }
    // currentDigitalPlatforms: optional array of string
    if (req.body.currentDigitalPlatforms !== undefined) {
      if (!Array.isArray(req.body.currentDigitalPlatforms)) {
        errors.push(`Field 'currentDigitalPlatforms' must be an array of string.`);
      } else if (!req.body.currentDigitalPlatforms.every(i => typeof i === 'string')) {
        errors.push(`All items in 'currentDigitalPlatforms' must be string.`);
      } else {
        data.currentDigitalPlatforms = req.body.currentDigitalPlatforms;
      }
    }
    if (errors.length > 0) {
      return next(new AppError(errors.join(' '), 400));
    }
    req.validatedSellerRequest = data;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Validate process seller request body
 * @returns {Array} Express validator middleware chain
 */
const validateProcessSellerRequest = () => {
  return [
    body('status')
      .isIn([SELLER_REQUEST_STATUS.APPROVED, SELLER_REQUEST_STATUS.REJECTED])
      .withMessage('Status must be either APPROVED or REJECTED'),
    body('rejectReason')
      .if(body('status').equals(SELLER_REQUEST_STATUS.REJECTED))
      .notEmpty()
      .withMessage('Rejection reason is required when status is REJECTED'),
    async (req, res, next) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          const errorMessages = errors.array().map(err => err.msg);
          throw new AppError(errorMessages.join(', '), 400);
        }

        // Check if request exists and is pending
        const request = await BecomeSellerRequest.findById(req.params.requestId);
        if (!request) {
          throw new AppError('Seller request not found', 404);
        }
        if (request.status !== SELLER_REQUEST_STATUS.PENDING) {
          throw new AppError('Request has already been processed', 400);
        }

        // Validate status and rejectReason
        if (req.body.status === SELLER_REQUEST_STATUS.REJECTED && !req.body.rejectReason) {
          throw new AppError('Rejection reason is required when status is REJECTED', 400);
        }

        // Store validated request and data for controller usage
        req.validatedSellerRequest = request;
        req.validatedProcessData = {
          status: req.body.status,
          rejectReason: req.body.rejectReason,
          shouldUpdateUser: req.body.status === SELLER_REQUEST_STATUS.APPROVED,
        };
        next();
      } catch (error) {
        next(error);
      }
    },
  ];
};

/**
 * Validate pagination query parameters
 * @returns {Array} Express validator middleware chain
 */
const validatePaginationQuery = () => {
  return [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('sortBy').optional().isString().withMessage('SortBy must be a string'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('SortOrder must be either asc or desc'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        throw new AppError(errorMessages.join(', '), 400);
      }
      next();
    },
  ];
};

/**
 * Validate seller request filters:
 * - status: Optional, must be one of PENDING, APPROVED, REJECTED
 * - userId: Optional, must be valid MongoDB ObjectId
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const validateSellerRequestFilters = [
  query('status')
    .optional()
    .isIn(Object.values(SELLER_REQUEST_STATUS))
    .withMessage('Status must be one of: PENDING, APPROVED, REJECTED'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID format'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new AppError(errors.array()[0].msg, 400));
    }
    next();
  },
];

/**
 * Validate get users query parameters:
 * - name: Optional, string for searching by name
 * - role: Optional, must be one of [BUYER, SELLER, ADMIN]
 * - isActive: Optional, boolean for searching by active status
 * - sortBy: Optional, must be one of [createdAt, updatedAt, firstName, lastName, email]
 * - sortOrder: Optional, must be one of [asc, desc]
 * @returns {Array} Express validator middleware chain
 */
const validateGetUsers = () => {
  return [
    ...validatePaginationQuery(),
    query('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters'),
    query('role').optional().isIn(Object.values(USER_ROLES)).withMessage('Invalid role value'),
    query('isActive').optional().isBoolean().withMessage('isActive must be true or false'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email'])
      .withMessage('Invalid sort field'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        throw new AppError(errorMessages.join(', '), 400);
      }
      next();
    },
  ];
};

/**
 * Middleware to validate cancel seller request (buyer only)
 * - Check if requestId is valid
 * - Check if request exists
 * - Check if user is the owner
 * - Check if status is PENDING
 * If valid, assign request to req.validatedSellerRequest
 * If invalid, return error immediately
 */
const validateCancelSellerRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return next(new AppError('Invalid request ID', 400));
    }
    const request = await BecomeSellerRequest.findById(requestId);
    if (!request) {
      return next(new AppError('Request not found', 404));
    }
    if (request.user.toString() !== userId.toString()) {
      return next(new AppError('Forbidden', 403));
    }
    if (request.status !== SELLER_REQUEST_STATUS.PENDING) {
      return next(new AppError('Only pending requests can be cancelled', 400));
    }
    req.validatedSellerRequest = request;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to validate user update request by admin
 * Validates and filters:
 * - email: valid email format
 * - password: at least 6 characters, contains uppercase, lowercase and number
 * - isActive: boolean
 * @returns {Array} Array of validation middleware functions
 */
const validateUpdateUser = () => [
  body('email')
    .optional()
    .trim()
    .matches(REGEX_PATTERNS.EMAIL)
    .withMessage(MESSAGES.VALIDATION.INVALID_EMAIL),

  body('password')
    .optional()
    .matches(REGEX_PATTERNS.PASSWORD)
    .withMessage(MESSAGES.VALIDATION.PASSWORD_LENGTH),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean value'),

  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      throw new AppError(errorMessages.join(', '), 400);
    }

    // Filter only validated fields
    const allowedFields = ['email', 'password', 'isActive'];
    const filteredData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        filteredData[field] = req.body[field];
      }
    });

    // Check if there are any fields to update
    if (Object.keys(filteredData).length === 0) {
      throw new AppError(MESSAGES.VALIDATION.NO_FIELDS_TO_UPDATE, 400);
    }

    // Replace request body with filtered data
    req.body = filteredData;

    // Business: Check user exists
    const { id } = req.params;
    const { email } = req.body;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid user id', 400));
    }
    const user = await User.findById(id);
    if (!user) {
      return next(new AppError(MESSAGES.USER.NOT_FOUND, 404));
    }
    // Business: Check email unique
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new AppError(MESSAGES.AUTH.EMAIL_EXISTS, 400));
      }
    }
    next();
  },
];

const validateCreateCategory = () => [
  // Required fields
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Category name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),

  // Optional fields
  body('parentId').optional().isMongoId().withMessage('Invalid parent category ID'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean value'),

  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      throw new AppError(errorMessages.join(', '), 400);
    }

    // Filter only valid fields
    const allowedFields = ['name', 'parentId', 'isActive'];
    const filteredData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        filteredData[field] = req.body[field];
      }
    });

    // Generate unique slug from name
    const baseSlug = slugify(filteredData.name, {
      lower: true,
      strict: true,
      locale: 'vi',
    });
    filteredData.slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;

    // Business validation: Check parent category if parentId exists
    const { parentId } = filteredData;
    if (parentId) {
      const parent = await Category.findById(parentId);
      if (!parent) {
        return next(new AppError('Parent category not found', 404));
      }
      if (parent.level >= CATEGORY_LEVEL.GRANDCHILD) {
        return next(new AppError('Cannot create category deeper than grandchild level', 400));
      }
    }

    // Replace request body with filtered data
    req.body = filteredData;
    next();
  },
];

const validateUpdateCategory = () => [
  // Optional fields for update
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),

  body('parentId')
    .optional()
    .custom(value => {
      if (value === null) return true;
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('Invalid parent category ID'),

  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean value'),

  async (req, res, next) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      throw new AppError(errorMessages.join(', '), 400);
    }

    // Only allow valid fields
    const allowedFields = ['name', 'parentId', 'isActive'];
    const filteredData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        filteredData[field] = req.body[field];
      }
    });

    // Check if there are any fields to update
    if (Object.keys(filteredData).length === 0) {
      throw new AppError('No fields to update', 400);
    }

    // Generate unique slug from name if name is provided
    if (filteredData.name) {
      const baseSlug = slugify(filteredData.name, {
        lower: true,
        strict: true,
        locale: 'vi',
      });
      filteredData.slug = `${baseSlug}-${uuidv4().slice(0, 8)}`;
    }

    // Business validation: Check category existence
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid category id', 400));
    }
    const category = await Category.findById(id);
    if (!category) {
      return next(new AppError('Category not found', 404));
    }

    // If parentId is being changed, check for children
    if (
      filteredData.parentId !== undefined &&
      filteredData.parentId !== String(category.parentId)
    ) {
      if (category.children && category.children.length > 0) {
        return next(new AppError('Cannot change parent of a category with children', 400));
      }
      // Check new parent exists and is valid if not null
      if (filteredData.parentId !== null) {
        const parent = await Category.findById(filteredData.parentId);
        if (!parent) {
          return next(new AppError('Parent category not found', 404));
        }
        if (parent.level >= CATEGORY_LEVEL.GRANDCHILD) {
          return next(new AppError('Cannot set parent to a grandchild category', 400));
        }
      }
    }

    req.category = category; // Attach for controller/service
    req.body = filteredData;
    next();
  },
];

const validateGetCategories = () => [
  // Pagination
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  // Filters
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Search term must be between 2 and 50 characters'),

  query('parentId')
    .optional()
    .custom(value => {
      if (value === null) return true;
      return mongoose.Types.ObjectId.isValid(value);
    })
    .withMessage('Invalid parent category ID'),

  query('level')
    .optional()
    .isInt({ min: 0, max: 2 })
    .withMessage('Level must be between 0 and 2')
    .toInt(),

  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
    .toBoolean(),

  // Sort
  query('sortBy')
    .optional()
    .isIn(['name', 'level', 'createdAt', 'updatedAt'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc'),

  // Validation handler
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      throw new AppError(errorMessages.join(', '), 400);
    }

    // Filter and sanitize query params
    const allowedFields = [
      'page',
      'limit',
      'search',
      'parentId',
      'level',
      'isActive',
      'sortBy',
      'sortOrder',
    ];

    const filteredQuery = {};
    allowedFields.forEach(field => {
      if (req.query[field] !== undefined) {
        filteredQuery[field] = req.query[field];
      }
    });

    // Set default values
    filteredQuery.page = filteredQuery.page || 1;
    filteredQuery.limit = filteredQuery.limit || 10;
    filteredQuery.sortBy = filteredQuery.sortBy || 'createdAt';
    filteredQuery.sortOrder = filteredQuery.sortOrder || 'desc';

    // Replace query with filtered data
    req.query = filteredQuery;

    next();
  },
];

/**
 * Middleware to validate update category image request
 * Validates:
 * - mediaId: required, valid ObjectId format
 * - categoryId: valid ObjectId format
 * @returns {Array} Array of validation middleware functions
 */
const validateUpdateCategoryImage = () => [
  param('categoryId').isMongoId().withMessage('Invalid category ID format'),

  body('mediaId')
    .notEmpty()
    .withMessage('Media ID is required')
    .isMongoId()
    .withMessage('Invalid media ID format'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        throw new AppError(errorMessages.join(', '), 400);
      }

      // Filter only validated fields
      const allowedFields = ['mediaId'];
      const filteredData = {};

      allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
          filteredData[field] = req.body[field];
        }
      });

      // Replace request body with filtered data
      req.body = filteredData;

      // Business: Check category exists
      const { categoryId } = req.params;
      const category = await Category.findById(categoryId);
      if (!category) {
        throw new AppError('Category not found', 404);
      }

      // Business: Check media exists and is not owned by another entity
      const { mediaId } = req.body;
      const media = await Media.findById(mediaId);
      if (!media) {
        throw new AppError('Media not found', 404);
      }

      if (media.ownerType && media.ownerType !== IMAGE_OWNER_TYPE.CATEGORY) {
        throw new AppError('Media is already owned by another entity', 400);
      }

      if (media.ownerId && media.ownerId.toString() !== categoryId) {
        throw new AppError('Media is already owned by another category', 400);
      }

      // Add validated data to request for use in controller
      req.validatedData = {
        categoryId,
        mediaId,
      };

      next();
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Middleware to validate and filter create product request
 * Only allows necessary fields, validates types, and handles all errors
 * Passes validated data to req.validatedData
 */
const validateCreateProduct = [
  body('name')
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be 2-100 characters'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isNumeric()
    .withMessage('Price must be a number'),
  body('discountPrice').optional().isNumeric().withMessage('Discount price must be a number'),
  body('categories').optional().isArray().withMessage('Categories must be an array of ObjectIds'),
  body('categories.*').optional().isMongoId().withMessage('Each category must be a valid ObjectId'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('isFeatured').optional().isBoolean().withMessage('isFeatured must be boolean'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  body('totalRating').optional().isNumeric().withMessage('totalRating must be a number'),
  body('totalRatingPoints')
    .optional()
    .isNumeric()
    .withMessage('totalRatingPoints must be a number'),
  body('quantity').optional().isNumeric().withMessage('Quantity must be a number'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(
        new AppError(
          errors
            .array()
            .map(e => e.msg)
            .join(', '),
          400
        )
      );
    }
    // Filter only allowed fields
    const allowedFields = [
      'name',
      'description',
      'price',
      'discountPrice',
      'categories',
      'isActive',
      'isFeatured',
      'metadata',
      'totalRating',
      'totalRatingPoints',
      'quantity',
    ];
    const filteredData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) filteredData[key] = req.body[key];
    }
    // Required fields
    if (!filteredData.name || !filteredData.description || filteredData.price === undefined) {
      return next(new AppError('Missing required fields: name, description, price', 400));
    }
    // price, discountPrice, quantity, totalRating, totalRatingPoints >= 0
    if (Number(filteredData.price) < 0) {
      return next(new AppError('Price cannot be negative', 400));
    }
    if (filteredData.discountPrice !== undefined && Number(filteredData.discountPrice) < 0) {
      return next(new AppError('Discount price cannot be negative', 400));
    }
    if (filteredData.quantity !== undefined && Number(filteredData.quantity) < 0) {
      return next(new AppError('Quantity cannot be negative', 400));
    }
    if (filteredData.totalRating !== undefined && Number(filteredData.totalRating) < 0) {
      return next(new AppError('Total rating cannot be negative', 400));
    }
    if (
      filteredData.totalRatingPoints !== undefined &&
      Number(filteredData.totalRatingPoints) < 0
    ) {
      return next(new AppError('Total rating points cannot be negative', 400));
    }
    // discountPrice <= price
    if (
      filteredData.discountPrice !== undefined &&
      filteredData.price !== undefined &&
      Number(filteredData.discountPrice) > Number(filteredData.price)
    ) {
      return next(new AppError('Discount price cannot be greater than price', 400));
    }
    // Check categories exist and no duplicate
    if (filteredData.categories && filteredData.categories.length > 0) {
      // Duplicate check
      const uniqueCategories = new Set(filteredData.categories.map(String));
      if (uniqueCategories.size !== filteredData.categories.length) {
        return next(new AppError('Duplicate category in categories array', 400));
      }
      // Existence check
      const found = await Category.find({ _id: { $in: filteredData.categories } });
      if (found.length !== filteredData.categories.length) {
        return next(new AppError('One or more categories do not exist', 400));
      }
    }
    req.validatedData = filteredData;
    next();
  },
];

/**
 * Middleware to validate and filter get products query
 * Only allows necessary fields, validates types, and handles all errors
 * Passes validated data to req.query
 */
const validateGetProducts = [
  ...validatePaginationQuery(),
  query('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be 1-100 characters'),
  query('priceMin').optional().isNumeric().withMessage('priceMin must be a number'),
  query('priceMax').optional().isNumeric().withMessage('priceMax must be a number'),
  query('discountPriceMin').optional().isNumeric().withMessage('discountPriceMin must be a number'),
  query('discountPriceMax').optional().isNumeric().withMessage('discountPriceMax must be a number'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('isFeatured').optional().isBoolean().withMessage('isFeatured must be boolean'),
  query('categories')
    .optional()
    .custom(value => {
      const arr = typeof value === 'string' ? [value] : value; // cast string to array
      for (const v of arr) {
        if (!mongoose.Types.ObjectId.isValid(v)) {
          throw new Error('Each category must be a valid ObjectId');
        }
      }
      return true;
    }),
  query('createdBy').optional().isMongoId().withMessage('createdBy must be a valid ObjectId'),
  query('quantityMin').optional().isNumeric().withMessage('quantityMin must be a number'),
  query('quantityMax').optional().isNumeric().withMessage('quantityMax must be a number'),
  query('createdAtFrom').optional().isISO8601().withMessage('createdAtFrom must be a valid date'),
  query('createdAtTo').optional().isISO8601().withMessage('createdAtTo must be a valid date'),
  query('updatedAtFrom').optional().isISO8601().withMessage('updatedAtFrom must be a valid date'),
  query('updatedAtTo').optional().isISO8601().withMessage('updatedAtTo must be a valid date'),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      return next(new AppError(errorMessages.join(', '), 400));
    }
    // Filter only allowed fields
    const allowedFields = [
      'page',
      'limit',
      'sortBy',
      'sortOrder',
      'name',
      'priceMin',
      'priceMax',
      'discountPriceMin',
      'discountPriceMax',
      'isActive',
      'isFeatured',
      'categories',
      'createdBy',
      'quantityMin',
      'quantityMax',
      'createdAtFrom',
      'createdAtTo',
      'updatedAtFrom',
      'updatedAtTo',
    ];

    const filteredQuery = {};
    allowedFields.forEach(field => {
      if (req.query[field] !== undefined) {
        filteredQuery[field] = req.query[field];
      }
    });
    req.validatedQuery = filteredQuery;
    next();
  },
];

/**
 * Middleware to validate and filter update product request
 * Only allows necessary fields, validates types, and handles all errors
 * Passes validated data to req.validatedData
 */
const validateUpdateProduct = [
  param('id').isMongoId().withMessage('Invalid product ID format'),

  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be 2-100 characters'),

  body('description').optional().isString().withMessage('Description must be a string'),

  body('price').optional().isNumeric().withMessage('Price must be a number'),

  body('discountPrice').optional().isNumeric().withMessage('Discount price must be a number'),

  body('categories')
    .optional()
    .custom(value => {
      const arr = typeof value === 'string' ? [value] : value;
      if (!Array.isArray(arr)) {
        throw new Error('categories must be an array or string');
      }
      for (const v of arr) {
        if (!mongoose.Types.ObjectId.isValid(v)) {
          throw new Error('Each category must be a valid ObjectId');
        }
      }
      return true;
    }),

  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),

  body('isFeatured').optional().isBoolean().withMessage('isFeatured must be boolean'),

  body('metadata').optional().isObject().withMessage('Metadata must be an object'),

  body('quantity').optional().isNumeric().withMessage('Quantity must be a number'),

  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(
          new AppError(
            errors
              .array()
              .map(e => e.msg)
              .join(', '),
            400
          )
        );
      }

      // Filter only allowed fields (removed totalRating and totalRatingPoints)
      const allowedFields = [
        'name',
        'description',
        'price',
        'discountPrice',
        'categories',
        'isActive',
        'isFeatured',
        'metadata',
        'quantity',
      ];

      const filteredData = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filteredData[key] = req.body[key];
        }
      }

      // Check if there are any fields to update
      if (Object.keys(filteredData).length === 0) {
        return next(new AppError('No fields provided for update', 400));
      }

      // Business validation: price, discountPrice, quantity >= 0
      if (filteredData.price !== undefined && Number(filteredData.price) < 0) {
        return next(new AppError('Price cannot be negative', 400));
      }
      if (filteredData.discountPrice !== undefined && Number(filteredData.discountPrice) < 0) {
        return next(new AppError('Discount price cannot be negative', 400));
      }
      if (filteredData.quantity !== undefined && Number(filteredData.quantity) < 0) {
        return next(new AppError('Quantity cannot be negative', 400));
      }

      // Business validation: discountPrice <= price
      if (
        filteredData.discountPrice !== undefined &&
        filteredData.price !== undefined &&
        Number(filteredData.discountPrice) > Number(filteredData.price)
      ) {
        return next(new AppError('Discount price cannot be greater than price', 400));
      }

      // Business validation: Check categories exist and no duplicate
      if (filteredData.categories && filteredData.categories.length > 0) {
        // Convert to array if string
        const categories =
          typeof filteredData.categories === 'string'
            ? [filteredData.categories]
            : filteredData.categories;

        // Duplicate check
        const uniqueCategories = new Set(categories.map(String));
        if (uniqueCategories.size !== categories.length) {
          return next(new AppError('Duplicate category in categories array', 400));
        }

        // Existence check
        const found = await Category.find({ _id: { $in: categories } });
        if (found.length !== categories.length) {
          return next(new AppError('One or more categories do not exist', 400));
        }

        filteredData.categories = categories;
      }

      // Business validation: Check product exists
      const product = await Product.findById(req.params.id);
      if (!product) {
        return next(new AppError('Product not found', 404));
      }

      // Business validation: Check user permissions
      const user = req.user;
      if (user.role === USER_ROLES.SELLER && product.createdBy.toString() !== user._id.toString()) {
        return next(new AppError('You can only update your own products', 403));
      }

      // Store validated data and product for controller usage
      req.validatedData = filteredData;
      req.product = product;

      next();
    } catch (error) {
      next(error);
    }
  },
];

module.exports = {
  validateUserFields,
  validateBuyerLogin,
  validateUpdateProfile,
  validateSellerRequest,
  validatePaginationQuery,
  validateSellerRequestFilters,
  validateProcessSellerRequest,
  validateGetUsers,
  validateCancelSellerRequest,
  validateUpdateUser,
  validateCreateCategory,
  validateUpdateCategory,
  validateGetCategories,
  validateUpdateCategoryImage,
  validateCreateProduct,
  validateGetProducts,
  validateUpdateProduct,
};
