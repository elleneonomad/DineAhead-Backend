const { db } = require('../config/firebase');

class Booking {
  constructor(data) {
    this.userId = data.userId; // null if created by merchant for non-registered customer
    this.createdBy = data.createdBy || null; // the actor (user or merchant) who created the booking
    this.restaurantId = data.restaurantId;
    this.tableId = data.tableId;
    this.date = data.date; // ISO date string (YYYY-MM-DD)
    this.time = data.time; // Time string (HH:MM)
    this.duration = data.duration || 120; // minutes
    this.partySize = data.partySize;
    this.status = data.status || 'pending'; // 'pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no-show'
    this.customerInfo = {
      name: data.customerInfo?.name || '',
      phone: data.customerInfo?.phone || '',
      email: data.customerInfo?.email || ''
    };
    this.specialRequests = data.specialRequests || '';
    this.preOrder = data.preOrder || []; // Array of menu item IDs with quantities
    this.totalAmount = data.totalAmount || 0;
    this.paymentStatus = data.paymentStatus || 'pending'; // 'pending', 'paid', 'refunded'
    this.cancellationReason = data.cancellationReason || null;
    this.merchantNotes = data.merchantNotes || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.confirmedAt = data.confirmedAt || null;
    this.cancelledAt = data.cancelledAt || null;
  }

