const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscription');
const { authenticateToken, requireRole } = require('../middleware/auth');

/**
 * @route   GET /api/subscription/status
 * @desc    Get current subscription status for merchant
 * @access  Private (Merchant only)
 */
router.get(
  '/status',
  authenticateToken,
  requireRole('merchant'),
  subscriptionController.getSubscriptionStatus
);

/**
 * @route   POST /api/subscription/create-checkout
 * @desc    Create Stripe checkout session for Pro upgrade
 * @access  Private (Merchant only)
 */
router.post(
  '/create-checkout',
  authenticateToken,
  requireRole('merchant'),
  subscriptionController.createCheckoutSession
);

/**
 * @route   POST /api/subscription/cancel
 * @desc    Cancel active subscription
 * @access  Private (Merchant only)
 */
router.post(
  '/cancel',
  authenticateToken,
  requireRole('merchant'),
  subscriptionController.cancelSubscription
);

/**
 * @route   POST /api/subscription/reactivate
 * @desc    Reactivate a cancelled subscription before period end
 * @access  Private (Merchant only)
 */
router.post(
  '/reactivate',
  authenticateToken,
  requireRole('merchant'),
  subscriptionController.reactivateSubscription
);

module.exports = router;
