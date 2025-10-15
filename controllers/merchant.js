const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Blacklist = require('../models/Blacklist');

// Restaurant Management
const createRestaurant = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    
    // Check if merchant already has a restaurant
    const existingRestaurant = await Restaurant.findByMerchantId(merchantId);
    if (existingRestaurant) {
      return res.status(400).json({ error: 'Merchant already has a restaurant profile' });
    }

    const restaurantData = {
      ...req.body,
      merchantId
    };

    const restaurant = await Restaurant.create(restaurantData);

    res.status(201).json({
      message: 'Restaurant profile created successfully',
      restaurant
    });
  } catch (error) {
    next(error);
  }
};

const getRestaurant = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    res.json(restaurant);
  } catch (error) {
    next(error);
  }
};

const updateRestaurant = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const updatedRestaurant = await Restaurant.update(restaurant.id, req.body);

    res.json({
      message: 'Restaurant profile updated successfully',
      restaurant: updatedRestaurant
    });
  } catch (error) {
    next(error);
  }
};

const updateBusinessHours = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    const { businessHours } = req.body;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const updatedRestaurant = await Restaurant.update(restaurant.id, { businessHours });

    res.json({
      message: 'Business hours updated successfully',
      businessHours: updatedRestaurant.businessHours
    });
  } catch (error) {
    next(error);
  }
};

// Table Management
const createTable = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found. Please create a restaurant profile first.' });
    }

    const tableData = {
      ...req.body,
      restaurantId: restaurant.id
    };

    const table = await Table.create(tableData);

    res.status(201).json({
      message: 'Table created successfully',
      table
    });
  } catch (error) {
    next(error);
  }
};

const getTables = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const tables = await Table.findByRestaurantId(restaurant.id);

    res.json(tables);
  } catch (error) {
    next(error);
  }
};

const updateTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const table = await Table.findById(id);
    if (!table || table.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const updatedTable = await Table.update(id, req.body);

    res.json({
      message: 'Table updated successfully',
      table: updatedTable
    });
  } catch (error) {
    next(error);
  }
};

