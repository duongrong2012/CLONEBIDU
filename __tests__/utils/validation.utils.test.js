/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const validationUtils = require('../../Utils/validation.utils');

describe('validation.utils', () => {
  test('validateEmail throws when missing', () => {
    expect(() => validationUtils.validateEmail('')).toThrow();
  });

  test('validateBirthday throws when in future', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(() => validationUtils.validateBirthday(future.toISOString())).toThrow();
  });
});
