const { AppError } = require('../Utils/error.utils');
const { MESSAGES, REGEX_PATTERNS, GENDERS } = require('../Utils/constant');
const { body, validationResult, query } = require('express-validator');
const validationUtils = require('../Utils/validation.utils');
const { HTTP_STATUS } = require('../Utils/constant');
const response = require('../Utils/response.utils');
const User = require('../Models/user.model');
const BecomeSellerRequest = require('../Models/becomeSellerRequest.model');
const { SELLER_REQUEST_STATUS, USER_ROLES } = require('../Utils/constant');
const mongoose = require('mongoose');

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

module.exports = {
  validateUserFields,
  validateBuyerLogin,
  validateUpdateProfile,
  validateSellerRequest,
  validatePaginationQuery,
  validateSellerRequestFilters,
  validateProcessSellerRequest,
  validateCancelSellerRequest,
};