const deleteTable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const table = await Table.findById(id);
    if (!table || table.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Table not found' });
    }

    await Table.delete(id);

    res.json({ message: 'Table deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Menu Management
const createMenuItem = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found. Please create a restaurant profile first.' });
    }

    // Check subscription limit for menu items
    const user = await User.findById(merchantId);
    const subscription = user?.subscription || { tier: 'free', menuItemLimit: 5 };
    
    // Count existing menu items for this restaurant
    const existingMenuItems = await MenuItem.findByRestaurantId(restaurant.id);
    const currentCount = existingMenuItems.length;
    
    // Check if limit is reached (Pro users have limit of 999999 = unlimited)
    if (currentCount >= subscription.menuItemLimit) {
      return res.status(403).json({
        success: false,
        error: 'Menu item limit reached',
        message: `You have reached the maximum limit of ${subscription.menuItemLimit} menu items. Upgrade to Pro for unlimited items.`,
        code: 'MENU_ITEM_LIMIT_REACHED',
        currentTier: subscription.tier,
        currentCount: currentCount,
        limit: subscription.menuItemLimit,
      });
    }

    const menuItemData = {
      ...req.body,
      restaurantId: restaurant.id
    };

    const menuItem = await MenuItem.create(menuItemData);

    res.status(201).json({
      message: 'Menu item created successfully',
      menuItem,
      subscription: {
        tier: subscription.tier,
        itemsUsed: currentCount + 1,
        itemsLimit: subscription.menuItemLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMenuItems = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    const { category, available } = req.query;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const filters = {};
    if (category) filters.category = category;
    if (available !== undefined) filters.available = available === 'true';

    const menuItems = await MenuItem.findByRestaurantId(restaurant.id, filters);

    res.json(menuItems);
  } catch (error) {
    next(error);
  }
};

const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const menuItem = await MenuItem.findById(id);
    if (!menuItem || menuItem.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const updatedMenuItem = await MenuItem.update(id, req.body);

    res.json({
      message: 'Menu item updated successfully',
      menuItem: updatedMenuItem
    });
  } catch (error) {
    next(error);
  }
};

const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const menuItem = await MenuItem.findById(id);
    if (!menuItem || menuItem.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await MenuItem.delete(id);

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const updateMenuItemAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const menuItem = await MenuItem.findById(id);
    if (!menuItem || menuItem.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const updatedMenuItem = await MenuItem.updateAvailability(id, isAvailable);

    res.json({
      message: `Menu item ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      menuItem: updatedMenuItem
    });
  } catch (error) {
    next(error);
  }
};

// Dashboard
const getDashboard = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    // Get statistics
    const today = new Date().toISOString().split('T')[0];
    const tables = await Table.findByRestaurantId(restaurant.id);
    const menuItems = await MenuItem.findByRestaurantId(restaurant.id);
    const todayBookings = await Booking.findByRestaurantId(restaurant.id, { date: today });
    const pendingBookings = await Booking.findByRestaurantId(restaurant.id, { status: 'pending' });

    const stats = {
      totalTables: tables.length,
      totalMenuItems: menuItems.length,
      todayBookings: todayBookings.length,
      pendingBookings: pendingBookings.length,
      availableMenuItems: menuItems.filter(item => item.isAvailable).length
    };

    res.json({
      restaurant,
      stats,
      recentBookings: todayBookings.slice(0, 10) // Latest 10 bookings
    });
  } catch (error) {
    next(error);
  }
};

// Blacklist Management
const addToBlacklist = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    const { phoneNumber, reason } = req.body;
    
    // Get merchant's restaurant
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false,
        error: 'Restaurant profile not found. Please create a restaurant profile first.' 
      });
    }

    // Check if phone number is already blacklisted
    const existingBlacklist = await Blacklist.findByPhoneNumber(restaurant.id, phoneNumber);
    if (existingBlacklist) {
      return res.status(400).json({ 
        success: false,
        error: 'This phone number is already blacklisted' 
      });
    }

    // Create blacklist entry
    const blacklistData = {
      restaurantId: restaurant.id,
      phoneNumber: phoneNumber,
      reason: reason || '',
      addedBy: merchantId
    };

    const blacklist = await Blacklist.create(blacklistData);

    res.status(201).json({
      success: true,
      message: 'Phone number added to blacklist successfully',
      data: blacklist
    });
  } catch (error) {
    next(error);
  }
};

const getBlacklist = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    
    // Get merchant's restaurant
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false,
        error: 'Restaurant profile not found' 
      });
    }

    // Get all blacklisted numbers for this restaurant
    const blacklist = await Blacklist.findByRestaurantId(restaurant.id);

    res.json({
      success: true,
      data: blacklist,
      count: blacklist.length
    });
  } catch (error) {
    next(error);
  }
};

const updateBlacklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    const { phoneNumber, reason } = req.body;
    
    // Get merchant's restaurant
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false,
        error: 'Restaurant profile not found' 
      });
    }

    // Get blacklist entry
    const blacklist = await Blacklist.findById(id);
    if (!blacklist || blacklist.restaurantId !== restaurant.id) {
      return res.status(404).json({ 
        success: false,
        error: 'Blacklist entry not found' 
      });
    }

    // If updating phone number, check for duplicates
    if (phoneNumber && phoneNumber !== blacklist.phoneNumber) {
      const existingBlacklist = await Blacklist.findByPhoneNumber(restaurant.id, phoneNumber);
      if (existingBlacklist && existingBlacklist.id !== id) {
        return res.status(400).json({ 
          success: false,
          error: 'This phone number is already blacklisted' 
        });
      }
    }

    // Update blacklist entry
    const updateData = {};
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (reason !== undefined) updateData.reason = reason;

    const updatedBlacklist = await Blacklist.update(id, updateData);

    res.json({
      success: true,
      message: 'Blacklist entry updated successfully',
      data: updatedBlacklist
    });
  } catch (error) {
    next(error);
  }
};

const removeFromBlacklist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    
    // Get merchant's restaurant
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false,
        error: 'Restaurant profile not found' 
      });
    }

    // Get blacklist entry
    const blacklist = await Blacklist.findById(id);
    if (!blacklist || blacklist.restaurantId !== restaurant.id) {
      return res.status(404).json({ 
        success: false,
        error: 'Blacklist entry not found' 
      });
    }

    // Delete blacklist entry (soft delete)
    await Blacklist.delete(id);

    res.json({ 
      success: true,
      message: 'Phone number removed from blacklist successfully' 
    });
  } catch (error) {
    next(error);
  }
};

const checkBlacklist = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    const { phoneNumber } = req.query;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false,
        error: 'Phone number is required' 
      });
    }

    // Get merchant's restaurant
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ 
        success: false,
        error: 'Restaurant profile not found' 
      });
    }

    // Check if phone number is blacklisted
    const isBlacklisted = await Blacklist.isBlacklisted(restaurant.id, phoneNumber);
    const blacklistEntry = isBlacklisted ? await Blacklist.findByPhoneNumber(restaurant.id, phoneNumber) : null;

    res.json({
      success: true,
      isBlacklisted: isBlacklisted,
      data: blacklistEntry
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
