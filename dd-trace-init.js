'use strict';

/**
 * Datadog APM / Error Tracking (dd-trace) cho Node.js.
 * Phải được require TRƯỚC express và các thư viện cần instrument.
 *
 * Bật bằng DD_TRACE_ENABLED=true (các biến DD_* khác xem docs/datadog-logging-demo.md).
 * Trên Windows: Agent chạy trên cùng máy, mặc định nhận trace qua localhost — không cần tùy chọn "Linux" trên UI.
 */

if (process.env.DD_TRACE_ENABLED !== 'true') {
  module.exports = null;
} else {
  const tracer = require('dd-trace');
  module.exports = tracer.init({
    service: process.env.DD_SERVICE || process.env.SERVICE_NAME || 'bidu-server',
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
    version: process.env.DD_VERSION,
    logInjection: true,
    runtimeMetrics: process.env.DD_RUNTIME_METRICS_ENABLED === 'true',
  });
}
