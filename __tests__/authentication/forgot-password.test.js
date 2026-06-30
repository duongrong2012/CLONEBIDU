/* eslint-env jest */
/* global jest */
const { describe, test, expect, beforeAll, beforeEach, afterAll } = require('@jest/globals');

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const request = require('supertest');

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
}));

jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport,
}));

jest.mock('../../Utils/jwt.utils', () => ({
  verifyToken: jest.fn(),
  extractTokenFromBearer: jest.fn(),
  generateToken: jest.fn(),
}));

const { createTestApp, setupInMemoryMongo } = require('../index');
const { seedUser } = require('../helpers/auth');
const User = require('../../Models/user.model');
const { MESSAGES } = require('../../Utils/constant');

setupInMemoryMongo();

const ENV_KEYS = [
  'NODE_ENV',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'SMTP_FROM',
  'PASSWORD_RESET_EXPIRES_MINUTES',
];

function hashPasswordResetOtp(otp) {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

describe('Forgot Password API - Buyer', () => {
  let app;
  const originalEnv = ENV_KEYS.reduce((env, key) => {
    env[key] = process.env[key];
    return env;
  }, {});

  const restoreEnv = (key, value) => {
    if (value === undefined) {
      delete process.env[key];
      return;
    }
    process.env[key] = value;
  };

  const resetPasswordResetEnv = () => {
    ENV_KEYS.forEach(key => restoreEnv(key, originalEnv[key]));
    process.env.NODE_ENV = 'test';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.EMAIL_FROM;
    delete process.env.SMTP_FROM;
    delete process.env.PASSWORD_RESET_EXPIRES_MINUTES;
  };

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(() => {
    resetPasswordResetEnv();
    mockCreateTransport.mockClear();
    mockSendMail.mockReset();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
  });

  afterAll(() => {
    ENV_KEYS.forEach(key => restoreEnv(key, originalEnv[key]));
  });

  test('400 when email is invalid', async () => {
    const res = await request(app).post('/auth-buyer/forgot-password').send({
      email: 'invalid-email',
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toContainEqual({
      field: 'email',
      message: MESSAGES.VALIDATION.INVALID_EMAIL,
    });
  });

  test('200 returns a generic response when email does not exist', async () => {
    const res = await request(app).post('/auth-buyer/forgot-password').send({
      email: 'missing@example.com',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe(MESSAGES.AUTH.PASSWORD_RESET_REQUESTED);
    expect(res.body.payload).toMatchObject({
      otp: null,
      otpExpires: null,
      emailSent: false,
    });
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  test('200 creates a reset OTP without SMTP in non-production', async () => {
    const user = await seedUser({ email: 'reset@example.com', password: 'OldPass123' });

    const res = await request(app).post('/auth-buyer/forgot-password').send({
      email: 'reset@example.com',
    });

    expect(res.status).toBe(200);
    expect(res.body.payload.otp).toMatch(/^\d{6}$/);
    expect(res.body.payload.otpExpires).toEqual(expect.any(String));
    expect(res.body.payload.emailSent).toBe(false);

    const updatedUser = await User.findById(user._id).select(
      '+passwordResetOtp +passwordResetExpires'
    );
    expect(updatedUser.passwordResetOtp).toEqual(expect.any(String));
    expect(updatedUser.passwordResetOtp).not.toBe(res.body.payload.otp);
    expect(updatedUser.passwordResetExpires).toBeInstanceOf(Date);
    expect(mockCreateTransport).not.toHaveBeenCalled();
  });

  test('429 when requesting another reset OTP for the same email within 30 seconds', async () => {
    const user = await seedUser({ email: 'limited-reset@example.com', password: 'OldPass123' });

    const firstRes = await request(app).post('/auth-buyer/forgot-password').send({
      email: 'limited-reset@example.com',
    });
    const firstUpdatedUser = await User.findById(user._id).select(
      '+passwordResetOtp +passwordResetExpires'
    );

    const secondRes = await request(app).post('/auth-buyer/forgot-password').send({
      email: 'limited-reset@example.com',
    });
    const secondUpdatedUser = await User.findById(user._id).select(
      '+passwordResetOtp +passwordResetExpires'
    );

    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(429);
    expect(secondRes.headers['retry-after']).toEqual(expect.any(String));
    expect(secondRes.body.status).toBe('error');
    expect(secondRes.body.message).toBe(MESSAGES.AUTH.PASSWORD_RESET_RATE_LIMITED);
    expect(secondRes.body.errors).toContainEqual({
      field: 'email',
      message: MESSAGES.AUTH.PASSWORD_RESET_RATE_LIMITED,
    });
    expect(secondUpdatedUser.passwordResetOtp).toBe(firstUpdatedUser.passwordResetOtp);
    expect(secondUpdatedUser.passwordResetExpires.getTime()).toBe(
      firstUpdatedUser.passwordResetExpires.getTime()
    );
  });

  test('200 sends reset email when SMTP is configured', async () => {
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.EMAIL_FROM = 'Bidu Support <no-reply@example.com>';
    await seedUser({ email: 'send-reset@example.com', password: 'OldPass123' });

    const res = await request(app).post('/auth-buyer/forgot-password').send({
      email: 'send-reset@example.com',
    });

    expect(res.status).toBe(200);
    expect(res.body.payload.otp).toMatch(/^\d{6}$/);
    expect(res.body.payload.emailSent).toBe(true);
    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: undefined,
    });
    const sentMail = mockSendMail.mock.calls[0][0];

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Bidu Support <no-reply@example.com>',
        to: 'send-reset@example.com',
        subject: 'Reset your Bidu password',
        text: expect.stringContaining(`Your password reset OTP is: ${res.body.payload.otp}`),
      })
    );
    expect(sentMail.text).toMatch(
      /This request expires at [A-Za-z]+ \d{1,2}, \d{4} at \d{1,2}:\d{2} (AM|PM) GMT\+7\./
    );
    expect(sentMail.text).not.toContain(new Date(res.body.payload.otpExpires).toISOString());
  });

  test('500 in production when SMTP is not configured', async () => {
    process.env.NODE_ENV = 'production';
    await seedUser({ email: 'prod-reset@example.com', password: 'OldPass123' });

    const res = await request(app).post('/auth-buyer/forgot-password').send({
      email: 'prod-reset@example.com',
    });

    expect(res.status).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe(MESSAGES.AUTH.PASSWORD_RESET_EMAIL_NOT_CONFIGURED);
    expect(mockCreateTransport).not.toHaveBeenCalled();

    const updatedUser = await User.findOne({ email: 'prod-reset@example.com' }).select(
      '+passwordResetOtp +passwordResetExpires'
    );
    expect(updatedUser.passwordResetOtp).toBeUndefined();
    expect(updatedUser.passwordResetExpires).toBeUndefined();
  });

  test('200 resets password with a valid OTP', async () => {
    const user = await seedUser({ email: 'valid-reset@example.com', password: 'OldPass123' });
    const forgotRes = await request(app).post('/auth-buyer/forgot-password').send({
      email: 'valid-reset@example.com',
    });

    const res = await request(app).post('/auth-buyer/reset-password').send({
      email: 'valid-reset@example.com',
      otp: forgotRes.body.payload.otp,
      newPassword: 'NewPass123',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe(MESSAGES.AUTH.PASSWORD_RESET_SUCCESS);

    const updatedUser = await User.findById(user._id).select(
      '+password +passwordResetOtp +passwordResetExpires'
    );
    expect(await bcrypt.compare('NewPass123', updatedUser.password)).toBe(true);
    expect(await bcrypt.compare('OldPass123', updatedUser.password)).toBe(false);
    expect(updatedUser.passwordResetOtp).toBeUndefined();
    expect(updatedUser.passwordResetExpires).toBeUndefined();
  });

  test('400 when reset OTP is invalid', async () => {
    const res = await request(app).post('/auth-buyer/reset-password').send({
      email: 'invalid-reset@example.com',
      otp: '123456',
      newPassword: 'NewPass123',
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe(MESSAGES.AUTH.PASSWORD_RESET_INVALID_OR_EXPIRED);
  });

  test('400 when reset OTP format is invalid', async () => {
    const res = await request(app).post('/auth-buyer/reset-password').send({
      email: 'invalid-reset@example.com',
      otp: '12345',
      newPassword: 'NewPass123',
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.message).toBe('Validation failed');
    expect(res.body.errors).toContainEqual({
      field: 'otp',
      message: MESSAGES.VALIDATION.RESET_OTP_FORMAT,
    });
  });

  test('400 when reset OTP is expired', async () => {
    const otp = '654321';
    await seedUser({
      email: 'expired-reset@example.com',
      password: 'OldPass123',
      passwordResetOtp: hashPasswordResetOtp(otp),
      passwordResetExpires: new Date(Date.now() - 60 * 1000),
    });

    const res = await request(app).post('/auth-buyer/reset-password').send({
      email: 'expired-reset@example.com',
      otp,
      newPassword: 'NewPass123',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.AUTH.PASSWORD_RESET_INVALID_OR_EXPIRED);
  });

  test('400 when new password matches the current password', async () => {
    await seedUser({ email: 'duplicate-reset@example.com', password: 'OldPass123' });
    const forgotRes = await request(app).post('/auth-buyer/forgot-password').send({
      email: 'duplicate-reset@example.com',
    });

    const res = await request(app).post('/auth-buyer/reset-password').send({
      email: 'duplicate-reset@example.com',
      otp: forgotRes.body.payload.otp,
      newPassword: 'OldPass123',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(MESSAGES.AUTH.PASSWORD_DUPLICATE);
  });
});
