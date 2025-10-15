#!/usr/bin/env node

/**
 * Manually upgrade a user to Pro tier
 * Usage: node scripts/upgrade-to-pro.js <userId>
 */

require('dotenv').config();
const { db } = require('../config/firebase');

async function upgradeUserToPro(userId) {
  try {
    console.log(`🔍 Looking up user: ${userId}`);
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    const userData = userDoc.data();
    console.log('📋 Current user data:', JSON.stringify(userData, null, 2));
    
    // Calculate dates
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + 1);
    
    // Update subscription to Pro
    await db.collection('users').doc(userId).update({
      'subscription.tier': 'pro',
      'subscription.isActive': true,
      'subscription.startDate': now.toISOString(),
      'subscription.expiryDate': expiryDate.toISOString(),
      'subscription.menuItemLimit': 999999,
      updatedAt: new Date().toISOString(),
    });
    
    console.log('✅ User upgraded to Pro tier!');
    console.log('📅 Start Date:', now.toISOString());
    console.log('📅 Expiry Date:', expiryDate.toISOString());
    console.log('🎯 Menu Item Limit: 999999');
    
    // Verify the update
    const updatedDoc = await db.collection('users').doc(userId).get();
    const updatedData = updatedDoc.data();
    console.log('\n✅ Updated subscription:', JSON.stringify(updatedData.subscription, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get userId from command line
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Usage: node scripts/upgrade-to-pro.js <userId>');
  process.exit(1);
}

upgradeUserToPro(userId);
