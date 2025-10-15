const { db } = require('../config/firebase');

class Blacklist {
  constructor(data) {
    this.restaurantId = data.restaurantId;
    this.phoneNumber = data.phoneNumber;
    this.reason = data.reason || '';
    this.addedBy = data.addedBy; // merchantId who added this
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Create a new blacklist entry
   */
  static async create(blacklistData) {
    try {
      const blacklist = new Blacklist(blacklistData);
      const data = JSON.parse(JSON.stringify(blacklist));

      const blacklistRef = await db.collection('blacklists').add(data);
      
      return {
        id: blacklistRef.id,
        ...data
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find all blacklisted numbers for a restaurant
   */
  static async findByRestaurantId(restaurantId, includeInactive = false) {
    try {
      let query = db.collection('blacklists').where('restaurantId', '==', restaurantId);
      
      if (!includeInactive) {
        query = query.where('isActive', '==', true);
      }
      
      const blacklistQuery = await query.orderBy('createdAt', 'desc').get();
      
      return blacklistQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find a specific blacklist entry by ID
   */
  static async findById(blacklistId) {
    try {
      const blacklistDoc = await db.collection('blacklists').doc(blacklistId).get();
      
      if (!blacklistDoc.exists) {
        return null;
      }
      
      return {
        id: blacklistDoc.id,
        ...blacklistDoc.data()
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a phone number is blacklisted for a restaurant
   */
  static async isBlacklisted(restaurantId, phoneNumber) {
    try {
      const blacklistQuery = await db.collection('blacklists')
        .where('restaurantId', '==', restaurantId)
        .where('phoneNumber', '==', phoneNumber)
        .where('isActive', '==', true)
        .get();
      
      return !blacklistQuery.empty;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find blacklist entry by phone number and restaurant
   */
  static async findByPhoneNumber(restaurantId, phoneNumber) {
    try {
      const blacklistQuery = await db.collection('blacklists')
        .where('restaurantId', '==', restaurantId)
        .where('phoneNumber', '==', phoneNumber)
        .where('isActive', '==', true)
        .get();
      
      if (blacklistQuery.empty) {
        return null;
      }
      
      const doc = blacklistQuery.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a blacklist entry
   */
  static async update(blacklistId, updateData) {
    try {
      updateData.updatedAt = new Date().toISOString();
      await db.collection('blacklists').doc(blacklistId).update(updateData);
      return await Blacklist.findById(blacklistId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete (soft delete) a blacklist entry
   */
  static async delete(blacklistId) {
    try {
      await db.collection('blacklists').doc(blacklistId).update({
        isActive: false,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Permanently delete a blacklist entry
   */
  static async permanentDelete(blacklistId) {
    try {
      await db.collection('blacklists').doc(blacklistId).delete();
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Blacklist;
