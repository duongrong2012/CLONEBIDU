const { AppError } = require('../Utils/error.utils');

/**
 * Validate and sanitize query parameters for getting wards.
 * Only allows positive integer for page and limit if provided.
 * Default: page=1, limit=20
 */
module.exports = (req, res, next) => {
  const { page, limit, parentCode } = req.query;
  let validated = {};

  // Default values
  validated.page = 1;
  validated.limit = 20;

  if (page !== undefined) {
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum <= 0) {
      return next(new AppError(400, 'Page must be a positive integer.'));
    }
    validated.page = pageNum;
  }

  if (limit !== undefined) {
    const limitNum = Number(limit);
    if (!Number.isInteger(limitNum) || limitNum <= 0) {
      return next(new AppError(400, 'Limit must be a positive integer.'));
    }
    validated.limit = limitNum;
  }

  if (parentCode !== undefined) {
    if (typeof parentCode !== 'string' || parentCode.trim() === '') {
      return next(new AppError(400, 'parentCode must be a non-empty string.'));
    }
    validated.parentCode = parentCode.trim();
  }

  req.validatedData = validated;
  next();
};
