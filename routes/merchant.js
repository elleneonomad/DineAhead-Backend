const express = require('express');
const router = express.Router();

const {
  createRestaurant,
  getRestaurant,
  updateRestaurant,
  updateBusinessHours,
  createTable,
  getTables,
  updateTable,
  deleteTable,
  createMenuItem,
  getMenuItems,
  updateMenuItem,
  deleteMenuItem,
  updateMenuItemAvailability,
  getDashboard,
  addToBlacklist,
  getBlacklist,
  updateBlacklist,
  removeFromBlacklist,
  checkBlacklist
} = require('../controllers/merchant');

const { authenticateToken, requireRole } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const {
  restaurantValidation,
  tableValidation,
  menuItemValidation,
  businessHoursValidation,
  idValidation
} = require('../validators/merchant');
const {
  blacklistValidation,
  blacklistUpdateValidation,
  blacklistIdValidation
} = require('../validators/blacklist');

// Apply authentication and merchant role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['merchant']));

// Dashboard
router.get('/dashboard', getDashboard);

// Restaurant routes
router.post('/restaurant', restaurantValidation, handleValidationErrors, createRestaurant);
router.get('/restaurant', getRestaurant);
router.put('/restaurant', restaurantValidation, handleValidationErrors, updateRestaurant);
router.put('/restaurant/business-hours', businessHoursValidation, handleValidationErrors, updateBusinessHours);

// Table routes
router.post('/tables', tableValidation, handleValidationErrors, createTable);
router.get('/tables', getTables);
router.put('/tables/:id', idValidation, tableValidation, handleValidationErrors, updateTable);
router.delete('/tables/:id', idValidation, handleValidationErrors, deleteTable);

// Menu routes
router.post('/menu', menuItemValidation, handleValidationErrors, createMenuItem);
router.get('/menu', getMenuItems);
router.put('/menu/:id', idValidation, menuItemValidation, handleValidationErrors, updateMenuItem);
router.delete('/menu/:id', idValidation, handleValidationErrors, deleteMenuItem);
router.patch('/menu/:id/availability', idValidation, handleValidationErrors, updateMenuItemAvailability);

// Blacklist routes
router.post('/blacklist', blacklistValidation, handleValidationErrors, addToBlacklist);
router.get('/blacklist', getBlacklist);
router.get('/blacklist/check', checkBlacklist);
router.put('/blacklist/:id', blacklistIdValidation, blacklistUpdateValidation, handleValidationErrors, updateBlacklist);
router.delete('/blacklist/:id', blacklistIdValidation, handleValidationErrors, removeFromBlacklist);

module.exports = router;
