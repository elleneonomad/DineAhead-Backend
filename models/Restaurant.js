const { db } = require('../config/firebase');

class Restaurant {
  constructor(data) {
    this.merchantId = data.merchantId;
    this.name = data.name;
    this.description = data.description;
    this.address = data.address;
    this.phone = data.phone;
    this.email = data.email;
    this.cuisine = data.cuisine || [];
    this.priceRange = data.priceRange; // 'budget', 'mid-range', 'fine-dining'

    // New top-level fields
    this.restaurantType = data.restaurantType || null; // 'Café' | 'Fine Dining' | 'Fast Food' | 'Buffet'
    this.coverImage = data.coverImage || null; // URL string

    this.images = data.images || [];

    // Social & web presence
    this.socialMedia = {
      facebookUrl: data.socialMedia?.facebookUrl || null,
      instagramUrl: data.socialMedia?.instagramUrl || null,
      websiteUrl: data.socialMedia?.websiteUrl || null
    };

    // Location info
    this.location = {
      provinceCode: data.location?.provinceCode || null,
      districtCode: data.location?.districtCode || null,
      latitude: typeof data.location?.latitude === 'number' ? data.location.latitude : null,
      longitude: typeof data.location?.longitude === 'number' ? data.location.longitude : null,
      googleMapsLink: data.location?.googleMapsLink || null
    };

    // Policies (extended)
    this.policies = {
      cancellationPolicy: data.policies?.cancellationPolicy || 'flexible',
      advanceBookingDays: data.policies?.advanceBookingDays || 30,
      minBookingHours: data.policies?.minBookingHours || 2,
      maxPartySize: data.policies?.maxPartySize || 10,
      allowsCancellation: data.policies?.allowsCancellation !== undefined ? data.policies.allowsCancellation : true,
      petFriendly: data.policies?.petFriendly !== undefined ? data.policies.petFriendly : false,
      smokingAllowed: data.policies?.smokingAllowed !== undefined ? data.policies.smokingAllowed : false,
      smokingArea: data.policies?.smokingArea !== undefined ? data.policies.smokingArea : false,
      outdoorSeating: data.policies?.outdoorSeating !== undefined ? data.policies.outdoorSeating : false
    };

    // Parking
    this.parking = {
      available: data.parking?.available !== undefined ? data.parking.available : false,
      feeApplies: data.parking?.feeApplies !== undefined ? data.parking.feeApplies : false,
      type: data.parking?.type || null // 'Street' | 'Private Lot' | 'Valet'
    };

    // Payment options
    this.payment = {
      cash: data.payment?.cash !== undefined ? data.payment.cash : true,
      creditCard: data.payment?.creditCard !== undefined ? data.payment.creditCard : true,
      mobilePayment: data.payment?.mobilePayment !== undefined ? data.payment.mobilePayment : false
    };

    // Deposit policy
    this.deposit = {
      required: data.deposit?.required !== undefined ? data.deposit.required : false,
      percent: typeof data.deposit?.percent === 'number' ? data.deposit.percent : 0
    };

    // Cancellation policy (additional)
    this.cancellation = {
      allowFreeCancel: data.cancellation?.allowFreeCancel !== undefined ? data.cancellation.allowFreeCancel : true,
      cancelBeforeHours: typeof data.cancellation?.cancelBeforeHours === 'number' ? data.cancellation.cancelBeforeHours : 2
    };

    // Rewards
    this.rewards = {
      onShowUp: data.rewards?.onShowUp !== undefined ? data.rewards.onShowUp : false,
      description: data.rewards?.description || ''
    };

    // Notifications
    this.notifications = {
      bookingAlerts: data.notifications?.bookingAlerts !== undefined ? data.notifications.bookingAlerts : true,
      cancellationAlerts: data.notifications?.cancellationAlerts !== undefined ? data.notifications.cancellationAlerts : true
    };

    this.businessHours = {
      monday: data.businessHours?.monday || { open: '09:00', close: '22:00', isOpen: true },
      tuesday: data.businessHours?.tuesday || { open: '09:00', close: '22:00', isOpen: true },
      wednesday: data.businessHours?.wednesday || { open: '09:00', close: '22:00', isOpen: true },
      thursday: data.businessHours?.thursday || { open: '09:00', close: '22:00', isOpen: true },
      friday: data.businessHours?.friday || { open: '09:00', close: '23:00', isOpen: true },
      saturday: data.businessHours?.saturday || { open: '09:00', close: '23:00', isOpen: true },
      sunday: data.businessHours?.sunday || { open: '10:00', close: '21:00', isOpen: true }
    };
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.rating = data.rating || 0;
    this.totalReviews = data.totalReviews || 0;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async findByMerchantId(merchantId) {
    try {
      const restaurantQuery = await db.collection('restaurants').where('merchantId', '==', merchantId).get();
      if (restaurantQuery.empty) {
        return null;
      }
      const restaurantDoc = restaurantQuery.docs[0];
      return {
        id: restaurantDoc.id,
        ...restaurantDoc.data()
      };
    } catch (error) {
      throw error;
    }
  }

  static async findById(restaurantId) {
    try {
      const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
      if (!restaurantDoc.exists) {
        return null;
      }
      return {
        id: restaurantDoc.id,
        ...restaurantDoc.data()
      };
    } catch (error) {
      throw error;
    }
  }

  static async findAll(filters = {}) {
    try {
      let query = db.collection('restaurants').where('isActive', '==', true);
      
      if (filters.cuisine) {
        query = query.where('cuisine', 'array-contains', filters.cuisine);
      }
      
      if (filters.priceRange) {
        query = query.where('priceRange', '==', filters.priceRange);
      }

      const restaurantsQuery = await query.get();
      
      return restaurantsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  }

  static async create(restaurantData) {
    try {
      // Build instance then convert to plain JSON and strip undefined fields
      const restaurant = new Restaurant(restaurantData);
      const data = JSON.parse(JSON.stringify(restaurant));

      const restaurantRef = await db.collection('restaurants').add(data);
      
      // Update user's restaurant reference
      await db.collection('users').doc(restaurantData.merchantId).update({
        restaurant: restaurantRef.id,
        updatedAt: new Date().toISOString()
      });

      return {
        id: restaurantRef.id,
        ...data
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(restaurantId, updateData) {
    try {
      updateData.updatedAt = new Date().toISOString();
      await db.collection('restaurants').doc(restaurantId).update(updateData);
      return await Restaurant.findById(restaurantId);
    } catch (error) {
      throw error;
    }
  }

  static async delete(restaurantId) {
    try {
      await db.collection('restaurants').doc(restaurantId).update({
        isActive: false,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Restaurant;