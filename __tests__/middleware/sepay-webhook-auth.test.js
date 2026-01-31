/* eslint-env jest */
const { describe, test, expect } = require('@jest/globals');

const { verifySepayWebhookAuth } = require('../../Middlewares/sepay-webhook-auth');

describe('Sepay webhook auth middleware', () => {
  const originalEnv = { ...process.env };

  test('marks failed when API key missing', () => {
    delete process.env.SEPAY_WEBHOOK_API_KEY;
    const req = { headers: {} };
    verifySepayWebhookAuth(req, {}, () => {});
    expect(req.webhookAuthPassed).toBe(false);
    expect(req.webhookAuthError).toBe('Missing SEPAY_WEBHOOK_API_KEY configuration');
    process.env = { ...originalEnv };
  });

  test('allows CIDR whitelist match with IPv6-mapped IP', () => {
    process.env.SEPAY_WEBHOOK_API_KEY = 'k';
    process.env.SEPAY_ALLOWED_IPS = '10.0.0.0/24';
    const req = {
      headers: {
        authorization: 'Apikey k',
        'x-forwarded-for': '::ffff:10.0.0.5',
      },
      socket: { remoteAddress: '::ffff:10.0.0.5' },
    };
    verifySepayWebhookAuth(req, {}, () => {});
    expect(req.webhookAuthPassed).toBe(true);
    expect(req.webhookAuthError).toBeNull();
    process.env = { ...originalEnv };
  });

  test('rejects when CIDR bits invalid', () => {
    process.env.SEPAY_WEBHOOK_API_KEY = 'k';
    process.env.SEPAY_ALLOWED_IPS = '10.0.0.0/33';
    const req = {
      headers: {
        authorization: 'Apikey k',
        'x-forwarded-for': '10.0.0.5',
      },
      socket: { remoteAddress: '10.0.0.5' },
    };
    verifySepayWebhookAuth(req, {}, () => {});
    expect(req.webhookAuthPassed).toBe(false);
    expect(req.webhookAuthError).toBe('IP not allowed for webhook');
    process.env = { ...originalEnv };
  });
});
