const express = require('express');
const router = express.Router();
const authAdminController = require('../Controllers/auth-admin.controller');
const { validateUserFields } = require('../Middlewares/validation.middleware');
const { verifyToken } = require('../Middlewares/auth.middleware');
const { USER_ROLES } = require('../Utils/constant');

// Only super admin can register new admin
router.post(
  '/register',
  verifyToken(USER_ROLES.SUPER_ADMIN),
  validateUserFields,
  authAdminController.register
);

module.exports = router;
