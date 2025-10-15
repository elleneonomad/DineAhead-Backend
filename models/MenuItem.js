const { db } = require('../config/firebase');

class MenuItem {
  constructor(data) {
    this.restaurantId = data.restaurantId;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.category = data.category; // 'appetizer', 'main', 'dessert', 'beverage', 'special'
    this.images = data.images || [];
    this.ingredients = data.ingredients || [];
    this.allergens = data.allergens || []; // ['nuts', 'dairy', 'gluten', 'shellfish']
    this.dietary = data.dietary || []; // ['vegetarian', 'vegan', 'gluten-free', 'keto']
    this.spicyLevel = data.spicyLevel || 0; // 0-5 scale
    this.preparationTime = data.preparationTime || 15; // minutes
    this.isAvailable = data.isAvailable !== undefined ? data.isAvailable : true;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static async findByRestaurantId(restaurantId, filters = {}) {
    try {
      let query = db.collection('menuItems')
        .where('restaurantId', '==', restaurantId)
        .where('isActive', '==', true);

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.available !== undefined) {
        query = query.where('isAvailable', '==', filters.available);
      }

      const menuItemsQuery = await query.orderBy('category').orderBy('name').get();
      
      return menuItemsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  }

  static async findById(menuItemId) {
    try {
      const menuItemDoc = await db.collection('menuItems').doc(menuItemId).get();
      if (!menuItemDoc.exists) {
        return null;
      }
      return {
        id: menuItemDoc.id,
        ...menuItemDoc.data()
      };
    } catch (error) {
      throw error;
    }
  }

  static async findByIds(menuItemIds) {
    try {
      if (!menuItemIds || menuItemIds.length === 0) {
        return [];
      }

      // Firestore 'in' queries are limited to 10 items
      const chunks = [];
      for (let i = 0; i < menuItemIds.length; i += 10) {
        chunks.push(menuItemIds.slice(i, i + 10));
      }

      const allMenuItems = [];
      
      for (const chunk of chunks) {
        const menuItemsQuery = await db.collection('menuItems')
          .where('__name__', 'in', chunk)
          .get();
        
        const chunkMenuItems = menuItemsQuery.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        allMenuItems.push(...chunkMenuItems);
      }

      return allMenuItems;
    } catch (error) {
      throw error;
    }
  }

  static async create(menuItemData) {
    try {
      const menuItem = new MenuItem(menuItemData);
      const data = JSON.parse(JSON.stringify(menuItem));
      const menuItemRef = await db.collection('menuItems').add(data);
      
      return {
        id: menuItemRef.id,
        ...data
      };
    } catch (error) {
      throw error;
    }
  }

  static async update(menuItemId, updateData) {
    try {
      updateData.updatedAt = new Date().toISOString();
      await db.collection('menuItems').doc(menuItemId).update(updateData);
      return await MenuItem.findById(menuItemId);
    } catch (error) {
      throw error;
    }
  }

  static async delete(menuItemId) {
    try {
      await db.collection('menuItems').doc(menuItemId).update({
        isActive: false,
        updatedAt: new Date().toISOString()
      });
      return true;
    } catch (error) {
      throw error;
    }
  }

  static async updateAvailability(menuItemId, isAvailable) {
    try {
      await db.collection('menuItems').doc(menuItemId).update({
        isAvailable,
        updatedAt: new Date().toISOString()
      });
      return await MenuItem.findById(menuItemId);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = MenuItem;