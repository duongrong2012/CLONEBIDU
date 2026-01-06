/**
 * Shared mocks/constants for Change Password API tests.
 * Keep test data centralized to avoid repetition across cases.
 */

const VALID_OLD_PASSWORD = 'Aa123456';
const VALID_NEW_PASSWORD = 'Bb123456';

const VALID_CHANGE_PASSWORD_BODY = {
  oldPassword: VALID_OLD_PASSWORD,
  newPassword: VALID_NEW_PASSWORD,
};

module.exports = {
  VALID_OLD_PASSWORD,
  VALID_NEW_PASSWORD,
  VALID_CHANGE_PASSWORD_BODY,
};
