const { AppError } = require('../Utils/error.utils');
const { HTTP_STATUS, MESSAGES } = require('../Utils/constant');

const DEFAULT_FORGOT_PASSWORD_RATE_LIMIT_MS = 30 * 1000;
const configuredRateLimitMs = Number.parseInt(process.env.FORGOT_PASSWORD_RATE_LIMIT_MS, 10);
const FORGOT_PASSWORD_RATE_LIMIT_MS =
  Number.isInteger(configuredRateLimitMs) && configuredRateLimitMs > 0
    ? configuredRateLimitMs
    : DEFAULT_FORGOT_PASSWORD_RATE_LIMIT_MS;
const forgotPasswordRateLimits = new Map();

function pruneExpiredRateLimits(now) {
  for (const [email, expiresAt] of forgotPasswordRateLimits.entries()) {
    if (expiresAt <= now) {
      forgotPasswordRateLimits.delete(email);
    }
  }
}

/**
 * Limits password reset requests to one request per email every 30 seconds.
 */
function forgotPasswordRateLimit(req, res, next) {
  const now = Date.now();
  const email = req.validatedData.email;
  const limitedUntil = forgotPasswordRateLimits.get(email);

  pruneExpiredRateLimits(now);

  if (limitedUntil && limitedUntil > now) {
    const retryAfterSeconds = Math.ceil((limitedUntil - now) / 1000);

    res.set('Retry-After', String(retryAfterSeconds));
    return next(
      new AppError(MESSAGES.AUTH.PASSWORD_RESET_RATE_LIMITED, HTTP_STATUS.TOO_MANY_REQUESTS, [
        {
          field: 'email',
          message: MESSAGES.AUTH.PASSWORD_RESET_RATE_LIMITED,
        },
      ])
    );
  }

  forgotPasswordRateLimits.set(email, now + FORGOT_PASSWORD_RATE_LIMIT_MS);
  next();
}

module.exports = {
  forgotPasswordRateLimit,
};
