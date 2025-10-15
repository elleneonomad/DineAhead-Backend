const { body, param } = require('express-validator');

const restaurantValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Restaurant name must be between 2 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  
  body('address')
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Address must be between 10 and 200 characters'),
  
  body('phone')
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('cuisine')
    .isArray()
    .withMessage('Cuisine must be an array')
    .custom((value) => {
      if (value.length === 0) {
        throw new Error('At least one cuisine type is required');
      }
      return true;
    }),
  
  body('priceRange')
    .isIn(['budget', 'mid-range', 'fine-dining'])
    .withMessage('Price range must be budget, mid-range, or fine-dining'),

  // New restaurant fields
  body('restaurantType')
    .optional()
    .isIn(['Café', 'Fine Dining', 'Fast Food', 'Buffet'])
    .withMessage('restaurantType must be one of: Café, Fine Dining, Fast Food, Buffet'),

  body('coverImage')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('coverImage must be a valid URL'),

  body('socialMedia.facebookUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('facebookUrl must be a valid URL'),
  body('socialMedia.instagramUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('instagramUrl must be a valid URL'),
  body('socialMedia.websiteUrl')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('websiteUrl must be a valid URL'),

  body('location.provinceCode')
    .optional()
    .isString(),
  body('location.districtCode')
    .optional()
    .isString(),
  body('location.latitude')
    .optional({ nullable: true })
    .isFloat({ min: -90, max: 90 })
    .withMessage('latitude must be between -90 and 90'),
  body('location.longitude')
    .optional({ nullable: true })
    .isFloat({ min: -180, max: 180 })
    .withMessage('longitude must be between -180 and 180'),
  body('location.googleMapsLink')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('googleMapsLink must be a valid URL'),

  // Extended policies
  body('policies.petFriendly')
    .optional().isBoolean(),
  body('policies.smokingArea')
    .optional().isBoolean(),
  body('policies.outdoorSeating')
    .optional().isBoolean(),

  // Parking
  body('parking.available').optional().isBoolean(),
  body('parking.feeApplies').optional().isBoolean(),
  body('parking.type')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['Street', 'Private Lot', 'Valet'])
    .withMessage('parking.type must be: Street, Private Lot, Valet'),

  // Payment
  body('payment.cash').optional().isBoolean(),
  body('payment.creditCard').optional().isBoolean(),
  body('payment.mobilePayment').optional().isBoolean(),

  // Deposit
  body('deposit.required').optional().isBoolean(),
  body('deposit.percent')
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 100 })
    .withMessage('deposit.percent must be between 0 and 100'),

  // Cancellation
  body('cancellation.allowFreeCancel').optional().isBoolean(),
  body('cancellation.cancelBeforeHours')
    .optional({ nullable: true })
    .isInt({ min: 0, max: 168 })
    .withMessage('cancelBeforeHours must be between 0 and 168 hours'),

  // Rewards
  body('rewards.onShowUp').optional().isBoolean(),
  body('rewards.description').optional().isString(),

  // Notifications
  body('notifications.bookingAlerts').optional().isBoolean(),
  body('notifications.cancellationAlerts').optional().isBoolean(),
  
  body('policies.advanceBookingDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Advance booking days must be between 1 and 365'),
  
  body('policies.minBookingHours')
    .optional()
    .isInt({ min: 1, max: 48 })
    .withMessage('Minimum booking hours must be between 1 and 48'),
  
  body('policies.maxPartySize')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Maximum party size must be between 1 and 50')
];

const tableValidation = [
  body('tableNumber')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Table number must be between 1 and 10 characters'),
  
  body('capacity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Table capacity must be between 1 and 20'),
  
  body('location')
    .isIn(['indoor', 'outdoor', 'private', 'bar'])
    .withMessage('Location must be indoor, outdoor, private, or bar'),
  
  body('amenities')
    .optional()
    .isArray()
    .withMessage('Amenities must be an array'),
  
  body('minBookingDuration')
    .optional()
    .isInt({ min: 30, max: 480 })
    .withMessage('Minimum booking duration must be between 30 and 480 minutes'),
  
  body('maxBookingDuration')
    .optional()
    .isInt({ min: 60, max: 480 })
    .withMessage('Maximum booking duration must be between 60 and 480 minutes'),
  
  body('minSpending')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum spending must be a number greater than or equal to 0')
];

const menuItemValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Item name must be between 2 and 100 characters'),
  
  body('description')
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage('Description must be between 5 and 300 characters'),
  
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  
  body('category')
    .isIn(['appetizer', 'main', 'dessert', 'beverage', 'special'])
    .withMessage('Category must be appetizer, main, dessert, beverage, or special'),
  
  body('ingredients')
    .optional()
    .isArray()
    .withMessage('Ingredients must be an array'),
  
  body('allergens')
    .optional()
    .isArray()
    .withMessage('Allergens must be an array'),
  
  body('dietary')
    .optional()
    .isArray()
    .withMessage('Dietary information must be an array'),
  
  body('spicyLevel')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('Spicy level must be between 0 and 5'),
  
  body('preparationTime')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Preparation time must be between 1 and 120 minutes')
];

const businessHoursValidation = [
  body('businessHours')
    .isObject()
    .withMessage('Business hours must be an object'),
  
  body('businessHours.*.open')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Opening time must be in HH:MM format'),
  
  body('businessHours.*.close')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Closing time must be in HH:MM format'),
  
  body('businessHours.*.isOpen')
    .optional()
    .isBoolean()
    .withMessage('isOpen must be a boolean value')
];

const idValidation = [
  param('id')
    .isLength({ min: 1 })
    .withMessage('ID is required')
];

module.exports = {
  restaurantValidation,
  tableValidation,
  menuItemValidation,
  businessHoursValidation,
  idValidation
};