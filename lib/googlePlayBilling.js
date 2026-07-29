/**
 * Google Play Billing Module
 * Handles in-app subscription purchases through Google Play Store on Android.
 * Replaces Stripe checkout flow on Android — Google takes 15-30% cut.
 */

import { Platform } from 'react-native';
import * as InAppPurchases from 'react-native-iap';

// Google Play product IDs (must match what you create in Play Console)
export const GOOGLE_PLAY_PRODUCTS = {
  basic:    'com.moresimpletax.app.basic_monthly',
  pro:      'com.moresimpletax.app.pro_monthly',
  premium:  'com.moresimpletax.app.premium_monthly',
};

const SUBSCRIPTION_SKUS = Object.values(GOOGLE_PLAY_PRODUCTS);

let purchaseListener = null;
let isInitialized = false;

/**
 * Initialize Google Play Billing connection.
 * Call this on app launch (Android only).
 */
export async function initGooglePlayBilling() {
  if (Platform.OS !== 'android' || isInitialized) return;

  try {
    await InAppPurchases.initConnection();
    isInitialized = true;
    console.log('[GooglePlayBilling] Connection initialized');

    // Load available subscriptions
    const subscriptions = await InAppPurchases.getSubscriptions({ skus: SUBSCRIPTION_SKUS });
    console.log('[GooglePlayBilling] Available subscriptions:', subscriptions);
  } catch (error) {
    console.error('[GooglePlayBilling] Init failed:', error);
  }
}

/**
 * Set up purchase listener — call after init.
 * @param {Function} onSuccess - called with { tier, purchaseToken, productId } on successful purchase
 */
export function setupPurchaseListener(onSuccess) {
  if (Platform.OS !== 'android') return;

  purchaseListener = InAppPurchases.purchaseUpdatedListener(async (purchase) => {
    console.log('[GooglePlayBilling] Purchase updated:', purchase);

    for (const item of purchase) {
      if (item.productId) {
        // Determine tier from product ID
        const tier = Object.keys(GOOGLE_PLAY_PRODUCTS).find(
          (key) => GOOGLE_PLAY_PRODUCTS[key] === item.productId
        );

        if (tier) {
          // Acknowledge the purchase with Google Play
          try {
            await InAppPurchases.acknowledgePurchaseAndroid({
              token: item.purchaseToken,
            });
            console.log('[GooglePlayBilling] Purchase acknowledged:', tier);

            // Verify with backend
            const verified = await verifyPurchaseWithBackend(
              tier,
              item.purchaseToken,
              item.productId,
              item.originalTransactionIdentifierIOS || item.transactionId
            );

            if (verified) {
              onSuccess({ tier, purchaseToken: item.purchaseToken, productId: item.productId });
            }
          } catch (error) {
            console.error('[GooglePlayBilling] Acknowledge failed:', error);
          }
        }

        // Finish the transaction
        try {
          await InAppPurchases.finishTransaction({ purchase: item, isConsumable: false });
        } catch (e) {
          console.error('[GooglePlayBilling] Finish transaction failed:', e);
        }
      }
    }
  });

  InAppPurchases.purchaseErrorListener((error) => {
    console.error('[GooglePlayBilling] Purchase error:', error);
    if (error.code !== 'E_USER_CANCELED') {
      // Don't show error for user-initiated cancellation
    }
  });
}

/**
 * Subscribe to a plan via Google Play Billing.
 * @param {string} tier - 'basic' | 'pro' | 'premium'
 */
export async function subscribeViaGooglePlay(tier) {
  if (Platform.OS !== 'android') {
    throw new Error('Google Play Billing is only available on Android');
  }

  const productId = GOOGLE_PLAY_PRODUCTS[tier];
  if (!productId) {
    throw new Error(`Unknown tier: ${tier}`);
  }

  try {
    await InAppPurchases.requestSubscription({ sku: productId, subscriptionOffers: [{ sku: productId, offerToken: '' }] });
  } catch (error) {
    console.error('[GooglePlayBilling] Subscribe failed:', error);
    throw error;
  }
}

/**
 * Restore previous purchases (required by Google Play policy).
 */
export async function restorePurchases() {
  if (Platform.OS !== 'android') return null;

  try {
    const purchases = await InAppPurchases.getAvailablePurchases();
    console.log('[GooglePlayBilling] Restored purchases:', purchases);
    return purchases;
  } catch (error) {
    console.error('[GooglePlayBilling] Restore failed:', error);
    return null;
  }
}

/**
 * Verify purchase with backend — backend confirms with Google Play Developer API
 * and updates Supabase subscription tier.
 */
async function verifyPurchaseWithBackend(tier, purchaseToken, productId, transactionId) {
  try {
    const { API_BASE_URL } = require('../constants/config');
    const response = await fetch(`${API_BASE_URL}/google/verify-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier,
        purchase_token: purchaseToken,
        product_id: productId,
        transaction_id: transactionId,
      }),
    });
    const data = await response.json();
    return data.verified === true;
  } catch (error) {
    console.error('[GooglePlayBilling] Backend verification failed:', error);
    return false;
  }
}

/**
 * Check if Google Play Billing is available (Android only).
 */
export function isGooglePlayBillingAvailable() {
  return Platform.OS === 'android';
}

/**
 * Clean up — call on app unmount.
 */
export function cleanupGooglePlayBilling() {
  if (purchaseListener) {
    purchaseListener.remove();
    purchaseListener = null;
  }
  if (isInitialized) {
    InAppPurchases.endConnection();
    isInitialized = false;
  }
}
