import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Linking, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { API_BASE_URL } from '../constants/config';
import {
  subscribeViaGooglePlay,
  restorePurchases,
  isGooglePlayBillingAvailable,
} from '../lib/googlePlayBilling';
import { logEvent, AnalyticsEvents, logScreenView } from '../lib/analytics';

const PLANS = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$29',
    period: '/mo',
    color: Colors.neonBlue,
    gradient: Gradients.blue,
    features: [
      'Solo 401(k) calculator',
      'QBI / Section 199A',
      'Home office deduction',
      'Vehicle deduction',
      'HSA max contribution',
      '7-day free trial',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$79',
    period: '/mo',
    color: Colors.neonPink,
    gradient: Gradients.pink,
    badge: 'Most Popular',
    features: [
      'Everything in Basic',
      'S-Corp election calculator',
      'Hire your kids strategy',
      'Augusta Rule (14-day rental)',
      'Accountable plan',
      '7-day free trial',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$149',
    period: '/mo',
    color: Colors.gold,
    gradient: Gradients.gold,
    features: [
      'All 10 strategies',
      'Tax-loss harvesting',
      '1-on-1 with Theia Willis',
      'Custom tax plan',
      'Audit protection',
      '7-day free trial',
    ],
  },
];

export default function Pricing({ navigation }) {
  const [selected, setSelected] = useState('pro');
  const [loading,  setLoading]  = useState(false);
  const [userId,   setUserId]   = useState(null);

  // Detect if we should use Google Play Billing (Android) or Stripe (iOS)
  const useGooglePlayBilling = isGooglePlayBillingAvailable();

  useEffect(() => {
    logScreenView('Pricing');
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  const handleSubscribe = async (planId) => {
    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in before subscribing.');
      return;
    }

    setLoading(true);
    logEvent(AnalyticsEvents.SUBSCRIPTION_STARTED, { tier: planId, platform: Platform.OS });

    try {
      if (useGooglePlayBilling) {
        // Android: use Google Play Billing
        await subscribeViaGooglePlay(planId);
        // Purchase listener in googlePlayBilling.js handles verification + tier upgrade
      } else {
        // iOS / Web: use Stripe checkout
        const res = await fetch(`${API_BASE_URL}/stripe/checkout`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tier:         planId,
            user_id:      userId,
            success_url:  'moresimpletax://success',
            cancel_url:   'moresimpletax://pricing',
          }),
        });
        const data = await res.json();
        if (data.url) {
          await Linking.openURL(data.url);
        } else {
          Alert.alert('Error', data.error || 'Could not create checkout session.');
        }
      }
    } catch (error) {
      Alert.alert('Subscription Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!useGooglePlayBilling) return;
    setLoading(true);
    try {
      const purchases = await restorePurchases();
      if (!purchases || purchases.length === 0) {
        Alert.alert('No purchases found', 'There are no previous purchases to restore.');
      }
    } catch (error) {
      Alert.alert('Restore failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={Gradients.hero} style={styles.header}>
        <Text style={styles.headerTitle}>Unlock Your Full Savings</Text>
        <Text style={styles.headerSub}>7-day free trial · Cancel anytime</Text>
        <View style={styles.trialBadge}>
          <MaterialCommunityIcons name="gift-outline" size={16} color={Colors.gold} />
          <Text style={styles.trialText}>No credit card charged for 7 days</Text>
        </View>
      </LinearGradient>

      <View style={styles.plans}>
        {PLANS.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.card,
              selected === plan.id && styles.cardSelected,
              selected === plan.id && { borderColor: plan.color },
            ]}
            onPress={() => setSelected(plan.id)}
            activeOpacity={0.85}
          >
            {plan.badge && (
              <View style={[styles.badge, { backgroundColor: plan.color }]}>
                <Text style={styles.badgeText}>{plan.badge}</Text>
              </View>
            )}
            <View style={styles.cardTop}>
              <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{plan.price}</Text>
                <Text style={styles.period}>{plan.period}</Text>
              </View>
            </View>
            {plan.features.map(f => (
              <View key={f} style={styles.featureRow}>
                <MaterialCommunityIcons name="check-circle" size={18} color={plan.color} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
            {selected === plan.id && (
              <TouchableOpacity
                style={[styles.subscribeBtn, { backgroundColor: plan.color }]}
                onPress={() => handleSubscribe(plan.id)}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.subscribeBtnText}>Start Free Trial → {plan.name}</Text>
                }
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Restore purchases button (Android only — required by Google Play policy) */}
      {useGooglePlayBilling && (
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestorePurchases}
          disabled={loading}
        >
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>
      )}

      {/* Test card info — remove before production go-live (iOS only) */}
      {!useGooglePlayBilling && (
        <View style={styles.testCard}>
          <Text style={styles.testCardText}>
            🧪 Test: 4242 4242 4242 4242 · Any expiry · Any CVC
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  header:           { padding: 32, paddingTop: 60, alignItems: 'center' },
  headerTitle:      { fontSize: 28, fontWeight: '900', color: '#fff', textAlign: 'center' },
  headerSub:        { fontSize: 14, color: Colors.textSecondary, marginTop: 6 },
  trialBadge:       { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(245,197,66,0.15)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  trialText:        { color: Colors.gold, fontSize: 13, marginLeft: 6, fontWeight: '600' },
  plans:            { padding: 16 },
  card:             { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: 'transparent', position: 'relative' },
  cardSelected:     { borderWidth: 2 },
  badge:            { position: 'absolute', top: -10, right: 20, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText:        { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardTop:          { marginBottom: 16 },
  planName:         { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  priceRow:         { flexDirection: 'row', alignItems: 'flex-end' },
  price:            { fontSize: 40, fontWeight: '900', color: Colors.text },
  period:           { fontSize: 16, color: Colors.textSecondary, marginBottom: 6, marginLeft: 4 },
  featureRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  featureText:      { color: Colors.text, marginLeft: 8, fontSize: 14 },
  subscribeBtn:     { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16 },
  subscribeBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  restoreBtn:       { alignItems: 'center', padding: 16, marginHorizontal: 16, marginBottom: 8 },
  restoreText:      { color: Colors.neonBlue, fontSize: 14, fontWeight: '600' },
  testCard:         { margin: 16, padding: 12, backgroundColor: Colors.cardElevated, borderRadius: 10, alignItems: 'center' },
  testCardText:     { color: Colors.textSecondary, fontSize: 12 },
});
