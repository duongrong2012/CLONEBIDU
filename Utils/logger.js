const fs = require('fs');
const path = require('path');
const pino = require('pino');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_ENABLED = process.env.LOG_ENABLED !== 'false';
const LOG_TO_FILE = process.env.DATADOG_LOG_TO_FILE === 'true';
const LOG_FILE_PATH = process.env.LOG_FILE_PATH
  ? path.resolve(process.cwd(), process.env.LOG_FILE_PATH)
  : path.join(process.cwd(), 'logs', 'bidu-json.log');

const loggerOptions = {
  enabled: LOG_ENABLED,
  level: LOG_LEVEL,
  base: {
    service: process.env.SERVICE_NAME || 'bidu-server',
    env: process.env.NODE_ENV || 'development',
    ...(process.env.APP_VERSION ? { version: process.env.APP_VERSION } : {}),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'password',
      'token',
      'access_token',
      'refresh_token',
      'authorization',
      'headers.authorization',
      'headers.cookie',
      'cookie',
      'secret',
      '*.password',
      '*.token',
    ],
    censor: '[REDACTED]',
  },
};

function createLogger() {
  if (!LOG_TO_FILE) {
    return pino(loggerOptions);
  }

  fs.mkdirSync(path.dirname(LOG_FILE_PATH), { recursive: true });
  const fileDest = pino.destination({ dest: LOG_FILE_PATH, sync: false });
  const streams = [
    { level: 'trace', stream: process.stdout },
    { level: 'trace', stream: fileDest },
  ];
  return pino(loggerOptions, pino.multistream(streams));
}

module.exports = createLogger();
