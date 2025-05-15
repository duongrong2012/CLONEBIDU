const express = require('express');
const router = express.Router();
const authController = require('../Controllers/auth.controller');
const { validateUserFields } = require('../Middlewares');

/**
 * @swagger
 * /api/auth-buyer/register:
 *   post:
 *     summary: Register a new user account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *             examples:
 *               missingFields:
 *                 value:
 *                   status: 'error'
 *                   message: 'Validation error'
 *                   errors: [
 *                     { field: 'firstName', message: 'First name is required' },
 *                     { field: 'lastName', message: 'Last name is required' },
 *                     { field: 'gender', message: 'Gender is required' }
 *                   ]
 *               invalidFormat:
 *                 value:
 *                   status: 'error'
 *                   message: 'Validation error'
 *                   errors: [
 *                     { field: 'email', message: 'Invalid email format' },
 *                     { field: 'password', message: 'Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character' }
 *                   ]
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               status: 'error'
 *               message: 'Email already exists'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', validateUserFields, authController.register);

module.exports = router;
