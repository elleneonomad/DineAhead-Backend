const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { upload } = require('../utils/upload');
const {
  uploadRestaurantProfile,
  uploadRestaurantGallery,
  deleteRestaurantGalleryImage,
  uploadMenuItemImage,
  uploadTableImage,
  uploadMultipleTableImages,
  deleteTableImage
} = require('../controllers/upload');

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File size too large. Maximum file size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message || 'Error uploading file'
    });
  }
  next();
};

// All upload routes require merchant authentication
router.use(authenticateToken);
router.use(requireRole(['merchant']));

/**
 * @route   POST /api/upload/restaurant/profile
 * @desc    Upload restaurant profile/cover picture
 * @access  Merchant only
 */
router.post(
  '/restaurant/profile',
  upload.single('image'),
  handleMulterError,
  uploadRestaurantProfile
);

/**
 * @route   POST /api/upload/restaurant/gallery
 * @desc    Upload multiple restaurant gallery images (max 10)
 * @access  Merchant only
 */
router.post(
  '/restaurant/gallery',
  upload.array('images', 10),
  handleMulterError,
  uploadRestaurantGallery
);

/**
 * @route   DELETE /api/upload/restaurant/gallery
 * @desc    Delete a restaurant gallery image
 * @access  Merchant only
 */
router.delete(
  '/restaurant/gallery',
  deleteRestaurantGalleryImage
);

/**
 * @route   POST /api/upload/menu-item/:menuItemId
 * @desc    Upload menu item image
 * @access  Merchant only
 */
router.post(
  '/menu-item/:menuItemId',
  upload.single('image'),
  handleMulterError,
  uploadMenuItemImage
);

/**
 * @route   POST /api/upload/table/:tableId
 * @desc    Upload table image
 * @access  Merchant only
 */
router.post(
  '/table/:tableId',
  upload.single('image'),
  handleMulterError,
  uploadTableImage
);

/**
 * @route   POST /api/upload/table/:tableId/multiple
 * @desc    Upload multiple table images at once
 * @access  Merchant only
 */
router.post(
  '/table/:tableId/multiple',
  upload.array('images', 10),
  handleMulterError,
  uploadMultipleTableImages
);

/**
 * @route   DELETE /api/upload/table/:tableId/image
 * @desc    Delete a specific table image
 * @access  Merchant only
 */
router.delete(
  '/table/:tableId/image',
  deleteTableImage
);

module.exports = router;
