/**
 * Google Sign-In Module
 * Handles "Continue with Google" authentication on Android.
 * Uses @react-native-google-signin/google-signin (requires custom dev client / EAS build).
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';

let GoogleSignin = null;

if (Platform.OS === 'android' || Platform.OS === 'ios') {
  try {
    GoogleSignin = require('@react-native-google-signin/google-signin').default;
  } catch (e) {
    console.warn('[GoogleSignIn] Module not available in this environment');
  }
}

/**
 * Configure Google Sign-In with your web client ID.
 * Call this on app launch.
 * @param {string} webClientId - Google Cloud web client ID (OAuth 2.0)
 */
export function configureGoogleSignIn(webClientId) {
  if (!GoogleSignin) return;

  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
    accountName: '',
    iosClientId: '',
    scopes: ['profile', 'email'],
  });
  console.log('[GoogleSignIn] Configured');
}

/**
 * Check if Google Sign-In is available on this device.
 */
export async function isGoogleSignInAvailable() {
  if (!GoogleSignin) return false;
  try {
    return await GoogleSignin.hasPlayServices();
  } catch {
    return false;
  }
}

/**
 * Sign in with Google and link to Supabase auth.
 * Returns the Supabase session on success.
 */
export async function signInWithGoogle() {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In is not available on this platform');
  }

  try {
    // Check Play Services
    await GoogleSignin.hasPlayServices();

    // Get user info from Google
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.idToken || userInfo.data?.idToken;

    if (!idToken) {
      throw new Error('No ID token returned from Google');
    }

    // Sign in to Supabase with Google OAuth
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      throw new Error(`Supabase auth failed: ${error.message}`);
    }

    console.log('[GoogleSignIn] Success — user:', data.user?.email);
    return { user: data.user, session: data.session };
  } catch (error) {
    console.error('[GoogleSignIn] Failed:', error);
    throw error;
  }
}

/**
 * Sign out of Google.
 */
export async function signOutGoogle() {
  if (!GoogleSignin) return;
  try {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
  } catch (e) {
    console.warn('[GoogleSignIn] Sign out failed:', e);
  }
}
