const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Booking = require('../models/Booking');

// Restaurant browsing
const getRestaurants = async (req, res, next) => {
  try {
    const { cuisine, priceRange, search } = req.query;
    
    let filters = {};
    if (cuisine) filters.cuisine = cuisine;
    if (priceRange) filters.priceRange = priceRange;
    
    let restaurants = await Restaurant.findAll(filters);
    
    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      restaurants = restaurants.filter(restaurant => 
        restaurant.name.toLowerCase().includes(searchLower) ||
        restaurant.description.toLowerCase().includes(searchLower) ||
        restaurant.cuisine.some(c => c.toLowerCase().includes(searchLower))
      );
    }

    res.json(restaurants);
  } catch (error) {
    next(error);
  }
};

const getRestaurantDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const restaurant = await Restaurant.findById(id);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    // Get tables and menu
    const tables = await Table.findByRestaurantId(id);
    const menuItems = await MenuItem.findByRestaurantId(id, { available: true });

    res.json({
      restaurant,
      tables,
      menu: menuItems
    });
  } catch (error) {
    next(error);
  }
};

const getRestaurantMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { category } = req.query;
    
    const restaurant = await Restaurant.findById(id);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const filters = { available: true };
    if (category) filters.category = category;

    const menuItems = await MenuItem.findByRestaurantId(id, filters);

    // Group by category
    const groupedMenu = menuItems.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {});

    res.json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name
      },
      menu: groupedMenu
    });
  } catch (error) {
    next(error);
  }
};

// Availability and booking
const getAvailableTables = async (req, res, next) => {
  try {
    const { restaurantId, date, partySize, duration = 120 } = req.query;
    
    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const availableTables = await Table.findAvailableTables(
      restaurantId,
      date,
      '12:00', // We'll get all tables and then check specific times
      duration,
      parseInt(partySize)
    );

    res.json({
      date,
      partySize: parseInt(partySize),
      duration: parseInt(duration),
      availableTables
    });
  } catch (error) {
    next(error);
  }
};

