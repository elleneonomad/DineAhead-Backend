const express = require('express');
const router = express.Router();

const {
  getRestaurants,
  getRestaurantDetails,
  getRestaurantMenu,
  getAvailableTables,
  getAvailableTimeSlots,
  createBooking,
  getUserBookings,
  getBookingDetails,
  cancelBooking
} = require('../controllers/user');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const { idValidation } = require('../validators/merchant');
const {
  createBookingValidation,
  availabilityValidation,
  timeSlotValidation,
  cancelBookingValidation,
  restaurantSearchValidation
} = require('../validators/booking');

// Public routes (no authentication required)
router.get('/restaurants', restaurantSearchValidation, handleValidationErrors, getRestaurants);
router.get('/restaurants/:id', idValidation, handleValidationErrors, getRestaurantDetails);
router.get('/restaurants/:id/menu', idValidation, handleValidationErrors, getRestaurantMenu);

// Authentication required for booking-related routes
router.use(authenticateToken);

// Availability routes (user only)
router.get('/availability/tables', requireRole(['user']), availabilityValidation, handleValidationErrors, getAvailableTables);
router.get('/availability/time-slots', requireRole(['user']), timeSlotValidation, handleValidationErrors, getAvailableTimeSlots);

// Booking routes
// Allow both user and merchant to create a booking
router.post('/bookings', requireRole(['user', 'merchant']), createBookingValidation, handleValidationErrors, createBooking);

// User-only booking views and actions
router.get('/bookings', requireRole(['user']), getUserBookings);
router.get('/bookings/:id', requireRole(['user']), idValidation, handleValidationErrors, getBookingDetails);
router.patch('/bookings/:id/cancel', requireRole(['user']), idValidation, cancelBookingValidation, handleValidationErrors, cancelBooking);

module.exports = router;