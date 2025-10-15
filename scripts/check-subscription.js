#!/usr/bin/env node

/**
 * Check subscription status for a user
 * Usage: node scripts/check-subscription.js <userId>
 */

require('dotenv').config();
const { db } = require('../config/firebase');

async function checkSubscription(userId) {
  try {
    console.log(`🔍 Looking up subscription for user: ${userId}\n`);
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    const userData = userDoc.data();
    const subscription = userData.subscription;
    
    if (!subscription) {
      console.log('⚠️  No subscription data found for this user');
      console.log('💡 This user needs subscription data initialized');
      process.exit(0);
    }
    
    // Display subscription info
    console.log('📊 Subscription Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎯 Tier:          ${subscription.tier || 'N/A'}`);
    console.log(`✅ Active:        ${subscription.isActive !== false ? 'Yes' : 'No'}`);
    console.log(`📅 Start Date:    ${subscription.startDate || 'N/A'}`);
    console.log(`📅 Expiry Date:   ${subscription.expiryDate || 'N/A'}`);
    console.log(`🔢 Menu Limit:    ${subscription.menuItemLimit || 'N/A'}`);
    console.log(`👤 Customer ID:   ${subscription.stripeCustomerId || 'N/A'}`);
    console.log(`📝 Subscription:  ${subscription.stripeSubscriptionId || 'N/A'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Show full JSON
    console.log('📄 Full Subscription Data:');
    console.log(JSON.stringify(subscription, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get userId from command line
const userId = process.argv[2];

if (!userId) {
  console.error('❌ Usage: node scripts/check-subscription.js <userId>');
  console.error('\nExample:');
  console.error('  node scripts/check-subscription.js abc123xyz789');
  process.exit(1);
}

checkSubscription(userId);
