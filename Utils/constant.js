const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
};

const TOKEN_COOKIE_CONFIG = {
  accessToken: {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  },
  refreshToken: {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
};

const JWT_CONFIG = {
  ACCESS_TOKEN: {
    SECRET: process.env.JWT_SECRET,
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  },
  REFRESH_TOKEN: {
    SECRET: process.env.JWT_REFRESH_SECRET,
    EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
};

const GENDERS = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
};

const USER_ROLES = {
  BUYER: 'BUYER',
  SELLER: 'SELLER',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
};

const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
};

const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
};

const MESSAGES = {
  AUTH: {
    REGISTER_SUCCESS: 'User registered successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logged out successfully',
    PASSWORD_CHANGED: 'Password changed successfully',
    INVALID_CREDENTIALS: 'Invalid email or password',
    ACCOUNT_DEACTIVATED: 'Your account has been deactivated',
    EMAIL_EXISTS: 'Email already exists',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Forbidden access',
    TOKEN_EXPIRED: 'Token has expired',
    INVALID_TOKEN: 'Invalid token',
    TOKEN_REQUIRED: 'Access token is required',
    REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
  },
  USER: {
    NOT_FOUND: 'User not found',
    PROFILE_RETRIEVED: 'Profile retrieved successfully',
    PROFILE_UPDATED: 'Profile updated successfully',
    INVALID_ROLE: 'Invalid user role',
  },
  VALIDATION: {
    REQUIRED_EMAIL: 'Email is required',
    INVALID_EMAIL: 'Invalid email format',
    REQUIRED_PASSWORD: 'Password is required',
    PASSWORD_LENGTH:
      'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number',
    REQUIRED_FIRST_NAME: 'First name is required',
    REQUIRED_LAST_NAME: 'Last name is required',
    REQUIRED_GENDER: 'Gender is required',
  },
};

const REGEX_PATTERNS = {
  // Email must be a valid email address
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/,
};

const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 10,
  SORT_BY: 'createdAt',
  SORT_ORDER: 'desc',
};

const SELLER_REQUEST_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

module.exports = {
  COOKIE_OPTIONS,
  TOKEN_COOKIE_CONFIG,
  JWT_CONFIG,
  USER_ROLES,
  AUTH_PROVIDERS,
  GENDERS,
  TOKEN_TYPES,
  MESSAGES,
  REGEX_PATTERNS,
  DEFAULT_PAGINATION,
  SELLER_REQUEST_STATUS,
};
