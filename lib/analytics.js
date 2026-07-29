/**
 * Firebase Analytics Module
 * Tracks user events, screen views, and app lifecycle for Android.
 * Uses @react-native-firebase/analytics (requires custom dev client / EAS build).
 */

import { Platform } from 'react-native';

let analytics = null;
let crashlytics = null;

// Only import Firebase on native — avoids crashes on web/Expo Go
if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    analytics = require('@react-native-firebase/analytics').default;
    crashlytics = require('@react-native-firebase/crashlytics').default;
  } catch (e) {
    console.warn('[Analytics] Firebase not available in this environment');
  }
}

/**
 * Log a custom analytics event.
 * @param {string} name - Event name (e.g. 'strategy_viewed', 'subscription_started')
 * @param {object} params - Event parameters
 */
export async function logEvent(name, params = {}) {
  if (!analytics) return;
  try {
    await analytics().logEvent(name, params);
    console.log(`[Analytics] ${name}`, params);
  } catch (e) {
    console.warn('[Analytics] logEvent failed:', e);
  }
}

/**
 * Track screen view (call on each screen mount).
 * @param {string} screenName - e.g. 'Dashboard', 'Pricing', 'StrategyDetail'
 */
export async function logScreenView(screenName) {
  if (!analytics) return;
  try {
    await analytics().logScreenView({ screen_name: screenName, screen_class: screenName });
  } catch (e) {
    console.warn('[Analytics] logScreenView failed:', e);
  }
}

/**
 * Set user ID for analytics tracking (after login).
 * @param {string} userId - Supabase user UUID
 */
export async function setUserId(userId) {
  if (!analytics) return;
  try {
    await analytics().setUserId(userId);
  } catch (e) {
    console.warn('[Analytics] setUserId failed:', e);
  }
}

/**
 * Set user properties (e.g. subscription tier).
 * @param {object} props - { subscription_tier: 'premium', business_type: 'llc', ... }
 */
export async function setUserProperties(props) {
  if (!analytics) return;
  try {
    for (const [key, value] of Object.entries(props)) {
      await analytics().setUserProperty(key, String(value));
    }
  } catch (e) {
    console.warn('[Analytics] setUserProperties failed:', e);
  }
}

/**
 * Record a non-fatal error to Crashlytics.
 * @param {Error} error
 */
export function recordError(error) {
  if (!crashlytics) return;
  try {
    crashlytics().recordError(error);
  } catch (e) {
    console.warn('[Analytics] recordError failed:', e);
  }
}

/**
 * Track subscription events.
 */
export const AnalyticsEvents = {
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  SUBSCRIPTION_STARTED: 'subscription_started',
  SUBSCRIPTION_SUCCESS: 'subscription_success',
  SUBSCRIPTION_CANCELED: 'subscription_canceled',
  STRATEGY_VIEWED: 'strategy_viewed',
  CALCULATOR_USED: 'calculator_used',
  PROFILE_UPDATED: 'profile_updated',
  GOOGLE_SIGN_IN: 'google_sign_in',
  TRIAL_STARTED: 'trial_started',
};
