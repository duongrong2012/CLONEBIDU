const express = require('express');
const { AppError } = require('../Utils/error.utils');

const router = express.Router();

/**
 * GET /demo/error-500
 * Cố ý trả 500 để demo logging / Datadog (không dùng trong production thật).
 */
router.get('/error-500', (req, res, next) => {
  next(new AppError('Intentional demo server error (HTTP 500) for logging', 500));
});

module.exports = router;
