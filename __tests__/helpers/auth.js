/**
 * Shared auth helpers for tests that go through auth middlewares:
 * - verifyToken()
 * - verifyRefreshToken()
 * - optionalAuth()
 *
 * Goal: keep test files focused on business logic by removing repeated boilerplate
 * (auth header, seeding users, mocking jwtUtils.verifyToken for req.user resolution).
 */

const User = require('../../Models/user.model');
const { GENDERS, USER_ROLES } = require('../../Utils/constant');

function authHeader(token = 't') {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Seed a user with sensible defaults. Override any field as needed.
 */
async function seedUser(overrides = {}) {
  const role = overrides.role ?? USER_ROLES.BUYER;
  const now = Date.now();
  const rand = Math.random().toString(16).slice(2);
  return User.create({
    email: overrides.email ?? `${String(role).toLowerCase()}.${now}.${rand}@ex.com`,
    password: overrides.password ?? 'Aa123456',
    firstName: overrides.firstName ?? String(role),
    lastName: overrides.lastName ?? 'User',
    gender: overrides.gender ?? GENDERS.MALE,
    role,
    isActive: overrides.isActive ?? true,
    ...overrides,
  });
}

/**
 * Make auth middleware resolve req.user by mocking jwtUtils.verifyToken() to return user._id.
 * Note: verifyToken middleware will still query User.findById(decoded._id).
 */
function authAs(jwtUtils, user, decodedExtra = {}) {
  jwtUtils.verifyToken.mockReturnValue({ _id: user._id, ...decodedExtra });
  return user;
}

function mockTokenInvalid(jwtUtils) {
  jwtUtils.verifyToken.mockImplementation(() => {
    throw new Error('invalid');
  });
}

function mockTokenExpired(jwtUtils) {
  jwtUtils.verifyToken.mockImplementation(() => {
    const err = new Error('expired');
    err.name = 'TokenExpiredError';
    throw err;
  });
}

function mockDecodedId(jwtUtils, id, decodedExtra = {}) {
  jwtUtils.verifyToken.mockReturnValue({ _id: id, ...decodedExtra });
}

module.exports = {
  authHeader,
  seedUser,
  authAs,
  mockTokenInvalid,
  mockTokenExpired,
  mockDecodedId,
};
