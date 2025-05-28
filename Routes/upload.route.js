const express = require('express');
const uploadController = require('../Controllers/upload.controller');
const { validateFileUpload, handleValidationErrors } = require('../Middlewares/upload.middleware');
const { verifyToken } = require('../Middlewares/auth.middleware');
const { configureMulter } = require('../Utils/upload.utils');

const router = express.Router();

/**
 * @route POST /api/upload
 * @desc Upload multiple files to BizflyCloud Simple Storage
 * @access Private
 */
router.post(
  '/',
  verifyToken(),
  configureMulter().array('files', 5),
  validateFileUpload(),
  handleValidationErrors,
  uploadController.uploadFile
);

/**
 * @route PATCH /api/upload/avatar
 * @desc Update user avatar using uploaded media
 * @access Private
 */
router.patch('/avatar', verifyToken(), uploadController.updateUserAvatar);

module.exports = router;
