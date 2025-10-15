const Restaurant = require('../models/Restaurant');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { db } = require('../config/firebase');

// Get all bookings for merchant's restaurant
const getRestaurantBookings = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    const { status, date, upcoming } = req.query;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const filters = {};
    if (status) filters.status = status;
    if (date) filters.date = date;
    if (upcoming === 'true') filters.upcoming = true;

    const bookings = await Booking.findByRestaurantId(restaurant.id, filters);

    // Populate customer and table details
    for (let booking of bookings) {
      const customerDoc = await User.findById(booking.userId);
      const table = await Table.findById(booking.tableId);
      
      if (customerDoc) {
        booking.customer = {
          id: customerDoc.id,
          name: `${customerDoc.firstName ?? ''} ${customerDoc.lastName ?? ''}`.trim(),
          email: customerDoc.email ?? '',
          phone: customerDoc.phone ?? ''
        };
      } else {
        // Booking created by merchant for guest or missing user profile
        booking.customer = {
          id: null,
          name: booking.customerInfo?.name ?? '',
          email: booking.customerInfo?.email ?? '',
          phone: booking.customerInfo?.phone ?? ''
        };
      }
      booking.table = {
        id: table.id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location
      };

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

// Get a specific booking
const getBookingDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const booking = await Booking.findById(id);
    if (!booking || booking.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Populate details
    const customerDoc = await User.findById(booking.userId);
    const table = await Table.findById(booking.tableId);
    
    if (customerDoc) {
      booking.customer = {
        id: customerDoc.id,
        name: `${customerDoc.firstName ?? ''} ${customerDoc.lastName ?? ''}`.trim(),
        email: customerDoc.email ?? '',
        phone: customerDoc.phone ?? ''
      };
    } else {
      booking.customer = {
        id: null,
        name: booking.customerInfo?.name ?? '',
        email: booking.customerInfo?.email ?? '',
        phone: booking.customerInfo?.phone ?? ''
      };
    }
    booking.table = {
      id: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      location: table.location,
      amenities: table.amenities
    };

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

// Accept/Confirm a booking
const acceptBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    const { merchantNotes } = req.body;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const booking = await Booking.findById(id);
    if (!booking || booking.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Can only accept pending bookings' });
    }

    const updateData = {
      status: 'confirmed',
      merchantNotes: merchantNotes || ''
    };

    const updatedBooking = await Booking.update(id, updateData);

    res.json({
      message: 'Booking accepted successfully',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// Reject a booking
const rejectBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    const { reason, merchantNotes } = req.body;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const booking = await Booking.findById(id);
    if (!booking || booking.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ error: 'Can only reject pending bookings' });
    }

    const updateData = {
      status: 'rejected',
      cancellationReason: reason,
      merchantNotes: merchantNotes || ''
    };

    const updatedBooking = await Booking.update(id, updateData);

    res.json({
      message: 'Booking rejected successfully',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// Update booking details
const updateBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    const updateData = req.body;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const booking = await Booking.findById(id);
    if (!booking || booking.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot modify cancelled or completed bookings' });
    }

    // If time or date is being changed, check availability
    if (updateData.time || updateData.date) {
      const newDate = updateData.date || booking.date;
      const newTime = updateData.time || booking.time;
      const duration = updateData.duration || booking.duration;

      const isAvailable = await Booking.isSlotAvailable(booking.tableId, newDate, newTime, duration);
      if (!isAvailable) {
        return res.status(400).json({ error: 'The new time slot is not available' });
      }
    }

    const updatedBooking = await Booking.update(id, updateData);

    res.json({
      message: 'Booking updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// Cancel booking (merchant side)
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const booking = await Booking.findById(id);
    if (!booking || booking.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel this booking' });
    }

    const cancelledBooking = await Booking.cancel(id, reason || 'Cancelled by restaurant', 'merchant');

    res.json({
      message: 'Booking cancelled successfully',
      booking: cancelledBooking
    });
  } catch (error) {
    next(error);
  }
};

// Mark booking as completed
const completeBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    const { merchantNotes, paymentStatus } = req.body;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const booking = await Booking.findById(id);
    if (!booking || booking.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Can only complete confirmed bookings' });
    }

    const updateData = {
      status: 'completed',
      merchantNotes: merchantNotes || booking.merchantNotes,
      paymentStatus: paymentStatus || booking.paymentStatus
    };

    const updatedBooking = await Booking.update(id, updateData);

    res.json({
      message: 'Booking marked as completed',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// Mark booking as no-show
const markNoShow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.userId;
    const { merchantNotes } = req.body;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const booking = await Booking.findById(id);
    if (!booking || booking.restaurantId !== restaurant.id) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ error: 'Can only mark confirmed bookings as no-show' });
    }

    const updateData = {
      status: 'no-show',
      merchantNotes: merchantNotes || booking.merchantNotes
    };

    const updatedBooking = await Booking.update(id, updateData);

    res.json({
      message: 'Booking marked as no-show',
      booking: updatedBooking
    });
  } catch (error) {
    next(error);
  }
};

// Get booking statistics for dashboard
const getBookingStats = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    
    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get various booking counts
    const todayBookings = await Booking.findByRestaurantId(restaurant.id, { date: today });
    const pendingBookings = await Booking.findByRestaurantId(restaurant.id, { status: 'pending' });
    const confirmedBookings = await Booking.findByRestaurantId(restaurant.id, { status: 'confirmed', upcoming: true });
    const allBookings = await Booking.findByRestaurantId(restaurant.id, {});

    // Calculate stats
    const stats = {
      today: {
        total: todayBookings.length,
        pending: todayBookings.filter(b => b.status === 'pending').length,
        confirmed: todayBookings.filter(b => b.status === 'confirmed').length,
        completed: todayBookings.filter(b => b.status === 'completed').length,
        cancelled: todayBookings.filter(b => b.status === 'cancelled').length,
        noShow: todayBookings.filter(b => b.status === 'no-show').length
      },
      overall: {
        pending: pendingBookings.length,
        upcomingConfirmed: confirmedBookings.length,
        totalBookings: allBookings.length,
        totalRevenue: allBookings
          .filter(b => b.status === 'completed')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
      }
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// Calendar summary of bookings by date for a specific month
const getCalendar = async (req, res, next) => {
  try {
    const merchantId = req.user.userId;
    const { month, status } = req.query; // month format: YYYY-MM

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'Invalid or missing month. Expected format YYYY-MM' });
    }

    const restaurant = await Restaurant.findByMerchantId(merchantId);
    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    // Compute month boundaries
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthIdx = parseInt(monthStr, 10) - 1; // 0-based
    const startDate = new Date(Date.UTC(year, monthIdx, 1));
    const endDate = new Date(Date.UTC(year, monthIdx + 1, 0)); // last day of month

    const toISODate = (d) => d.toISOString().slice(0, 10);
    const startISO = toISODate(startDate); // YYYY-MM-DD
    const endISO = toISODate(endDate);

    // Query bookings for the month and this restaurant
    let query = db.collection('bookings')
      .where('restaurantId', '==', restaurant.id)
      .where('date', '>=', startISO)
      .where('date', '<=', endISO);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snap = await query.get();

    const counts = new Map();
    snap.docs.forEach(doc => {
      const data = doc.data();
      const d = data.date; // expected YYYY-MM-DD
      if (d) counts.set(d, (counts.get(d) || 0) + 1);
    });

    const bookingDates = Array.from(counts.entries())
      .map(([date, bookingCount]) => ({ date, bookingCount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({ success: true, month, bookingDates });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRestaurantBookings,
  getBookingDetails,
  acceptBooking,
  rejectBooking,
  updateBooking,
  cancelBooking,
  completeBooking,
  markNoShow,
  getBookingStats,
  getCalendar
};
