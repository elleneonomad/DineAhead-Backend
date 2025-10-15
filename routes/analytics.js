const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateAnalyticsQuery } = require('../validators/analytics');

/**
 * @route   GET /api/analytics/reports
 * @desc    Get comprehensive analytics report for merchant's restaurant
 * @access  Private (Merchant only)
 * @query   startDate (optional): Start date (YYYY-MM-DD)
 * @query   endDate (optional): End date (YYYY-MM-DD)
 */
router.get(
  '/reports',
  authenticateToken,
  requireRole('merchant'),
  validateAnalyticsQuery,
  analyticsController.getAnalyticsReport
);

module.exports = router;
