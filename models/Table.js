const { db } = require('../config/firebase');

class Table {
  constructor(data) {
    this.restaurantId = data.restaurantId;
    this.tableNumber = data.tableNumber;
    this.capacity = data.capacity;
    this.location = data.location; // 'indoor', 'outdoor', 'private', 'bar'
    this.amenities = data.amenities || []; // ['window-view', 'near-kitchen', 'wheelchair-accessible']
    this.images = data.images || []; // Firebase Storage URLs (array)
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.minBookingDuration = data.minBookingDuration || 90; // minutes
    this.maxBookingDuration = data.maxBookingDuration || 180; // minutes
    this.minSpending = data.minSpending !== undefined ? data.minSpending : 0; // currency amount
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async findByRestaurantId(restaurantId) {
    try {
      const tablesQuery = await db.collection('tables')
        .where('restaurantId', '==', restaurantId)
        .where('isActive', '==', true)
        .orderBy('tableNumber')
        .get();
      
      return tablesQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  }

  static async findById(tableId) {
    try {
      const tableDoc = await db.collection('tables').doc(tableId).get();
      if (!tableDoc.exists) {
        return null;
      }
      return {
        id: tableDoc.id,
        ...tableDoc.data()
      };
    } catch (error) {
      throw error;
    }
  }

  static async findAvailableTables(restaurantId, date, time, duration, partySize) {
    try {
      // Get all tables for restaurant that can accommodate party size
      const tablesQuery = await db.collection('tables')
        .where('restaurantId', '==', restaurantId)
        .where('isActive', '==', true)
        .where('capacity', '>=', partySize)
        .get();

      const tables = tablesQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Check availability for each table
      const availableTables = [];
      
      for (const table of tables) {
        const isAvailable = await Table.isTableAvailable(table.id, date, time, duration);
        if (isAvailable) {
          availableTables.push(table);
        }
      }

      return availableTables;
    } catch (error) {
      throw error;
    }
  }

  static async isTableAvailable(tableId, date, time, duration) {
    try {
      const requestedStart = new Date(`${date}T${time}:00`);
      const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);

      // Get all bookings for this table on the given date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const bookingsQuery = await db.collection('bookings')
        .where('tableId', '==', tableId)
        .where('status', 'in', ['confirmed', 'pending'])
        .where('date', '>=', startOfDay.toISOString())
        .where('date', '<=', endOfDay.toISOString())
        .get();

      const existingBookings = bookingsQuery.docs.map(doc => doc.data());

      // Check for overlaps
      for (const booking of existingBookings) {
        const bookingStart = new Date(`${booking.date.split('T')[0]}T${booking.time}:00`);
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

        // Check if requested time overlaps with existing booking
        if (
          (requestedStart < bookingEnd && requestedEnd > bookingStart) ||
          (bookingStart < requestedEnd && bookingEnd > requestedStart)
        ) {
          return false; // Overlap found
        }
      }

      return true; // No overlaps found
    } catch (error) {
      throw error;
    }
  }

  static async create(tableData) {
    try {
      // Check if table number already exists for this restaurant
      const existingTableQuery = await db.collection('tables')
        .where('restaurantId', '==', tableData.restaurantId)
        .where('tableNumber', '==', tableData.tableNumber)
        .where('isActive', '==', true)
        .get();

      if (!existingTableQuery.empty) {
        throw new Error('Table number already exists for this restaurant');
      }

      const table = new Table(tableData);
      const data = JSON.parse(JSON.stringify(table));
      const tableRef = await db.collection('tables').add(data);
      
      return {
        id: tableRef.id,
        ...data
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(tableId, updateData) {
    try {
      updateData.updatedAt = new Date().toISOString();
      await db.collection('tables').doc(tableId).update(updateData);
      return await Table.findById(tableId);
    } catch (error) {
      throw error;
    }
  }

  static async delete(tableId) {
    try {
      await db.collection('tables').doc(tableId).update({
        isActive: false,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Table;