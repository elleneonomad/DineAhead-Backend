const { uploadToFirebaseStorage, deleteFromFirebaseStorage } = require('../utils/upload');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const Table = require('../models/Table');

/**
 * Upload restaurant profile picture
 * POST /api/upload/restaurant/profile
 */
const uploadRestaurantProfile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Get merchant's restaurant
    const restaurant = await Restaurant.findByMerchantId(req.user.userId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Upload new image to Firebase Storage
    const imageUrl = await uploadToFirebaseStorage(
      req.file.buffer,
      req.file.originalname,
      'restaurants/profile',
      req.file.mimetype
    );

    // Delete old profile image if exists
    if (restaurant.coverImage) {
      try {
        await deleteFromFirebaseStorage(restaurant.coverImage);
      } catch (error) {
        console.log('Could not delete old profile image:', error.message);
      }
    }

    // Update restaurant with new image URL
    const updatedRestaurant = await Restaurant.update(restaurant.id, {
      coverImage: imageUrl
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant profile picture uploaded successfully',
      data: {
        imageUrl: imageUrl,
        restaurant: updatedRestaurant
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload restaurant gallery images
 * POST /api/upload/restaurant/gallery
 */
const uploadRestaurantGallery = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No image files provided'
      });
    }

    // Get merchant's restaurant
    const restaurant = await Restaurant.findByMerchantId(req.user.userId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Upload all images
    const uploadPromises = req.files.map(file =>
      uploadToFirebaseStorage(
        file.buffer,
        file.originalname,
        'restaurants/gallery',
        file.mimetype
      )
    );

    const imageUrls = await Promise.all(uploadPromises);

    // Add new images to existing images array
    const updatedImages = [...(restaurant.images || []), ...imageUrls];

    // Update restaurant with new images
    const updatedRestaurant = await Restaurant.update(restaurant.id, {
      images: updatedImages
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant gallery images uploaded successfully',
      data: {
        imageUrls: imageUrls,
        restaurant: updatedRestaurant
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete restaurant gallery image
 * DELETE /api/upload/restaurant/gallery
 */
const deleteRestaurantGalleryImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required'
      });
    }

    // Get merchant's restaurant
    const restaurant = await Restaurant.findByMerchantId(req.user.userId);
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }

    // Check if image exists in restaurant's images
    if (!restaurant.images || !restaurant.images.includes(imageUrl)) {
      return res.status(404).json({
        success: false,
        error: 'Image not found in restaurant gallery'
      });
    }

    // Delete image from Firebase Storage
    await deleteFromFirebaseStorage(imageUrl);

    // Remove image URL from restaurant's images array
    const updatedImages = restaurant.images.filter(img => img !== imageUrl);

    // Update restaurant
    const updatedRestaurant = await Restaurant.update(restaurant.id, {
      images: updatedImages
    });

    res.status(200).json({
      success: true,
      message: 'Restaurant gallery image deleted successfully',
      data: {
        restaurant: updatedRestaurant
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload menu item image
 * POST /api/upload/menu-item/:menuItemId
 */
const uploadMenuItemImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const { menuItemId } = req.params;

    // Get menu item
    const menuItem = await MenuItem.findById(menuItemId);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    // Verify merchant owns this menu item's restaurant
    const restaurant = await Restaurant.findByMerchantId(req.user.userId);
    
    if (!restaurant || restaurant.id !== menuItem.restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this menu item'
      });
    }

    // Upload new image to Firebase Storage
    const imageUrl = await uploadToFirebaseStorage(
      req.file.buffer,
      req.file.originalname,
      'menu-items',
      req.file.mimetype
    );

    // Delete old images if they exist
    if (menuItem.images && menuItem.images.length > 0) {
      for (const oldImageUrl of menuItem.images) {
        try {
          await deleteFromFirebaseStorage(oldImageUrl);
        } catch (error) {
          console.log('Could not delete old menu item image:', error.message);
        }
      }
    }

    // Update menu item with new image URL
    const updatedMenuItem = await MenuItem.update(menuItemId, {
      images: [imageUrl]
    });

    res.status(200).json({
      success: true,
      message: 'Menu item image uploaded successfully',
      data: {
        imageUrl: imageUrl,
        menuItem: updatedMenuItem
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload table image
 * POST /api/upload/table/:tableId
 */
const uploadTableImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    const { tableId } = req.params;

    // Get table
    const table = await Table.findById(tableId);
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Verify merchant owns this table's restaurant
    const restaurant = await Restaurant.findByMerchantId(req.user.userId);
    
    if (!restaurant || restaurant.id !== table.restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this table'
      });
    }

    // Upload new image to Firebase Storage
    const imageUrl = await uploadToFirebaseStorage(
      req.file.buffer,
      req.file.originalname,
      'tables',
      req.file.mimetype
    );

    // Get existing images or initialize empty array
    const existingImages = table.images || [];

    // ADD new image to existing images (don't delete old ones)
    const updatedImages = [...existingImages, imageUrl];

    // Update table with ALL images
    const updatedTable = await Table.update(tableId, {
      images: updatedImages
    });

    res.status(200).json({
      success: true,
      message: 'Table image uploaded successfully',
      data: {
        imageUrl: imageUrl,
        table: updatedTable
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload multiple table images
 * POST /api/upload/table/:tableId/multiple
 */
const uploadMultipleTableImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No image files provided'
      });
    }

    const { tableId } = req.params;

    // Get table
    const table = await Table.findById(tableId);
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Verify merchant owns this table's restaurant
    const restaurant = await Restaurant.findByMerchantId(req.user.userId);
    
    if (!restaurant || restaurant.id !== table.restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this table'
      });
    }

    // Upload all images in parallel for better performance
    const uploadPromises = req.files.map(file =>
      uploadToFirebaseStorage(
        file.buffer,
        file.originalname,
        'tables',
        file.mimetype
      )
    );

    const imageUrls = await Promise.all(uploadPromises);

    // Add new images to existing images array
    const existingImages = table.images || [];
    const updatedImages = [...existingImages, ...imageUrls];

    // Update table with new images
    const updatedTable = await Table.update(tableId, {
      images: updatedImages
    });

    res.status(200).json({
      success: true,
      message: `${imageUrls.length} table image${imageUrls.length > 1 ? 's' : ''} uploaded successfully`,
      data: {
        imageUrls: imageUrls,
        table: updatedTable
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete table image
 * DELETE /api/upload/table/:tableId/image
 * Body: { imageUrl: "https://..." }
 */
const deleteTableImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    const { tableId } = req.params;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: 'Image URL is required'
      });
    }

    // Get table
    const table = await Table.findById(tableId);
    
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Verify merchant owns this table's restaurant
    const restaurant = await Restaurant.findByMerchantId(req.user.userId);
    
    if (!restaurant || restaurant.id !== table.restaurantId) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to update this table'
      });
    }

    // Check if image exists in table's images
    if (!table.images || !table.images.includes(imageUrl)) {
      return res.status(404).json({
        success: false,
        error: 'Image not found in table'
      });
    }

    // Delete image from Firebase Storage
    await deleteFromFirebaseStorage(imageUrl);

    // Remove image URL from table's images array
    const updatedImages = table.images.filter(img => img !== imageUrl);

    // Update table
    const updatedTable = await Table.update(tableId, {
      images: updatedImages
    });

    res.status(200).json({
      success: true,
      message: 'Table image deleted successfully',
      data: {
        table: updatedTable
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadRestaurantProfile,
  uploadRestaurantGallery,
  deleteRestaurantGalleryImage,
  uploadMenuItemImage,
  uploadTableImage,
  uploadMultipleTableImages,
  deleteTableImage
};
