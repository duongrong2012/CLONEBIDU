/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const jwtUtils = require('../../Utils/jwt.utils');
const User = require('../../Models/user.model');
const { optionalAuth, verifyRefreshToken } = require('../../Middlewares/auth.middleware');
const { USER_ROLES, MESSAGES } = require('../../Utils/constant');

describe('Auth middleware - optionalAuth/verifyRefreshToken', () => {
  test('optionalAuth sets req.user null when no token', async () => {
    const req = { headers: {}, cookies: {} };
    const next = jest.fn();
    await optionalAuth(req, {}, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  test('optionalAuth sets req.user null when token invalid', async () => {
    jwtUtils.verifyToken.mockImplementationOnce(() => {
      throw new Error('invalid');
    });
    const req = { headers: { authorization: 'Bearer t' }, cookies: {} };
    const next = jest.fn();
    await optionalAuth(req, {}, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
  });

  test('optionalAuth sets req.user null when user not found', async () => {
    jwtUtils.verifyToken.mockReturnValueOnce({ _id: '507f1f77bcf86cd799439011' });
    jest.spyOn(User, 'findById').mockResolvedValueOnce(null);
    const req = { headers: { authorization: 'Bearer t' }, cookies: {} };
    const next = jest.fn();
    await optionalAuth(req, {}, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
    User.findById.mockRestore();
  });

  test('optionalAuth sets req.user null when user inactive', async () => {
    jwtUtils.verifyToken.mockReturnValueOnce({ _id: '507f1f77bcf86cd799439011' });
    jest.spyOn(User, 'findById').mockResolvedValueOnce({ isActive: false });
    const req = { headers: { authorization: 'Bearer t' }, cookies: {} };
    const next = jest.fn();
    await optionalAuth(req, {}, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
    User.findById.mockRestore();
  });

  test('optionalAuth sets req.user null on unexpected error', async () => {
    jwtUtils.verifyToken.mockReturnValueOnce({ _id: '507f1f77bcf86cd799439011' });
    jest.spyOn(User, 'findById').mockRejectedValueOnce(new Error('db down'));
    const req = { headers: { authorization: 'Bearer t' }, cookies: {} };
    const next = jest.fn();
    await optionalAuth(req, {}, next);
    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalled();
    User.findById.mockRestore();
  });

  test('verifyRefreshToken returns forbidden when role not allowed', async () => {
    jwtUtils.extractTokenFromBearer.mockReturnValueOnce('rt');
    jwtUtils.verifyToken.mockReturnValueOnce({ _id: '507f1f77bcf86cd799439011' });
    jest
      .spyOn(User, 'findById')
      .mockResolvedValueOnce({ isActive: true, role: USER_ROLES.BUYER, toPublicJSON: () => ({}) });

    const req = { headers: { authorization: 'Bearer rt' } };
    const next = jest.fn();
    await verifyRefreshToken([USER_ROLES.ADMIN])(req, {}, next);
    const err = next.mock.calls[0][0];
    expect(err.message).toBe(MESSAGES.AUTH.FORBIDDEN);
    User.findById.mockRestore();
  });
});
