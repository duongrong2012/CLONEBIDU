const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../Models/user.model');
const { USER_ROLES } = require('../Utils/constant');

// Load environment variables
dotenv.config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await User.findOne({ role: USER_ROLES.SUPER_ADMIN });
    if (existingSuperAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    // Create super admin
    const superAdmin = new User({
      email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@bidu.com',
      password: process.env.SUPER_ADMIN_PASSWORD || 'Superadmin123@',
      firstName: 'Super',
      lastName: 'Admin',
      role: USER_ROLES.SUPER_ADMIN,
      isActive: true,
      isEmailVerified: true,
    });

    await superAdmin.save();
    console.log('Super admin created successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();
