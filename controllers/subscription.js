const stripe = require('../config/stripe');
const { db } = require('../config/firebase');

/**
 * Get subscription status for the authenticated merchant
 * GET /api/subscription/status
 */
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    const userData = userDoc.data();
    
    // Get subscription data or use defaults, ensuring all fields are present
    const rawSubscription = userData.subscription || {};
    
    // Build complete subscription object with all required fields
    const subscription = {
      tier: rawSubscription.tier || 'free',
      isActive: rawSubscription.isActive !== undefined ? rawSubscription.isActive : true,
      startDate: rawSubscription.startDate || null,
      expiryDate: rawSubscription.expiryDate || null,
      stripeCustomerId: rawSubscription.stripeCustomerId || null,
      stripeSubscriptionId: rawSubscription.stripeSubscriptionId || null,
      menuItemLimit: rawSubscription.menuItemLimit || (rawSubscription.tier === 'pro' ? 999999 : 5),
    };
    
    return res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create Stripe checkout session for upgrading to Pro
 * POST /api/subscription/create-checkout
 */
exports.createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    const userData = userDoc.data();
    
    // Check if user is already on Pro plan
    if (userData.subscription?.tier === 'pro' && userData.subscription?.isActive) {
      return res.status(400).json({
        success: false,
        message: 'You are already subscribed to the Pro plan',
      });
    }
    
    let stripeCustomerId = userData.subscription?.stripeCustomerId;
    
    // Create Stripe customer if doesn't exist
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: userData.email,
        metadata: {
          firebaseUid: userId,
        },
      });
      stripeCustomerId = customer.id;
      
      // Update Firebase with customer ID
      await db.collection('users').doc(userId).update({
        'subscription.stripeCustomerId': stripeCustomerId,
      });
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'dineahead://subscription-success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'dineahead://subscription-cancel',
      metadata: {
        firebaseUid: userId,
      },
    });
    
    return res.json({
      success: true,
      sessionId: session.id,
      sessionUrl: session.url,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Cancel active subscription
 * POST /api/subscription/cancel
 */
exports.cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    const userData = userDoc.data();
    const subscriptionId = userData.subscription?.stripeSubscriptionId;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found',
      });
    }
    
    // Cancel at period end (don't cut off immediately)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    
    return res.json({
      success: true,
      message: 'Subscription will be cancelled at period end',
      data: {
        cancelAt: new Date(subscription.cancel_at * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('Subscription cancel error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Reactivate a cancelled subscription (before period end)
 * POST /api/subscription/reactivate
 */
exports.reactivateSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    const userData = userDoc.data();
    const subscriptionId = userData.subscription?.stripeSubscriptionId;
    
    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'No subscription found',
      });
    }
    
    // Remove cancel_at_period_end flag
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    
    return res.json({
      success: true,
      message: 'Subscription reactivated successfully',
    });
  } catch (error) {
    console.error('Subscription reactivate error:', error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
