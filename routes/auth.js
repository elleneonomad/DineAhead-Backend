const express = require('express');
const router = express.Router();

const { register, login, refreshToken, logout } = require('../controllers/auth');
const { registerValidation, loginValidation } = require('../validators/auth');
const { handleValidationErrors } = require('../middleware/validation');

// Register route
router.post('/register', registerValidation, handleValidationErrors, register);

// Login route
router.post('/login', loginValidation, handleValidationErrors, login);

// Refresh token route (uses Firebase Secure Token API)
router.post('/refresh-token', refreshToken);

// Logout route (optionally revokes tokens by uid)
router.post('/logout', logout);

module.exports = router;
