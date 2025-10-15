const stripe = require('../config/stripe');
const { db } = require('../config/firebase');

/**
 * Handle Stripe webhook events
 * POST /api/webhook/stripe
 * 
 * This endpoint receives webhook events from Stripe to keep subscription state in sync.
 * It must be registered in Stripe Dashboard and use raw body for signature verification.
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  let event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  console.log(`Received webhook event: ${event.type}`);
  
  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle checkout.session.completed event
 * Activates Pro subscription when checkout is successful
 */
async function handleCheckoutCompleted(session) {
  try {
    const firebaseUid = session.metadata.firebaseUid;
    const subscriptionId = session.subscription;
    
    if (!firebaseUid || !subscriptionId) {
      console.error('Missing firebaseUid or subscriptionId in checkout session');
      return;
    }
    
    // Fetch full subscription details from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Update user subscription in Firebase
    await db.collection('users').doc(firebaseUid).update({
      'subscription.tier': 'pro',
      'subscription.isActive': true,
      'subscription.stripeSubscriptionId': subscriptionId,
      'subscription.startDate': new Date(subscription.current_period_start * 1000).toISOString(),
      'subscription.expiryDate': new Date(subscription.current_period_end * 1000).toISOString(),
      'subscription.menuItemLimit': 999999,
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`Pro subscription activated for user ${firebaseUid}`);
  } catch (error) {
    console.error('Error handling checkout completed:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.updated event
 * Updates subscription status when it changes
 */
async function handleSubscriptionUpdated(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Find user by Stripe customer ID
    const usersSnapshot = await db.collection('users')
      .where('subscription.stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.error(`No user found for Stripe customer: ${customerId}`);
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const isActive = subscription.status === 'active';
    
    // Update subscription status
    await userDoc.ref.update({
      'subscription.isActive': isActive,
      'subscription.tier': isActive ? 'pro' : 'free',
      'subscription.expiryDate': new Date(subscription.current_period_end * 1000).toISOString(),
      'subscription.menuItemLimit': isActive ? 999999 : 5,
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`Subscription updated for customer ${customerId} - Status: ${subscription.status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
    throw error;
  }
}

/**
 * Handle customer.subscription.deleted event
 * Downgrades user to free tier when subscription is cancelled/deleted
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const customerId = subscription.customer;
    
    // Find user by Stripe customer ID
    const usersSnapshot = await db.collection('users')
      .where('subscription.stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    
    if (usersSnapshot.empty) {
      console.error(`No user found for Stripe customer: ${customerId}`);
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    
    // Downgrade to free tier
    await userDoc.ref.update({
      'subscription.tier': 'free',
      'subscription.isActive': true,
      'subscription.stripeSubscriptionId': null,
      'subscription.expiryDate': null,
      'subscription.menuItemLimit': 5,
      updatedAt: new Date().toISOString(),
    });
    
    console.log(`Subscription cancelled for customer ${customerId} - Downgraded to free tier`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_succeeded event
 * Logs successful payments (can be extended to send receipts)
 */
async function handlePaymentSucceeded(invoice) {
  try {
    const customerId = invoice.customer;
    const amountPaid = invoice.amount_paid / 100; // Convert from cents
    
    console.log(`Payment succeeded for customer ${customerId} - Amount: $${amountPaid}`);
    
    // Optional: Send receipt email or notification
    // TODO: Implement receipt email logic if needed
  } catch (error) {
    console.error('Error handling payment succeeded:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_failed event
 * Logs failed payments (can be extended to notify user)
 */
async function handlePaymentFailed(invoice) {
  try {
    const customerId = invoice.customer;
    const attemptCount = invoice.attempt_count;
    
    console.log(`Payment failed for customer ${customerId} - Attempt: ${attemptCount}`);
    
    // Optional: Send notification to user about failed payment
    // TODO: Implement user notification logic if needed
    
    // Find user by customer ID
    const usersSnapshot = await db.collection('users')
      .where('subscription.stripeCustomerId', '==', customerId)
      .limit(1)
      .get();
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      console.log(`User ${userDoc.id} has a failed payment - they should update their payment method`);
    }
  } catch (error) {
    console.error('Error handling payment failed:', error);
    throw error;
  }
}
