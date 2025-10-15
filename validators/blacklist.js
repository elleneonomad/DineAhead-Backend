const { body, param } = require('express-validator');

const blacklistValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[0-9+\s()-]+$/)
    .withMessage('Phone number must contain only numbers and valid phone characters (+, -, (), spaces)')
    .isLength({ min: 8, max: 20 })
    .withMessage('Phone number must be between 8 and 20 characters'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

const blacklistUpdateValidation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[0-9+\s()-]+$/)
    .withMessage('Phone number must contain only numbers and valid phone characters (+, -, (), spaces)')
    .isLength({ min: 8, max: 20 })
    .withMessage('Phone number must be between 8 and 20 characters')
];

const blacklistIdValidation = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Blacklist ID is required')
];

module.exports = {
  blacklistValidation,
  blacklistUpdateValidation,
  blacklistIdValidation
};
