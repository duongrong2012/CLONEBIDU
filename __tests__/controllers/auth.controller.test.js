/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const authController = require('../../Controllers/auth.controller');
const authService = require('../../Services/auth.service');

describe('AuthController', () => {
  test('refreshToken calls next on error', async () => {
    const spy = jest.spyOn(authService, 'refreshToken').mockRejectedValueOnce(new Error('fail'));
    const req = { user: { _id: 'u1' } };
    const res = { json: jest.fn() };
    const next = jest.fn();
    await authController.refreshToken(req, res, next);
    expect(next).toHaveBeenCalled();
    spy.mockRestore();
  });
});
