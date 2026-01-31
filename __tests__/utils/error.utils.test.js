/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const { errorUtils, AppError } = require('../../Utils/error.utils');

describe('error.utils', () => {
  test('handleMongooseError for ValidationError', () => {
    const err = {
      name: 'ValidationError',
      errors: { email: { message: 'Invalid email' } },
    };
    const res = errorUtils.constructor.handleMongooseError(err);
    expect(res).toBeInstanceOf(AppError);
    expect(res.message).toBe('Validation Error');
  });

  test('handleMongooseError for duplicate key', () => {
    const err = { code: 11000, keyPattern: { email: 1 } };
    const res = errorUtils.constructor.handleMongooseError(err);
    expect(res).toBeInstanceOf(AppError);
    expect(res.message).toBe('Duplicate value for email');
  });
});
