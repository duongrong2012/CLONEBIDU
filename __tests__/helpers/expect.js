/**
 * Shared expect/assert helpers for tests.
 * Keep test files focused on business cases and avoid duplicated assertion boilerplate.
 */

/**
 * Expect standard validation error response shape:
 * - status 400
 * - message "Validation failed"
 * - errors is an array
 *
 * The repo has 2 common error item shapes:
 * - { field, message } (AppError formatted)
 * - { path/param, msg } (express-validator raw)
 *
 * Optionally assert that at least one error matches:
 * - { field, message } OR { path, msg }
 */
function expectValidationError(res, expected) {
  expect(res.status).toBe(400);
  expect(res.body.message).toBe('Validation failed');
  expect(Array.isArray(res.body.errors)).toBe(true);

  if (expected) {
    const field = expected.field ?? expected.path ?? expected.param;
    const message = expected.message ?? expected.msg;
    const found = res.body.errors.some(e => {
      const itemField = e.field ?? e.path ?? e.param;
      const itemMsg = e.message ?? e.msg;
      const sameField = field ? String(itemField).includes(field) : true;
      const sameMsg = message ? itemMsg === message : true;
      return sameField && sameMsg;
    });
    expect(found).toBe(true);
  }
}

module.exports = {
  expectValidationError,
};
