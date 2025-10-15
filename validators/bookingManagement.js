const { body, query } = require('express-validator');

const bookingStatusValidation = [
  query('status')
    .optional({ checkFalsy: true, nullable: true })
    .isIn(['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no-show'])
    .withMessage('Status must be one of: pending, confirmed, rejected, cancelled, completed, no-show'),
  
  query('date')
    .optional({ checkFalsy: true, nullable: true })
    .isISO8601()
    .withMessage('Date must be in YYYY-MM-DD format'),
  
  query('upcoming')
    .optional({ checkFalsy: true, nullable: true })
    .isBoolean()
    .withMessage('Upcoming must be a boolean value')
];

const acceptBookingValidation = [
  body('merchantNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Merchant notes cannot exceed 500 characters')
];

const rejectBookingValidation = [
  body('reason')
    .notEmpty()
    .isLength({ min: 5, max: 200 })
    .withMessage('Rejection reason must be between 5 and 200 characters'),
  
  body('merchantNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Merchant notes cannot exceed 500 characters')
];

const updateBookingValidation = [
  body('date')
    .optional()
    .isDate()
    .withMessage('Date must be in YYYY-MM-DD format')
    .custom((value) => {
      if (value) {
        const bookingDate = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (bookingDate < today) {
          throw new Error('Booking date cannot be in the past');
        }
      }
      return true;
    }),
  
  body('time')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  
  body('duration')
    .optional()
    .isInt({ min: 60, max: 300 })
    .withMessage('Duration must be between 60 and 300 minutes'),
  
  body('partySize')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Party size must be between 1 and 20'),
  
  body('merchantNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Merchant notes cannot exceed 500 characters'),
  
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'refunded'])
    .withMessage('Payment status must be pending, paid, or refunded')
];

const cancelBookingValidation = [
  body('reason')
    .notEmpty()
    .isLength({ min: 5, max: 200 })
    .withMessage('Cancellation reason must be between 5 and 200 characters')
];

const completeBookingValidation = [
  body('merchantNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Merchant notes cannot exceed 500 characters'),
  
  body('paymentStatus')
    .optional()
    .isIn(['pending', 'paid', 'refunded'])
    .withMessage('Payment status must be pending, paid, or refunded')
];

const noShowValidation = [
  body('merchantNotes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Merchant notes cannot exceed 500 characters')
];

const calendarValidation = [
  query('month')
    .exists()
    .withMessage('month is required (YYYY-MM)')
    .matches(/^\d{4}-\d{2}$/)
    .withMessage('month must be in YYYY-MM format'),
  query('status')
    .optional({ checkFalsy: true, nullable: true })
    .isIn(['pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no-show'])
    .withMessage('Status must be one of: pending, confirmed, rejected, cancelled, completed, no-show')
];

module.exports = {
  bookingStatusValidation,
  acceptBookingValidation,
  rejectBookingValidation,
  updateBookingValidation,
  cancelBookingValidation,
  completeBookingValidation,
  noShowValidation,
  calendarValidation
};
