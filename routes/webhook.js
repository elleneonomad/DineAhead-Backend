const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook');

/**
 * @route   POST /api/webhook/stripe
 * @desc    Handle Stripe webhook events
 * @access  Public (But verified by Stripe signature)
 * 
 * IMPORTANT: This route MUST be registered with express.raw() middleware
 * in server.js BEFORE the express.json() middleware to preserve raw body
 * for signature verification.
 */
router.post('/stripe', webhookController.handleStripeWebhook);

module.exports = router;
