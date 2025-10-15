const { db } = require('../config/firebase');
const Restaurant = require('../models/Restaurant');
const Booking = require('../models/Booking');
const Table = require('../models/Table');
const MenuItem = require('../models/MenuItem');

/**
 * Get comprehensive analytics report for merchant's restaurant
 * GET /api/analytics/reports
 */
exports.getAnalyticsReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;
    
    // Get merchant's restaurant
    const restaurant = await Restaurant.findByMerchantId(userId);
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant profile not found',
      });
    }
    
    // Set date range (default to last 30 days)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Format dates for Firestore query
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    
    console.log(`Fetching analytics for restaurant ${restaurant.id} from ${startDateStr} to ${endDateStr}`);
    
    // Query bookings within date range
    const bookingsSnapshot = await db.collection('bookings')
      .where('restaurantId', '==', restaurant.id)
      .where('date', '>=', startDateStr)
      .where('date', '<=', endDateStr)
      .get();
    
    const bookings = bookingsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${bookings.length} bookings in date range`);
    
    // Enrich bookings with table and menu item data
    const enrichedBookings = await enrichBookingsData(bookings, restaurant.id);
    
    // Calculate analytics
    const analytics = calculateAnalytics(enrichedBookings);
    
    return res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Enrich bookings with table and menu item data
 */
async function enrichBookingsData(bookings, restaurantId) {
  try {
    // Fetch all tables for this restaurant
    const tables = await Table.findByRestaurantId(restaurantId);
    const tablesMap = {};
    tables.forEach(table => {
      tablesMap[table.id] = table;
    });
    
    // Fetch all menu items for this restaurant
    const menuItems = await MenuItem.findByRestaurantId(restaurantId);
    const menuItemsMap = {};
    menuItems.forEach(item => {
      menuItemsMap[item.id] = item;
    });
    
    // Enrich each booking
    return bookings.map(booking => {
      const enrichedBooking = { ...booking };
      
      // Add table info if tableId exists
      if (booking.tableId && tablesMap[booking.tableId]) {
        const table = tablesMap[booking.tableId];
        enrichedBooking.tableNumber = table.tableNumber || table.name;
        enrichedBooking.capacity = table.capacity;
        enrichedBooking.location = table.location;
      }
      
      // Enrich preOrder items with menu item details
      if (booking.preOrder && Array.isArray(booking.preOrder)) {
        enrichedBooking.preOrder = booking.preOrder.map(orderItem => {
          const menuItemId = orderItem.menuItemId || orderItem.id;
          if (menuItemId && menuItemsMap[menuItemId]) {
            const menuItem = menuItemsMap[menuItemId];
            return {
              ...orderItem,
              name: menuItem.name,
              price: menuItem.price,
              category: menuItem.category,
              menuItemId: menuItemId,
            };
          }
          return orderItem;
        });
      }
      
      return enrichedBooking;
    });
  } catch (error) {
    console.error('Error enriching bookings data:', error);
    return bookings; // Return original if enrichment fails
  }
}

/**
 * Calculate all analytics from bookings data
 */
function calculateAnalytics(bookings) {
  // Filter bookings by status
  const completedBookings = bookings.filter(b => b.status === 'completed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
  
  // Calculate summary
  const totalBookings = bookings.length;
  const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const averageBookingValue = completedBookings.length > 0 ? totalRevenue / completedBookings.length : 0;
  const cancellationRate = totalBookings > 0 ? (cancelledBookings.length / totalBookings * 100) : 0;
  
  return {
    summary: {
      totalBookings,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalCancellations: cancelledBookings.length,
      cancellationRate: parseFloat(cancellationRate.toFixed(1)),
      averageBookingValue: parseFloat(averageBookingValue.toFixed(2)),
      completedBookings: completedBookings.length,
    },
    earnings: calculateEarnings(bookings, completedBookings, pendingBookings, cancelledBookings),
    popularTables: calculatePopularTables(bookings),
    topMenuItems: calculateTopMenuItems(bookings),
    topBooking: findTopBooking(completedBookings),
    weeklyBookings: calculateWeeklyBookings(bookings),
    peakHours: calculatePeakHours(bookings),
  };
}

/**
 * Calculate earnings breakdown and trend
 */
function calculateEarnings(bookings, completedBookings, pendingBookings, cancelledBookings) {
  const completedRevenue = completedBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const pendingRevenue = pendingBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const cancelledRevenue = cancelledBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  
  return {
    total: parseFloat(completedRevenue.toFixed(2)),
    byStatus: {
      completed: parseFloat(completedRevenue.toFixed(2)),
      pending: parseFloat(pendingRevenue.toFixed(2)),
      cancelled: parseFloat(cancelledRevenue.toFixed(2)),
    },
    trend: calculateDailyTrend(completedBookings),
  };
}

/**
 * Calculate daily revenue trend
 */
function calculateDailyTrend(completedBookings) {
  const dailyRevenue = {};
  
  completedBookings.forEach(booking => {
    const date = booking.date;
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = 0;
    }
    dailyRevenue[date] += booking.totalAmount || 0;
  });
  
  // Convert to array and sort by date
  return Object.entries(dailyRevenue)
    .map(([date, amount]) => ({
      date,
      amount: parseFloat(amount.toFixed(2)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate popular tables by booking count and revenue
 */
function calculatePopularTables(bookings) {
  const tableStats = {};
  
  bookings.forEach(booking => {
    const tableId = booking.tableId;
    if (!tableId) return;
    
    if (!tableStats[tableId]) {
      tableStats[tableId] = {
        tableId,
        tableNumber: booking.tableNumber || 'Unknown',
        bookingCount: 0,
        totalRevenue: 0,
        capacity: booking.capacity || 0,
        location: booking.location || 'unknown',
      };
    }
    
    tableStats[tableId].bookingCount++;
    if (booking.status === 'completed') {
      tableStats[tableId].totalRevenue += booking.totalAmount || 0;
    }
  });
  
  // Sort by booking count and return top 5
  return Object.values(tableStats)
    .map(table => ({
      ...table,
      totalRevenue: parseFloat(table.totalRevenue.toFixed(2)),
    }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 5);
}

/**
 * Calculate top menu items by order count
 */
function calculateTopMenuItems(bookings) {
  const menuItemStats = {};
  
  bookings.forEach(booking => {
    if (!booking.preOrder || !Array.isArray(booking.preOrder)) return;
    
    booking.preOrder.forEach(item => {
      const itemId = item.menuItemId || item.id;
      if (!itemId) return;
      
      if (!menuItemStats[itemId]) {
        menuItemStats[itemId] = {
          menuItemId: itemId,
          name: item.name || 'Unknown Item',
          orderCount: 0,
          totalRevenue: 0,
          averagePrice: item.price || 0,
          category: item.category || 'Unknown',
        };
      }
      
      const quantity = item.quantity || 1;
      menuItemStats[itemId].orderCount += quantity;
      menuItemStats[itemId].totalRevenue += (item.price || 0) * quantity;
    });
  });
  
  // Sort by order count and return top 10
  return Object.values(menuItemStats)
    .map(item => ({
      ...item,
      totalRevenue: parseFloat(item.totalRevenue.toFixed(2)),
      averagePrice: parseFloat(item.averagePrice.toFixed(2)),
    }))
    .sort((a, b) => b.orderCount - a.orderCount)
    .slice(0, 10);
}

/**
 * Find the highest value booking
 */
function findTopBooking(completedBookings) {
  if (completedBookings.length === 0) return null;
  
  const topBooking = completedBookings.reduce((max, b) => 
    (b.totalAmount || 0) > (max.totalAmount || 0) ? b : max
  );
  
  // Format pre-order items
  const preOrderItems = (topBooking.preOrder || []).map(item => {
    const quantity = item.quantity || 1;
    return `${item.name || 'Unknown'} x${quantity}`;
  });
  
  return {
    bookingId: topBooking.id,
    customerName: topBooking.customerInfo?.name || topBooking.userName || 'Unknown',
    date: topBooking.date,
    time: topBooking.time,
    partySize: topBooking.partySize || topBooking.numberOfGuests || 0,
    totalAmount: parseFloat((topBooking.totalAmount || 0).toFixed(2)),
    tableNumber: topBooking.tableNumber || 'N/A',
    preOrderItems,
    status: topBooking.status,
  };
}

/**
 * Calculate bookings by day of week
 */
function calculateWeeklyBookings(bookings) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weeklyStats = days.map(day => ({ day, count: 0, revenue: 0 }));
  
  bookings.forEach(booking => {
    const date = new Date(booking.date + 'T00:00:00');
    const dayIndex = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Map Sunday-Saturday (0-6) to Monday-Sunday array index
    const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
    
    weeklyStats[mappedIndex].count++;
    if (booking.status === 'completed') {
      weeklyStats[mappedIndex].revenue += booking.totalAmount || 0;
    }
  });
  
  // Round revenue values
  return weeklyStats.map(stat => ({
    ...stat,
    revenue: parseFloat(stat.revenue.toFixed(2)),
  }));
}

/**
 * Calculate peak booking hours
 */
function calculatePeakHours(bookings) {
  const hourStats = {};
  
  bookings.forEach(booking => {
    if (!booking.time) return;
    
    // Extract hour from time (e.g., "19:00" -> "19:00")
    const hour = booking.time.substring(0, 5); // Gets HH:MM format
    
    if (!hourStats[hour]) {
      hourStats[hour] = 0;
    }
    hourStats[hour]++;
  });
  
  // Convert to array, sort by booking count, and return top 10
  return Object.entries(hourStats)
    .map(([hour, bookingCount]) => ({ hour, bookingCount }))
    .sort((a, b) => b.bookingCount - a.bookingCount)
    .slice(0, 10);
}

// Already exported at line 9 with exports.getAnalyticsReport
