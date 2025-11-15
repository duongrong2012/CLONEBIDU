// Soft-auth middleware: set flags instead of throwing, so controller can always 200

function normalizeIp(ip) {
  if (!ip) return '';
  const str = String(ip);
  // Handle IPv6-mapped IPv4 like ::ffff:127.0.0.1
  const parts = str.split('::ffff:');
  return parts.length === 2 ? parts[1] : str;
}

function ipToLong(ip) {
  const normalized = normalizeIp(ip);
  const octets = normalized.split('.').map(x => parseInt(x, 10));
  if (octets.length !== 4 || octets.some(n => Number.isNaN(n))) return null;
  // Ensure unsigned 32-bit

  return (
    (((octets[0] << 24) >>> 0) +
      ((octets[1] << 16) >>> 0) +
      ((octets[2] << 8) >>> 0) +
      (octets[3] >>> 0)) >>>
    0
  );
}

function matchIp(ip, pattern) {
  const targetLong = ipToLong(ip);
  if (targetLong == null) return false;
  const [range, cidrBitsStr] = pattern.split('/');
  if (!cidrBitsStr) {
    return normalizeIp(ip) === normalizeIp(range);
  }
  const cidrBits = parseInt(cidrBitsStr, 10);
  if (Number.isNaN(cidrBits) || cidrBits < 0 || cidrBits > 32) return false;
  const rangeLong = ipToLong(range);
  if (rangeLong == null) return false;

  const mask = cidrBits === 0 ? 0 : (~0 << (32 - cidrBits)) >>> 0;

  return (targetLong & mask) === (rangeLong & mask);
}

function verifySepayWebhookAuth(req, _res, next) {
  const expectedApiKey = process.env.SEPAY_WEBHOOK_API_KEY;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;

  let passed = true;
  let error = null;

  if (!expectedApiKey) {
    passed = false;
    error = 'Missing SEPAY_WEBHOOK_API_KEY configuration';
  } else if (!authHeader || authHeader !== `Apikey ${expectedApiKey}`) {
    passed = false;
    error = 'Invalid or missing webhook API key';
  }

  const whitelist = (process.env.SEPAY_ALLOWED_IPS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  if (passed && whitelist.length > 0) {
    const forwarded = (req.headers['x-forwarded-for'] || '').toString();
    const remote = req.socket?.remoteAddress || req.ip || '';
    const candidate = normalizeIp(forwarded.split(',')[0].trim() || remote);
    const allowed = whitelist.some(pattern => matchIp(candidate, pattern));
    if (!allowed) {
      passed = false;
      error = 'IP not allowed for webhook';
    }
  }

  req.webhookAuthPassed = passed;
  req.webhookAuthError = error;
  return next();
}

module.exports = {
  verifySepayWebhookAuth,
};