const getAvailableTimeSlots = async (req, res, next) => {
  try {
    const { tableId, date, duration = 120 } = req.query;
    
    const table = await Table.findById(tableId);
    if (!table || !table.isActive) {
      return res.status(404).json({ error: 'Table not found' });
    }

    const result = await Booking.getAvailableTimeSlots(
      table.restaurantId,
      tableId,
      date,
      parseInt(duration)
    );

    res.json({
      tableId,
      tableNumber: table.tableNumber,
      date,
      duration: parseInt(duration),
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// Booking management
const createBooking = async (req, res, next) => {
  try {
    const actorId = req.user.userId;
    const isMerchant = req.user.role === 'merchant';

    const bookingData = {
      ...req.body,
      userId: isMerchant ? (req.body.userId || null) : actorId,
      createdBy: actorId
    };

    // If a merchant creates a booking, enforce that it targets their own restaurant
    if (isMerchant) {
      const merchantRestaurant = await Restaurant.findByMerchantId(actorId);
      if (!merchantRestaurant || merchantRestaurant.id !== bookingData.restaurantId) {
        return res.status(403).json({ error: 'You can only create bookings for your own restaurant' });
      }
    }

    // Verify restaurant and table exist
    const restaurant = await Restaurant.findById(bookingData.restaurantId);
    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const table = await Table.findById(bookingData.tableId);
    if (!table || !table.isActive || table.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Check table capacity
    if (bookingData.partySize > table.capacity) {
      return res.status(400).json({ 
        error: `Table capacity is ${table.capacity}, but party size is ${bookingData.partySize}` 
      });
    }

    // Check if time slot is available
    const isAvailable = await Table.isTableAvailable(
      bookingData.tableId,
      bookingData.date,
      bookingData.time,
      bookingData.duration || 120
    );

    if (!isAvailable) {
      return res.status(400).json({ error: 'Selected time slot is not available' });
    }

    // Validate pre-order items if provided
    if (bookingData.preOrder && bookingData.preOrder.length > 0) {
      const menuItemIds = bookingData.preOrder.map(item => item.menuItemId);
      const menuItems = await MenuItem.findByIds(menuItemIds);
      
      if (menuItems.length !== menuItemIds.length) {
        return res.status(400).json({ error: 'One or more menu items not found' });
      }

      // Check if all items are available
      const unavailableItems = menuItems.filter(item => !item.isAvailable);
      if (unavailableItems.length > 0) {
        return res.status(400).json({ 
          error: `Some menu items are not available: ${unavailableItems.map(item => item.name).join(', ')}` 
        });
      }

      // Calculate total amount for pre-order
      let totalAmount = 0;
      for (const orderItem of bookingData.preOrder) {
        const menuItem = menuItems.find(item => item.id === orderItem.menuItemId);
        totalAmount += menuItem.price * orderItem.quantity;
      }
      bookingData.totalAmount = totalAmount;
    }

    const booking = await Booking.create(bookingData);

    res.status(201).json({
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    next(error);
  }
};

const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, upcoming } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (upcoming === 'true') filters.upcoming = true;

    const bookings = await Booking.findByUserId(userId, filters);

    // Populate restaurant and table details
    for (let booking of bookings) {
      const restaurant = await Restaurant.findById(booking.restaurantId);
      const table = await Table.findById(booking.tableId);
      
      booking.restaurant = restaurant;
      booking.table = table;

      // Populate menu items for pre-orders
      if (booking.preOrder && booking.preOrder.length > 0) {
        const menuItemIds = booking.preOrder.map(item => item.menuItemId);
        const menuItems = await MenuItem.findByIds(menuItemIds);
        
        booking.preOrderItems = booking.preOrder.map(orderItem => {
          const menuItem = menuItems.find(item => item.id === orderItem.menuItemId);
          return {
            ...menuItem,
            quantity: orderItem.quantity
          };
        });
      }
    }

    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

const getBookingDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    const booking = await Booking.findById(id);
    if (!booking || booking.userId !== userId) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Populate details
    const restaurant = await Restaurant.findById(booking.restaurantId);
    const table = await Table.findById(booking.tableId);
    
    booking.restaurant = restaurant;
    booking.table = table;

    // Populate menu items for pre-orders
    if (booking.preOrder && booking.preOrder.length > 0) {
      const menuItemIds = booking.preOrder.map(item => item.menuItemId);
      const menuItems = await MenuItem.findByIds(menuItemIds);
      
      booking.preOrderItems = booking.preOrder.map(orderItem => {
        const menuItem = menuItems.find(item => item.id === orderItem.menuItemId);
        return {
          ...menuItem,
          quantity: orderItem.quantity
        };
      });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;
    
    const booking = await Booking.findById(id);
    if (!booking || booking.userId !== userId) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Cannot cancel this booking' });
    }

    // Check restaurant's cancellation policy
    const restaurant = await Restaurant.findById(booking.restaurantId);
    
    // Check if restaurant allows cancellations (check both old and new field structure)
    const allowsCancellation = restaurant.cancellation?.allowFreeCancel ?? restaurant.policies?.allowsCancellation ?? true;
    
    if (!allowsCancellation) {
      return res.status(400).json({ error: 'This restaurant does not allow cancellations' });
    }

    // Check if cancellation is within allowed time
    const bookingDateTime = new Date(`${booking.date}T${booking.time}:00`);
    const now = new Date();
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Use the new cancellation.cancelBeforeHours field, fallback to policies.minBookingHours
    const requiredHours = restaurant.cancellation?.cancelBeforeHours ?? restaurant.policies?.minBookingHours ?? 2;
    
    if (hoursUntilBooking < requiredHours) {
      return res.status(400).json({ 
        error: `Cancellation must be at least ${requiredHours} hour(s) before the booking time`,
        requiredHours,
        hoursUntilBooking: Math.round(hoursUntilBooking * 10) / 10
      });
    }

    const cancelledBooking = await Booking.cancel(id, reason || 'Cancelled by customer', 'customer');

    res.json({
      message: 'Booking cancelled successfully',
      booking: cancelledBooking
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRestaurants,
  getRestaurantDetails,
  getRestaurantMenu,
  getAvailableTables,
  getAvailableTimeSlots,
  createBooking,
  getUserBookings,
  getBookingDetails,
  cancelBooking
};