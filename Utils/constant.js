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
  BEARER: 'Bearer',
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
    INVALID_GENDER: 'Invalid gender value. Allowed values are: MALE, FEMALE, OTHER',
    FIRST_NAME_LENGTH: 'First name must be between 2 and 50 characters',
    LAST_NAME_LENGTH: 'Last name must be between 2 and 50 characters',
    FIRST_NAME_PATTERN: 'First name can only contain letters and spaces',
    LAST_NAME_PATTERN: 'Last name can only contain letters and spaces',
    INVALID_BIRTHDAY_FORMAT: 'Birthday must be a valid date in ISO format (YYYY-MM-DD)',
    BIRTHDAY_FUTURE: 'Birthday cannot be in the future',
    BIRTHDAY_AGE: 'User must be at least 13 years old',
    NO_FIELDS_TO_UPDATE: 'No fields provided for update',
  },
  PRODUCT: {
    NOT_FOUND: 'Product not found',
    RATED_SUCCESS: 'Product rated successfully',
    RATING_UPDATED: 'Product rating updated successfully',
    INACTIVE_PRODUCT: 'Cannot rate inactive product',
  },
  BOOKMARK: {
    ADDED_SUCCESS: 'Product added to bookmarks successfully',
    ALREADY_BOOKMARKED: 'Product is already bookmarked',
    OWN_PRODUCT: 'Cannot bookmark your own product',
    PRODUCT_NOT_FOUND: 'Product not found',
    PRODUCT_INACTIVE: 'Cannot bookmark inactive product',
    PRODUCT_UNAPPROVED: 'Cannot bookmark unapproved product',
  },
  SEEDER: {
    SUPER_ADMIN_EXISTS: 'Super admin already exists',
    SUPER_ADMIN_CREATED: 'Super admin created successfully',
    DB_CONNECTED: 'Connected to MongoDB',
    DB_CONNECTION_ERROR: 'Error connecting to MongoDB',
    SUPER_ADMIN_CREATION_ERROR: 'Error creating super admin',
  },
};

const REGEX_PATTERNS = {
  // Email must be a valid email address
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  // Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, and one number
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
  // Name can only contain letters and spaces
  NAME: /^[a-zA-Z\s]*$/,
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
  CANCELLED: 'CANCELLED',
};

const PRODUCT_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const ERROR_CODES = {
  TOKEN_EXPIRED: 40101,
};

/**
 * HTTP Status Codes
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Rating constants
 */
const RATING = {
  MIN: 1,
  MAX: 5,
  COMMENT_MAX_LENGTH: 500,
};

/**
 * Enum for image owner types
 */
const IMAGE_OWNER_TYPE = {
  USER: 'USER',
  PRODUCT: 'PRODUCT',
  CATEGORY: 'CATEGORY',
  // Add more types as needed
};

/**
 * Enum for media types
 */
const MEDIA_TYPE = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  // Add more types as needed
};

/**
 * Enum for supported file types
 */
const SUPPORTED_FILE_TYPES = {
  IMAGE: {
    MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  },
  VIDEO: {
    MIME_TYPES: ['video/mp4', 'video/quicktime', 'video/webm'],
    EXTENSIONS: ['.mp4', '.mov', '.webm'],
  },
};

const CATEGORY_LEVEL = {
  ROOT: 0,
  CHILD: 1,
  GRANDCHILD: 2,
};

module.exports = {
  ERROR_CODES,
  HTTP_STATUS,
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
  PRODUCT_STATUS,
  RATING,
  IMAGE_OWNER_TYPE,
  MEDIA_TYPE,
  SUPPORTED_FILE_TYPES,
  CATEGORY_LEVEL,
};
