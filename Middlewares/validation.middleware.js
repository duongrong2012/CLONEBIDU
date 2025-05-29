const { AppError } = require('../Utils/error.utils');
const { MESSAGES, REGEX_PATTERNS, GENDERS } = require('../Utils/constant');
const { body, validationResult } = require('express-validator');
const validationUtils = require('../Utils/validation.utils');
const { HTTP_STATUS } = require('../Utils/constant');
const response = require('../Utils/response.utils');

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

module.exports = {
  validateUserFields,
  validateBuyerLogin,
  validateUpdateProfile,
};
