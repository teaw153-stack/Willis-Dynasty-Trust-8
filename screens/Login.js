import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Colors, Gradients } from '../constants/Colors';
import { signInWithGoogle, configureGoogleSignIn, isGoogleSignInAvailable } from '../lib/googleSignIn';
import { logEvent, AnalyticsEvents, logScreenView } from '../lib/analytics';
import Constants from 'expo-constants';

export default function Login({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);

  useEffect(() => {
    logScreenView('Login');

    // Configure Google Sign-In with web client ID from app.json extra
    const webClientId = Constants.expoConfig?.extra?.googleWebClientId;
    if (webClientId && webClientId !== 'YOUR_GOOGLE_WEB_CLIENT_ID') {
      configureGoogleSignIn(webClientId);
      isGoogleSignInAvailable().then(setGoogleAvailable);
    }
  }, []);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Please fill in all fields');
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Login failed', error.message);
    else logEvent(AnalyticsEvents.LOGIN, { method: 'email' });
  };

  const handleSignUp = async () => {
    if (!email || !password) return Alert.alert('Please fill in all fields');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) Alert.alert('Sign up failed', error.message);
    else {
      logEvent(AnalyticsEvents.SIGN_UP, { method: 'email' });
      Alert.alert('Check your email', 'Click the confirmation link to activate your account.');
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { user } = await signInWithGoogle();
      if (user) {
        logEvent(AnalyticsEvents.GOOGLE_SIGN_IN, { user_id: user.id });
      }
    } catch (error) {
      Alert.alert('Google Sign-In failed', error.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <LinearGradient colors={Gradients.hero} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>More Simple Tax</Text>
        <Text style={styles.sub}>Built by Theia Willis, CTEC #A123456</Text>

        {/* Google Sign-In Button (Android) */}
        {googleAvailable && (
          <>
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <>
                  <View style={styles.googleIcon}>
                    <Text style={styles.googleIconText}>G</Text>
                  </View>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, styles.btnPrimary, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Loading…' : 'Sign In'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnSecondary]}
          onPress={handleSignUp}
          disabled={loading}
        >
          <Text style={[styles.btnText, { color: Colors.neonBlue }]}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  inner:         { flex: 1, justifyContent: 'center', padding: 32 },
  logo:          { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  sub:           { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 48 },
  googleBtn:     {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  googleIcon:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  googleIconText:{ color: '#fff', fontSize: 18, fontWeight: '900' },
  googleBtnText: { color: '#333', fontWeight: '700', fontSize: 16 },
  divider:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText:   { color: Colors.textSecondary, fontSize: 13, marginHorizontal: 12 },
  input:         {
    backgroundColor: Colors.card, borderRadius: 12, padding: 16, color: Colors.text,
    marginBottom: 12, borderWidth: 1, borderColor: Colors.border, fontSize: 16,
  },
  btn:           { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnPrimary:    { backgroundColor: Colors.neonPink },
  btnSecondary:  { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.neonBlue },
  btnDisabled:   { opacity: 0.5 },
  btnText:       { color: '#fff', fontWeight: '700', fontSize: 16 },
});
