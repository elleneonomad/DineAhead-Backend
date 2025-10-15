const { body, param, query } = require('express-validator');

const createBookingValidation = [
  body('restaurantId')
    .notEmpty()
    .withMessage('Restaurant ID is required'),
  
  body('tableId')
    .notEmpty()
    .withMessage('Table ID is required'),
  
  body('userId')
    .optional()
    .isString()
    .withMessage('userId must be a string if provided'),
  
  body('date')
    .isDate()
    .withMessage('Please provide a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const bookingDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        throw new Error('Booking date cannot be in the past');
      }
      
      // Check if booking is within 30 days
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      
      if (bookingDate > maxDate) {
        throw new Error('Booking date cannot be more than 30 days in advance');
      }
      
      return true;
    }),
  
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time must be in HH:MM format'),
  
  body('duration')
    .optional()
    .isInt({ min: 60, max: 300 })
    .withMessage('Duration must be between 60 and 300 minutes'),
  
  body('partySize')
    .isInt({ min: 1, max: 20 })
    .withMessage('Party size must be between 1 and 20'),
  
  body('customerInfo.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2 and 100 characters'),
  
  body('customerInfo.phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('customerInfo.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('specialRequests')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Special requests cannot exceed 500 characters'),
  
  body('preOrder')
    .optional()
    .isArray()
    .withMessage('Pre-order must be an array'),
  
  body('preOrder.*.menuItemId')
    .if(body('preOrder').exists())
    .notEmpty()
    .withMessage('Menu item ID is required for pre-order items'),
  
  body('preOrder.*.quantity')
    .if(body('preOrder').exists())
    .isInt({ min: 1, max: 10 })
    .withMessage('Quantity must be between 1 and 10 for each pre-order item')
];

const availabilityValidation = [
  query('restaurantId')
    .notEmpty()
    .withMessage('Restaurant ID is required'),
  
  query('date')
    .isDate()
    .withMessage('Please provide a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const bookingDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        throw new Error('Date cannot be in the past');
      }
      
      return true;
    }),
  
  query('partySize')
    .isInt({ min: 1, max: 20 })
    .withMessage('Party size must be between 1 and 20'),
  
  query('duration')
    .optional()
    .isInt({ min: 60, max: 300 })
    .withMessage('Duration must be between 60 and 300 minutes')
];

const timeSlotValidation = [
  query('tableId')
    .notEmpty()
    .withMessage('Table ID is required'),
  
  query('date')
    .isDate()
    .withMessage('Please provide a valid date (YYYY-MM-DD)'),
  
  query('duration')
    .optional()
    .isInt({ min: 60, max: 300 })
    .withMessage('Duration must be between 60 and 300 minutes')
];

const cancelBookingValidation = [
  body('reason')
    .optional()
    .isLength({ min: 5, max: 200 })
    .withMessage('Cancellation reason must be between 5 and 200 characters')
];

const restaurantSearchValidation = [
  query('cuisine')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Cuisine must be at least 2 characters'),
  
  query('priceRange')
    .optional()
    .isIn(['budget', 'mid-range', 'fine-dining'])
    .withMessage('Price range must be budget, mid-range, or fine-dining'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search term must be between 2 and 100 characters')
];

module.exports = {
  createBookingValidation,
  availabilityValidation,
  timeSlotValidation,
  cancelBookingValidation,
  restaurantSearchValidation
};