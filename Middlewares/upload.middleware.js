const { body, validationResult } = require('express-validator');
const { AppError } = require('../Utils/error.utils');
const { MEDIA_TYPE, SUPPORTED_FILE_TYPES } = require('../Utils/constant');

/**
 * Middleware to validate file upload
 * @returns {Array} Array of validation middleware functions
 */
const validateFileUpload = () => {
  return [
    body('files').custom((value, { req }) => {
      if (!req.files || req.files.length === 0) {
        throw new AppError('No files uploaded', 400);
      }

      // Check each file
      req.files.forEach(file => {
        // Assign folder based on file type
        const isImage = SUPPORTED_FILE_TYPES.IMAGE.MIME_TYPES.includes(file.mimetype);

        file.folder = isImage ? MEDIA_TYPE.IMAGE : MEDIA_TYPE.VIDEO;
      });

      return true;
    }),
  ];
};

/**
 * Middleware to handle validation errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }
  next();
};

module.exports = {
  validateFileUpload,
  handleValidationErrors,
};
