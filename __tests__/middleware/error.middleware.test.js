/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const errorHandler = require('../../Middlewares/error.middleware');
const { AppError } = require('../../Utils/error.utils');

describe('Error middleware', () => {
  test('handles AppError with fail status', () => {
    const err = new AppError('Bad', 400);
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    errorHandler(err, {}, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.payload.status).toBe('fail');
    expect(res.payload.message).toBe('Bad');
  });

  test('includes stack in development', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const err = new Error('boom');
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    errorHandler(err, {}, res, () => {});
    expect(res.payload.stack).toBeTruthy();
    process.env.NODE_ENV = original;
  });
});
