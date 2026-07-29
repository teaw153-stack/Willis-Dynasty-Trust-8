import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Colors, Gradients } from '../constants/Colors';

export default function Login({ navigation }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Please fill in all fields');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert('Login failed', error.message);
  };

  const handleSignUp = async () => {
    if (!email || !password) return Alert.alert('Please fill in all fields');
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) Alert.alert('Sign up failed', error.message);
    else Alert.alert('Check your email', 'Click the confirmation link to activate your account.');
  };

  return (
    <LinearGradient colors={Gradients.hero} style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.logo}>More Simple Tax</Text>
        <Text style={styles.sub}>Built by Theia Willis, CTEC #A123456</Text>

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
  container:   { flex: 1 },
  inner:       { flex: 1, justifyContent: 'center', padding: 32 },
  logo:        { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  sub:         { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 48 },
  input:       {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    color: Colors.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
  },
  btn:         { borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  btnPrimary:  { backgroundColor: Colors.neonPink },
  btnSecondary:{ backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.neonBlue },
  btnDisabled: { opacity: 0.5 },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
});
