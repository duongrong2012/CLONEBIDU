const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../Models/user.model');
const { USER_ROLES, MESSAGES } = require('../Utils/constant');
const { AppError } = require('../Utils/error.utils');

// Load environment variables
dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
    if (existingSuperAdmin) {
      throw new AppError(MESSAGES.SEEDER.SUPER_ADMIN_EXISTS, 400);
    }

    // Create super admin
    const superAdmin = new User({
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
      firstName: 'Super',
      lastName: 'Admin',
      role: USER_ROLES.SUPER_ADMIN,
      isActive: true,
      isEmailVerified: true,
    });

    await superAdmin.save();
    process.exit(0);
  } catch (error) {
    if (error instanceof AppError) {
      process.exit(1);
    }
    throw new AppError(MESSAGES.SEEDER.SUPER_ADMIN_CREATION_ERROR, 500);
  }
};

createSuperAdmin();
