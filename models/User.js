const { db } = require('../config/firebase');

class User {
  constructor(data) {
    this.email = data.email;
    this.password = data.password;
    this.role = data.role; // 'user' or 'merchant'
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.phone = data.phone;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.lastLogin = data.lastLogin || null;
    
    // Merchant specific fields
    if (this.role === 'merchant') {
      this.restaurant = data.restaurant || null;
      this.isVerified = data.isVerified !== undefined ? data.isVerified : false;
      
      // Subscription fields for merchants
      this.subscription = data.subscription || {
        tier: 'free', // 'free' or 'pro'
        isActive: true,
        startDate: null,
        expiryDate: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        menuItemLimit: 5,
      };
    }
  }

  static async findByEmail(email) {
    try {
      const userQuery = await db.collection('users').where('email', '==', email).get();
      if (userQuery.empty) {
        return null;
      }
      const userDoc = userQuery.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      throw error;
    }
  }

  static async findById(userId) {
    try {
      if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
        return null;
      }
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return null;
      }
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      throw error;
    }
  }

  static async create(userData) {
    try {
      // Expecting userData to include uid when created via Firebase Auth
      if (!userData.uid) {
        throw new Error('User create requires uid from Firebase Auth');
      }
      const { uid, ...rest } = userData;
      const user = new User(rest);
      const data = JSON.parse(JSON.stringify(user));
      await db.collection('users').doc(uid).set(data, { merge: true });
      return {
        id: uid,
        ...data
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(userId, updateData) {
    try {
      updateData.updatedAt = new Date().toISOString();
      await db.collection('users').doc(userId).update(updateData);
      return await User.findById(userId);
    } catch (error) {
      throw error;
    }
  }

  static async delete(userId) {
    try {
      await db.collection('users').doc(userId).update({
        isActive: false,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;