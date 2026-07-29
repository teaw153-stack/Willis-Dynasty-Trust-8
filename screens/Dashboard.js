import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Button, Chip, ProgressBar } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { Colors, Gradients } from '../constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Dashboard({ navigation }) {
  const [strategies, setStrategies] = useState([]);
  const [totals, setTotals] = useState({ potential: 0, captured: 0, remaining: 0 });
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    // BUG FIX 1: was missing closing } on destructure — { data: { user } } not { data: { user }
    const { data: { user } } = await supabase.auth.getUser();

    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(prof);

    const { data: strats } = await supabase
      .from('strategies')
      .select('*, user_strategies(*)')
      .order('potential_savings_high', { ascending: false });

    const formatted = strats.map(s => ({
      ...s,
      userStatus: s.user_strategies?.find(us => us.user_id === user.id)?.status || 'eligible',
      userSavings: s.user_strategies?.find(us => us.user_id === user.id)?.calculated_savings || 0
    }));

    setStrategies(formatted);

    const potential = formatted.reduce((sum, s) => sum + s.potential_savings_high, 0);
    const captured = formatted
      .filter(s => s.userStatus === 'complete')
      .reduce((sum, s) => sum + s.userSavings, 0);
    setTotals({ potential, captured, remaining: potential - captured });
  };

  // BUG FIX 3: was missing setRefreshing(true/false) — spinner would run forever
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const progress = totals.potential > 0 ? totals.captured / totals.potential : 0;
  const tier = profile?.subscription_tier || 'free';

  // BUG FIX 2: was comparing tiers (object) >= tiers[minTier] (number) — always falsy
  const canAccess = (minTier) => {
    const tiers = { free: 0, basic: 1, pro: 2, premium: 3 };
    return tiers[tier] >= tiers[minTier];
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <LinearGradient colors={Gradients.hero} style={styles.header}>
        <Text style={styles.headerLabel}>Your 2026 Tax Plan</Text>
        <Text style={styles.headerAmount}>${totals.captured.toLocaleString()}</Text>
        <Text style={styles.headerSub}>Captured of ${totals.potential.toLocaleString()} potential</Text>
        <ProgressBar progress={progress} color="#fff" style={styles.progressBar} />
      </LinearGradient>

      <View style={styles.content}>
        {strategies.map(s => (
          <Card
            key={s.id}
            style={styles.card}
            onPress={() =>
              canAccess(s.min_tier)
                ? navigation.navigate('StrategyDetail', { strategy: s })
                : navigation.navigate('Pricing')
            }
          >
            <Card.Content>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <Text style={styles.cardMeta}>{s.setup_time_minutes} min • {s.difficulty}</Text>
                </View>
                {!canAccess(s.min_tier) && (
                  <MaterialCommunityIcons name="lock" size={20} color={Colors.accent} />
                )}
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.cardSavings}>
                  Save up to ${s.potential_savings_high.toLocaleString()}
                </Text>
                {s.userStatus === 'complete' && (
                  <Chip icon="check" style={{ backgroundColor: Colors.success }}>Done</Chip>
                )}
                {s.userStatus === 'in_progress' && (
                  <Chip icon="progress-clock">In Progress</Chip>
                )}
                {s.deadline && (
                  <Chip icon="calendar-alert" textStyle={{ color: Colors.warning }}>
                    {s.deadline}
                  </Chip>
                )}
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 20, paddingTop: 60 },
  headerLabel: { color: '#fff', fontSize: 14, opacity: 0.9 },
  headerAmount: { color: '#fff', fontSize: 40, fontWeight: '900', marginVertical: 4 },
  headerSub: { color: '#fff', fontSize: 14, opacity: 0.9 },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.3)'
  },
  content: { padding: 16 },
  card: { marginBottom: 12, backgroundColor: Colors.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardMeta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12
  },
  cardSavings: { fontSize: 18, fontWeight: '700', color: Colors.success }
});
