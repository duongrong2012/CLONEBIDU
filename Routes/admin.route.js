const express = require('express');
const router = express.Router();
const { verifyToken } = require('../Middlewares/auth.middleware');
const { validateGetUsers } = require('../Middlewares/validation.middleware');
const { getUsers } = require('../Controllers/user.controller');
const { USER_ROLES } = require('../Utils/constant');

router.get('/users', verifyToken(USER_ROLES.SUPER_ADMIN), validateGetUsers(), getUsers);

module.exports = router;
