const bcrypt = require('bcrypt');
const crypto = require('crypto');
const axios = require('axios');

const { AppError } = require('../Utils/error.utils');
const { MESSAGES, TOKEN_TYPES, AUTH_PROVIDERS } = require('../Utils/constant');
const User = require('../Models/user.model');
const { generateToken } = require('../Utils/jwt.utils');
const validationUtils = require('../Utils/validation.utils');

const SOCIAL_PROVIDER_ID_FIELDS = {
  [AUTH_PROVIDERS.GOOGLE]: 'googleId',
  [AUTH_PROVIDERS.FACEBOOK]: 'facebookId',
  [AUTH_PROVIDERS.ZALO]: 'zaloId',
};

const SOCIAL_PLACEHOLDER_EMAIL_DOMAIN = 'biduclone.com';

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, 400);
    }

    const user = await User.create({
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      gender: userData.gender,
    });

    return {
      user: user.toPublicJSON(),
    };
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    // Find user by email
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    // Check if account is active
    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_INACTIVE, 403);
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, 401);
    }

    // Generate tokens
    const accessToken = generateToken(user, TOKEN_TYPES.ACCESS);
    const refreshToken = generateToken(user, TOKEN_TYPES.REFRESH);

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Login or register a buyer with a verified social provider token
   */
  async socialLogin(socialLoginData) {
    const profile = await this.verifySocialToken(
      socialLoginData.provider,
      socialLoginData.token,
      socialLoginData.codeVerifier
    );
    const user = await this.findOrCreateSocialUser(profile);

    const accessToken = generateToken(user, TOKEN_TYPES.ACCESS);
    const refreshToken = generateToken(user, TOKEN_TYPES.REFRESH);

    return {
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Verify a social provider token and normalize the returned user profile
   */
  async verifySocialToken(provider, token, codeVerifier) {
    if (provider === AUTH_PROVIDERS.GOOGLE) {
      return this.verifyGoogleToken(token);
    }

    if (provider === AUTH_PROVIDERS.FACEBOOK) {
      return this.verifyFacebookToken(token);
    }

    if (provider === AUTH_PROVIDERS.ZALO) {
      return this.verifyZaloToken(token, codeVerifier);
    }

    throw new AppError(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN, 401);
  }

  /**
   * Verify Google ID token with Google's tokeninfo endpoint
   */
  async verifyGoogleToken(token) {
    try {
      const allowedClientIds = this.getGoogleClientIds();
      const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: { id_token: token },
      });

      if (
        !data?.sub ||
        !data?.email ||
        (data.email_verified !== true && data.email_verified !== 'true') ||
        !allowedClientIds.includes(data.aud)
      ) {
        throw new AppError(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN, 401);
      }

      return this.normalizeSocialProfile({
        provider: AUTH_PROVIDERS.GOOGLE,
        providerId: data.sub,
        email: data.email,
        firstName: data.given_name,
        lastName: data.family_name,
        name: data.name,
        avatar: data.picture,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN, 401);
    }
  }

  /**
   * Get the allowlist of Google OAuth client IDs for all supported platforms
   */
  getGoogleClientIds() {
    const clientIds = (process.env.GOOGLE_CLIENT_IDS || '')
      .split(',')
      .map(clientId => clientId.trim())
      .filter(Boolean);

    if (clientIds.length === 0) {
      throw new AppError(MESSAGES.AUTH.GOOGLE_SOCIAL_LOGIN_NOT_CONFIGURED, 500);
    }

    return clientIds;
  }

  /**
   * Verify Facebook access token with Facebook Graph API
   */
  async verifyFacebookToken(token) {
    try {
      const { data } = await axios.get('https://graph.facebook.com/me', {
        params: {
          fields: 'id,email,first_name,last_name,name,picture.type(large)',
          access_token: token,
        },
      });

      if (!data?.id) {
        throw new AppError(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN, 401);
      }

      return this.normalizeSocialProfile({
        provider: AUTH_PROVIDERS.FACEBOOK,
        providerId: data.id,
        email: data.email,
        firstName: data.first_name,
        lastName: data.last_name,
        name: data.name,
        avatar: data.picture?.data?.url,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN, 401);
    }
  }

  /**
   * Verify Zalo authorization code and load the Zalo user profile
   */
  async verifyZaloToken(token, codeVerifier) {
    try {
      const { appId, appSecret } = this.getZaloConfig();
      const tokenParams = new URLSearchParams({
        app_id: appId,
        code: token,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      });

      const { data: tokenData } = await axios.post(
        'https://oauth.zaloapp.com/v4/access_token',
        tokenParams,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            secret_key: appSecret,
          },
        }
      );

      if (!tokenData?.access_token) {
        throw new AppError(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN, 401);
      }

      const { data } = await axios.get('https://graph.zalo.me/v2.0/me', {
        params: {
          fields: 'id,name,picture',
        },
        headers: {
          access_token: tokenData.access_token,
        },
      });

      if (!data?.id) {
        throw new AppError(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN, 401);
      }

      return this.normalizeSocialProfile({
        provider: AUTH_PROVIDERS.ZALO,
        providerId: data.id,
        name: data.name,
        avatar: data.picture?.data?.url || data.picture,
      });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(MESSAGES.AUTH.INVALID_SOCIAL_TOKEN, 401);
    }
  }

  /**
   * Get required Zalo OAuth app configuration
   */
  getZaloConfig() {
    const appId = process.env.ZALO_APP_ID?.trim();
    const appSecret = process.env.ZALO_APP_SECRET?.trim();

    if (!appId || !appSecret) {
      throw new AppError(MESSAGES.AUTH.ZALO_SOCIAL_LOGIN_NOT_CONFIGURED, 500);
    }

    return { appId, appSecret };
  }

  /**
   * Normalize social profile fields into the user model shape
   */
  normalizeSocialProfile(profile) {
    const { email, isPlaceholderEmail } = this.resolveSocialEmail(profile);
    const fallbackName = email.split('@')[0] || 'Social User';
    const nameParts = (profile.name || fallbackName).trim().split(/\s+/);
    const fallbackFirstName = nameParts.shift() || 'Social';
    const fallbackLastName = nameParts.join(' ') || 'User';

    return {
      provider: profile.provider,
      providerId: profile.providerId,
      email,
      firstName: profile.firstName || fallbackFirstName,
      lastName: profile.lastName || fallbackLastName,
      avatar: profile.avatar || null,
      isPlaceholderEmail,
    };
  }

  /**
   * Resolve social profile email or create an internal placeholder email
   */
  resolveSocialEmail(profile) {
    const email = profile.email?.trim();

    if (email) {
      return {
        email: email.toLowerCase(),
        isPlaceholderEmail: false,
      };
    }

    return {
      email: `${String(profile.providerId).toLowerCase()}@${SOCIAL_PLACEHOLDER_EMAIL_DOMAIN}`,
      isPlaceholderEmail: true,
    };
  }

  /**
   * Find an existing social user, link the provider if needed, or create a new account
   */
  async findOrCreateSocialUser(profile) {
    const providerIdField = SOCIAL_PROVIDER_ID_FIELDS[profile.provider];
    let user = await User.findOne({ [providerIdField]: profile.providerId });

    if (!user) {
      user = await User.findOne({ email: profile.email });
    }

    if (user && profile.isPlaceholderEmail && !user[providerIdField]) {
      throw new AppError(MESSAGES.AUTH.SOCIAL_ACCOUNT_CONFLICT, 409);
    }

    if (!user) {
      return User.create({
        email: profile.email,
        password: this.generateSocialPassword(),
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatar: profile.avatar,
        [providerIdField]: profile.providerId,
        authProvider: profile.provider,
        isEmailVerified: !profile.isPlaceholderEmail,
      });
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_INACTIVE, 403);
    }

    if (user[providerIdField] && user[providerIdField] !== profile.providerId) {
      throw new AppError(MESSAGES.AUTH.SOCIAL_ACCOUNT_CONFLICT, 409);
    }

    if (!user[providerIdField]) {
      user[providerIdField] = profile.providerId;
    }
    if (!user.avatar && profile.avatar) {
      user.avatar = profile.avatar;
    }
    if (!user.isEmailVerified && !profile.isPlaceholderEmail) {
      user.isEmailVerified = true;
    }

    return user.save();
  }

  /**
   * Generate an unusable local password for social-only accounts
   */
  generateSocialPassword() {
    return `${crypto.randomBytes(24).toString('hex')}Aa1`;
  }

  /**
   * Refresh access token
   */
  async refreshToken(user) {
    // Generate new tokens
    const newAccessToken = generateToken(user, TOKEN_TYPES.ACCESS);

    return {
      accessToken: newAccessToken,
    };
  }

  /**
   * Change password
   */
  async changePassword(userId, oldPassword, newPassword) {
    // Validate new password
    validationUtils.validatePassword(newPassword);

    if (oldPassword === newPassword) {
      throw new AppError(MESSAGES.AUTH.PASSWORD_DUPLICATE, 400);
    }

    const user = await User.findById(userId).select('+password');

    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, 404);
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError(MESSAGES.AUTH.INVALID_PASSWORD, 401);
    }

    user.password = newPassword;
    await user.save();

    return { message: MESSAGES.AUTH.PASSWORD_CHANGED };
  }
}

module.exports = new AuthService();
