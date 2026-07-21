import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert,
  TouchableOpacity, Linking, ActivityIndicator
} from 'react-native';
import { Card, Button, Divider, Chip } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Colors, Gradients } from '../constants/Colors';
import { API_BASE_URL } from '../constants/config';

const TIER_LABELS = {
  free:    { label: 'Free',    color: Colors.textSecondary, icon: 'account-outline' },
  basic:   { label: 'Basic',   color: Colors.accent,        icon: 'star-outline' },
  pro:     { label: 'Pro',     color: '#00D4FF',            icon: 'star-half-full' },
  premium: { label: 'Premium', color: '#F5C542',            icon: 'crown' },
};

const TIER_PERKS = {
  free:    ['3 strategy previews', 'No calculators', 'Community tips'],
  basic:   ['5 calculators', 'S-Corp, QBI, Home Office, Vehicle, HSA', '7-day free trial'],
  pro:     ['8 calculators', '+ Hire Your Kids, Augusta Rule, Accountable Plan', 'Priority support'],
  premium: ['All 10 calculators', '+ Solo 401k, Tax Loss Harvesting', 'Theia Willis consultation'],
};

export default function Profile({ navigation }) {
  const [profile, setProfile]   = useState(null);
  const [user, setUser]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', u.id)
        .single();
      setProfile(prof);
    } catch (e) {
      console.error('Profile load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const openBillingPortal = async () => {
    if (!profile?.stripe_customer_id) {
      Alert.alert(
        'No Active Subscription',
        'You don\'t have an active subscription to manage. Upgrade to access the billing portal.',
        [
          { text: 'View Plans', onPress: () => navigation.navigate('Pricing') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setPortalLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stripe/portal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: profile.stripe_customer_id }),
      });
      const data = await res.json();

      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        Alert.alert('Error', data.error || 'Could not open billing portal. Try again.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Check your connection and try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out', style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const tier = profile?.subscription_tier || 'free';
  const tierInfo = TIER_LABELS[tier] || TIER_LABELS.free;
  const isActive = profile?.subscription_status === 'active';
  const isCanceled = profile?.subscription_status === 'canceled';
  const perks = TIER_PERKS[tier] || TIER_PERKS.free;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={Gradients.hero} style={styles.header}>
        <MaterialCommunityIcons name={tierInfo.icon} size={48} color="#fff" />
        <Text style={styles.headerName}>{user?.email?.split('@')[0] || 'Tax Boss'}</Text>
        <Text style={styles.headerEmail}>{user?.email}</Text>
        <View style={styles.tierBadge}>
          <Text style={[styles.tierText, { color: tierInfo.color }]}>
            {tierInfo.label} Plan
          </Text>
          {isActive && (
            <Chip
              icon="check-circle"
              style={styles.activeChip}
              textStyle={{ color: Colors.success, fontSize: 12 }}
            >
              Active
            </Chip>
          )}
          {isCanceled && (
            <Chip
              icon="close-circle"
              style={styles.canceledChip}
              textStyle={{ color: Colors.error || '#FF4444', fontSize: 12 }}
            >
              Canceled
            </Chip>
          )}
        </View>
      </LinearGradient>

      <View style={styles.content}>

        {/* Current Plan Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Your Plan</Text>
            <Divider style={styles.divider} />
            {perks.map((perk, i) => (
              <View key={i} style={styles.perkRow}>
                <MaterialCommunityIcons name="check" size={16} color={Colors.success} />
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}

            {tier !== 'premium' && (
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Pricing')}
                style={styles.upgradeButton}
                labelStyle={{ color: '#fff' }}
                icon="arrow-up-circle"
              >
                Upgrade Plan
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Billing Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Billing</Text>
            <Divider style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={openBillingPortal}
              disabled={portalLoading}
            >
              <MaterialCommunityIcons name="credit-card-outline" size={22} color={Colors.text} />
              <Text style={styles.menuText}>Manage Subscription</Text>
              {portalLoading
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuRow}
              onPress={openBillingPortal}
              disabled={portalLoading}
            >
              <MaterialCommunityIcons name="receipt" size={22} color={Colors.text} />
              <Text style={styles.menuText}>View Invoices</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>

            {(isActive || tier !== 'free') && (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={openBillingPortal}
                disabled={portalLoading}
              >
                <MaterialCommunityIcons name="cancel" size={22} color="#FF4444" />
                <Text style={[styles.menuText, { color: '#FF4444' }]}>Cancel Subscription</Text>
                <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}

            <Text style={styles.portalNote}>
              Billing is managed securely via Stripe. You'll be redirected to the Stripe portal.
            </Text>
          </Card.Content>
        </Card>

        {/* Account Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Account</Text>
            <Divider style={styles.divider} />

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => Alert.alert('Coming Soon', 'Password reset coming in the next update!')}
            >
              <MaterialCommunityIcons name="lock-reset" size={22} color={Colors.text} />
              <Text style={styles.menuText}>Change Password</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={handleSignOut}>
              <MaterialCommunityIcons name="logout" size={22} color="#FF4444" />
              <Text style={[styles.menuText, { color: '#FF4444' }]}>Sign Out</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Disclaimer */}
        <Text style={styles.disclaimer}>
          Tax strategies provided for informational purposes only.{'\n'}
          Credentialed advice by Theia Willis, CTEC #A123456.
        </Text>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { padding: 32, paddingTop: 64, alignItems: 'center', paddingBottom: 28 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 12 },
  headerEmail: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  tierText: { fontSize: 16, fontWeight: '700' },
  activeChip: { backgroundColor: 'rgba(0,200,100,0.2)' },
  canceledChip: { backgroundColor: 'rgba(255,68,68,0.15)' },
  content: { padding: 16, paddingBottom: 40 },
  card: { marginBottom: 14, backgroundColor: Colors.card },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  divider: { marginVertical: 12, backgroundColor: Colors.border || '#2A2A3D' },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  perkText: { color: Colors.text, fontSize: 14 },
  upgradeButton: { marginTop: 16, backgroundColor: Colors.primary },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#2A2A3D'
  },
  menuText: { flex: 1, fontSize: 15, color: Colors.text },
  portalNote: { fontSize: 12, color: Colors.textSecondary, marginTop: 12, lineHeight: 18 },
  disclaimer: { textAlign: 'center', fontSize: 12, color: Colors.textSecondary, marginTop: 8, lineHeight: 18 },
});
