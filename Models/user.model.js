const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { USER_ROLES, AUTH_PROVIDERS, GENDERS } = require('../Utils/constant');
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * Shop information schema
 * Contains all necessary fields for seller shop information
 */
const shopSchema = new mongoose.Schema({
  birthday: String,
  identityNumber: String,
  bankName: String,
  bankBranch: String,
  taxCode: String,
  national: String,
  shop: String,
  shopName: String,
  isCompanyRegistered: Boolean,
  address: String,
  province: String,
  district: String,
  ward: String,
  currentDigitalPlatforms: [String],
});

/**
 * User schema
 * Contains all user information and authentication details
 */
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: Object.values(GENDERS),
      default: GENDERS.OTHER,
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.BUYER,
    },
    avatar: {
      type: String,
      default: null,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: Object.values(AUTH_PROVIDERS),
      default: AUTH_PROVIDERS.LOCAL,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    birthday: {
      type: Date,
    },
    adminInfor: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    shop: {
      type: shopSchema,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.plugin(mongoosePaginate);

/**
 * Pre-save middleware to hash password
 * Only hashes the password if it has been modified
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Method to compare password with hashed password
 * @param {string} candidatePassword - Password to compare
 * @returns {Promise<boolean>} True if password matches
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Method to get public user information
 * Removes sensitive data like password and version
 * @returns {Object} User object without sensitive data
 */
userSchema.methods.toPublicJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