  static async findById(bookingId) {
    try {
      const bookingDoc = await db.collection('bookings').doc(bookingId).get();
      if (!bookingDoc.exists) {
        return null;
      }
      return {
        id: bookingDoc.id,
        ...bookingDoc.data()
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId, filters = {}) {
    try {
      let query = db.collection('bookings').where('userId', '==', userId);

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.upcoming) {
        const now = new Date().toISOString();
        query = query.where('date', '>=', now.split('T')[0]);
      }

      const bookingsQuery = await query.orderBy('date', 'desc').orderBy('time', 'desc').get();
      
      return bookingsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  }

  static async findByRestaurantId(restaurantId, filters = {}) {
    try {
      let query = db.collection('bookings').where('restaurantId', '==', restaurantId);

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      if (filters.date) {
        query = query.where('date', '==', filters.date);
      }

      if (filters.upcoming) {
        const now = new Date().toISOString();
        query = query.where('date', '>=', now.split('T')[0]);
      }

      const bookingsQuery = await query.orderBy('date', 'asc').orderBy('time', 'asc').get();
      
      return bookingsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  }

  static async findByTableId(tableId, date) {
    try {
      let query = db.collection('bookings')
        .where('tableId', '==', tableId)
        .where('status', 'in', ['confirmed', 'pending']);

      if (date) {
        query = query.where('date', '==', date);
      }

      const bookingsQuery = await query.orderBy('date', 'asc').orderBy('time', 'asc').get();
      
      return bookingsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  }

  static async create(bookingData) {
    try {
      const booking = new Booking(bookingData);
      const data = JSON.parse(JSON.stringify(booking));
      const bookingRef = await db.collection('bookings').add(data);
      
      return {
        id: bookingRef.id,
        ...data
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(bookingId, updateData) {
    try {
      updateData.updatedAt = new Date().toISOString();
      
      // Handle status-specific updates
      if (updateData.status === 'confirmed' && !updateData.confirmedAt) {
        updateData.confirmedAt = new Date().toISOString();
      }
      
      if (updateData.status === 'cancelled' && !updateData.cancelledAt) {
        updateData.cancelledAt = new Date().toISOString();
      }

      await db.collection('bookings').doc(bookingId).update(updateData);
      return await Booking.findById(bookingId);
    } catch (error) {
      throw error;
    }
  }

  static async cancel(bookingId, reason, cancelledBy) {
    try {
      const updateData = {
        status: 'cancelled',
        cancellationReason: reason,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (cancelledBy === 'merchant') {
        updateData.merchantNotes = updateData.merchantNotes || '' + `\nCancelled by merchant: ${reason}`;
      }

      await db.collection('bookings').doc(bookingId).update(updateData);
      return await Booking.findById(bookingId);
    } catch (error) {
      throw error;
    }
  }

  static async getAvailableTimeSlots(restaurantId, tableId, date, duration = 120) {
    try {
      // Get table information
      const tableDoc = await db.collection('tables').doc(tableId).get();
      if (!tableDoc.exists) {
        throw new Error('Table not found');
      }
      const tableData = tableDoc.data();
      
      // Use table's maxBookingDuration as the increment between slots
      const slotIncrement = tableData.maxBookingDuration || 180;
      
      // Get restaurant business hours for the day
      const restaurant = await db.collection('restaurants').doc(restaurantId).get();
      if (!restaurant.exists) {
        throw new Error('Restaurant not found');
      }

      const restaurantData = restaurant.data();
      
      // Parse date string directly to avoid timezone issues
      // date format: YYYY-MM-DD
      const [year, month, day] = date.split('-').map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const dayIndex = dateObj.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
      
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[dayIndex];
      
      const businessHours = restaurantData.businessHours[dayName];

      console.log('Debug getAvailableTimeSlots:', {
        date,
        dayName,
        businessHours,
        slotIncrement,
        duration
      });

      if (!businessHours || !businessHours.isOpen) {
        console.log('Restaurant is closed on', dayName);
        return { 
          availableSlots: [], 
          reason: 'closed',
          message: `Restaurant is closed on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}`,
          dayName,
          businessHours: businessHours || { isOpen: false }
        };
      }

      // Generate possible time slots starting from open time, incrementing by maxBookingDuration
      const openTime = businessHours.open; // e.g., "09:00"
      const closeTime = businessHours.close; // e.g., "22:00"
      
      // Get all existing bookings for this table on this date
      const bookingsQuery = await db.collection('bookings')
        .where('tableId', '==', tableId)
        .where('date', '==', date)
        .where('status', 'in', ['confirmed', 'pending'])
        .get();
      
      const existingBookings = bookingsQuery.docs.map(doc => ({
        time: doc.data().time,
        duration: doc.data().duration
      }));
      
      const availableSlots = [];
      let currentTime = openTime;
      
      console.log('Generating slots from', openTime, 'to', closeTime, 'with increment:', slotIncrement);
      console.log('Existing bookings:', existingBookings);
      
      while (currentTime < closeTime) {
        // Check if slot + duration fits within business hours
        const slotEnd = this.addMinutesToTime(currentTime, duration);
        
        if (slotEnd <= closeTime) {
          // Check if this slot overlaps with any existing booking
          const hasOverlap = existingBookings.some(booking => {
            const requestedStart = this.timeToMinutes(currentTime);
            const requestedEnd = requestedStart + duration;
            const bookingStart = this.timeToMinutes(booking.time);
            const bookingEnd = bookingStart + booking.duration;
            
            // Check for overlap
            return (requestedStart < bookingEnd && requestedEnd > bookingStart);
          });
          
          if (!hasOverlap) {
            availableSlots.push(currentTime);
            console.log('Added slot:', currentTime, '- slotEnd:', slotEnd);
          } else {
            console.log('Slot', currentTime, 'has overlap');
          }
        } else {
          console.log('Slot', currentTime, 'end time', slotEnd, 'exceeds close time', closeTime);
        }
        
        // Move to next slot by incrementing by maxBookingDuration
        currentTime = this.addMinutesToTime(currentTime, slotIncrement);
      }

      console.log('Total available slots:', availableSlots.length);
      
      return {
        availableSlots,
        reason: availableSlots.length > 0 ? 'success' : 'no_slots',
        message: availableSlots.length > 0 
          ? `Found ${availableSlots.length} available time slot(s)` 
          : 'No available time slots for the requested duration',
        dayName,
        businessHours: {
          open: openTime,
          close: closeTime,
          isOpen: true
        },
        slotIncrement,
        requestedDuration: duration,
        existingBookingsCount: existingBookings.length
      };
    } catch (error) {
      throw error;
    }
  }

  static async isSlotAvailable(tableId, date, time, duration) {
    try {
      const requestedStart = new Date(`${date}T${time}:00`);
      const requestedEnd = new Date(requestedStart.getTime() + duration * 60000);

      const bookingsQuery = await db.collection('bookings')
        .where('tableId', '==', tableId)
        .where('date', '==', date)
        .where('status', 'in', ['confirmed', 'pending'])
        .get();

      const existingBookings = bookingsQuery.docs.map(doc => doc.data());

      for (const booking of existingBookings) {
        const bookingStart = new Date(`${booking.date}T${booking.time}:00`);
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);

        // Check for overlap
        if (
          (requestedStart < bookingEnd && requestedEnd > bookingStart) ||
          (bookingStart < requestedEnd && bookingEnd > requestedStart)
        ) {
          return false;
        }
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  static addMinutesToTime(timeString, minutes) {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }

  static timeToMinutes(timeString) {
    const [hours, mins] = timeString.split(':').map(Number);
    return hours * 60 + mins;
  }
}

module.exports = Booking;
