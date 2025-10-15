const express = require('express');
const router = express.Router();

const {
  getRestaurantBookings,
  getBookingDetails,
  acceptBooking,
  rejectBooking,
  updateBooking,
  cancelBooking,
  completeBooking,
  markNoShow,
  getBookingStats,
  getCalendar
} = require('../controllers/booking');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { idValidation } = require('../validators/merchant');
const {
  bookingStatusValidation,
  acceptBookingValidation,
  rejectBookingValidation,
  updateBookingValidation,
  cancelBookingValidation,
  completeBookingValidation,
  noShowValidation,
  calendarValidation
} = require('../validators/bookingManagement');

// Apply authentication and merchant role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['merchant']));

// Booking statistics
router.get('/stats', getBookingStats);

// Calendar summary for a month
router.get('/calendar', calendarValidation, handleValidationErrors, getCalendar);

// Get all bookings for merchant's restaurant
router.get('/', bookingStatusValidation, handleValidationErrors, getRestaurantBookings);

// Get specific booking details
router.get('/:id', idValidation, handleValidationErrors, getBookingDetails);

// Accept/confirm booking
router.patch('/:id/accept', idValidation, acceptBookingValidation, handleValidationErrors, acceptBooking);

// Reject booking
router.patch('/:id/reject', idValidation, rejectBookingValidation, handleValidationErrors, rejectBooking);

// Update booking
router.put('/:id', idValidation, updateBookingValidation, handleValidationErrors, updateBooking);

// Cancel booking (merchant side)
router.patch('/:id/cancel', idValidation, cancelBookingValidation, handleValidationErrors, cancelBooking);

// Complete booking
router.patch('/:id/complete', idValidation, completeBookingValidation, handleValidationErrors, completeBooking);

// Mark booking as no-show
router.patch('/:id/no-show', idValidation, noShowValidation, handleValidationErrors, markNoShow);

module.exports = router;