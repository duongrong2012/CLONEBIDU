const crypto = require('crypto');
const logger = require('../Utils/logger');

const shouldSampleInfoLog = () => {
  const sampleRate = Number(process.env.LOG_SAMPLE_RATE || 1);
  if (!Number.isFinite(sampleRate) || sampleRate >= 1) return true;
  if (sampleRate <= 0) return false;
  return Math.random() < sampleRate;
};

const generateRequestId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `req_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
};

const requestLogger = (req, res, next) => {
  const startNs = process.hrtime.bigint();
  const requestId = req.headers['x-request-id'] || generateRequestId();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  logger.debug({
    message: 'Incoming request',
    status: 'debug',
    request_id: requestId,
    method: req.method,
    path: req.originalUrl,
  });

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    const ddStatus = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const logPayload = {
      message: 'Request completed',
      status: ddStatus,
      request_id: requestId,
      method: req.method,
      path: req.originalUrl,
      status_code: res.statusCode,
      duration_ms: Number(durationMs.toFixed(2)),
      ip: req.ip,
      user_agent: req.get('user-agent'),
      user_id: req.user?.id || req.user?._id || null,
    };

    if (res.statusCode >= 500) {
      logger.error(logPayload);
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(logPayload);
      return;
    }

    if (shouldSampleInfoLog()) {
      logger.info(logPayload);
    }
  });

  next();
};

module.exports = requestLogger;
