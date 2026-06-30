const nodemailer = require('nodemailer');

const PASSWORD_RESET_EXPIRY_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const PASSWORD_RESET_EXPIRY_TIME_ZONE_LABEL = 'GMT+7';
const passwordResetExpiryFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: PASSWORD_RESET_EXPIRY_TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function parseBoolean(value) {
  return ['true', '1', 'yes'].includes(String(value).trim().toLowerCase());
}

function parsePort(value) {
  const port = Number.parseInt(value, 10);
  return Number.isInteger(port) && port > 0 ? port : null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatExpiry(expiresAt) {
  const date = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return 'soon';
  }

  const parts = passwordResetExpiryFormatter.formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});

  return `${parts.month} ${parts.day}, ${parts.year} at ${parts.hour}:${parts.minute} ${parts.dayPeriod} ${PASSWORD_RESET_EXPIRY_TIME_ZONE_LABEL}`;
}

class EmailService {
  getSmtpConfig() {
    const host = process.env.SMTP_HOST?.trim();
    const port = parsePort(process.env.SMTP_PORT);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    const from = (process.env.EMAIL_FROM || process.env.SMTP_FROM)?.trim();

    return {
      host,
      port,
      secure: parseBoolean(process.env.SMTP_SECURE),
      auth: user || pass ? { user, pass } : undefined,
      from,
    };
  }

  isConfigured() {
    const { host, port, from } = this.getSmtpConfig();
    return Boolean(host && port && from);
  }

  createTransport() {
    const { host, port, secure, auth } = this.getSmtpConfig();
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth,
    });
  }

  async sendPasswordResetOtp({ to, otp, expiresAt }) {
    if (!this.isConfigured()) {
      return false;
    }

    const { from } = this.getSmtpConfig();
    const expiresAtText = formatExpiry(expiresAt);

    const transporter = this.createTransport();

    await transporter.sendMail({
      from,
      to,
      subject: 'Reset your Bidu password',
      text: [
        'We received a request to reset your Bidu password.',
        `Your password reset OTP is: ${otp}`,
        `This request expires at ${expiresAtText}.`,
        'If you did not request this, you can ignore this email.',
      ].join('\n\n'),
      html: [
        '<p>We received a request to reset your Bidu password.</p>',
        `<p>Your password reset OTP is: <strong>${escapeHtml(otp)}</strong></p>`,
        `<p>This request expires at ${escapeHtml(expiresAtText)}.</p>`,
        '<p>If you did not request this, you can ignore this email.</p>',
      ].join(''),
    });

    return true;
  }
}

module.exports = new EmailService();
