import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Colors, Gradients } from '../constants/Colors';
import { API_BASE_URL } from '../constants/config';

// ── Maps each strategy's `calc_type` to its backend endpoint + input fields ──
const CALC_CONFIG = {
  scorp: {
    endpoint: '/calc/scorp',
    resultKey: 'estimated_net_savings',
    resultLabel: 'Estimated Annual Savings',
    fields: [
      { key: 'net_profit',        label: 'Net Profit ($)',          type: 'number', placeholder: '150,000' },
      { key: 'reasonable_salary', label: 'Reasonable Salary ($)',   type: 'number', placeholder: '60,000' },
    ],
  },
  solo401k: {
    endpoint: '/calc/solo401k',
    resultKey: 'estimated_tax_saved',
    resultLabel: 'Estimated Tax Saved',
    fields: [
      { key: 'age',         label: 'Your Age',                    type: 'number', placeholder: '35' },
      { key: 'net_profit',  label: 'Net Profit ($)',               type: 'number', placeholder: '150,000' },
      { key: 'se_tax',      label: 'Self-Employment Tax Paid ($)', type: 'number', placeholder: '18,000' },
      { key: 'entity_type', label: 'Entity Type',                  type: 'text', placeholder: 'sole_prop / llc / s_corp' },
    ],
  },
  qbi: {
    endpoint: '/calc/qbi',
    resultKey: 'estimated_tax_saved',
    resultLabel: 'Estimated Tax Saved',
    fields: [
      { key: 'qbi_income',      label: 'Qualified Business Income ($)', type: 'number', placeholder: '100,000' },
      { key: 'taxable_income',  label: 'Total Taxable Income ($)',     type: 'number', placeholder: '180,000' },
      { key: 'filing_status',   label: 'Filing Status',                type: 'text', placeholder: 'single / married' },
      { key: 'is_sstb',         label: 'Specified Service Business?',  type: 'boolean' },
    ],
  },
  home_office: {
    endpoint: '/calc/home_office',
    resultKey: 'recommended_deduction',
    resultLabel: 'Recommended Deduction',
    fields: [
      { key: 'office_sqft',           label: 'Office Sq Ft',          type: 'number', placeholder: '150' },
      { key: 'home_sqft',             label: 'Total Home Sq Ft',      type: 'number', placeholder: '1500' },
      { key: 'annual_home_expenses',  label: 'Annual Home Expenses ($)', type: 'number', placeholder: '24,000' },
    ],
  },
  vehicle: {
    endpoint: '/calc/vehicle',
    resultKey: 'recommended',
    resultLabel: 'Recommended Deduction',
    fields: [
      { key: 'business_miles',   label: 'Business Miles / Year',  type: 'number', placeholder: '8,000' },
      { key: 'total_miles',      label: 'Total Miles / Year',     type: 'number', placeholder: '12,000' },
      { key: 'actual_expenses',  label: 'Actual Vehicle Costs ($)', type: 'number', placeholder: '6,000' },
    ],
  },
  hsa: {
    endpoint: '/calc/hsa',
    resultKey: 'estimated_tax_saved',
    resultLabel: 'Estimated Tax Saved',
    fields: [
      { key: 'filing_status',  label: 'Filing Status',    type: 'text', placeholder: 'single / family' },
      { key: 'age',            label: 'Your Age',          type: 'number', placeholder: '35' },
      { key: 'marginal_rate',  label: 'Marginal Tax Rate (e.g. 0.24)', type: 'number', placeholder: '0.24' },
    ],
  },
  hire_kids: {
    endpoint: '/calc/hire_kids',
    resultKey: 'net_family_savings',
    resultLabel: 'Net Family Savings',
    fields: [
      { key: 'child_wages',           label: 'Wages Per Child ($)',   type: 'number', placeholder: '13,000' },
      { key: 'num_children',          label: 'Number of Children',    type: 'number', placeholder: '2' },
      { key: 'parent_marginal_rate',  label: 'Your Marginal Rate (e.g. 0.24)', type: 'number', placeholder: '0.24' },
    ],
  },
  augusta: {
    endpoint: '/calc/augusta',
    resultKey: 'estimated_tax_saved',
    resultLabel: 'Estimated Tax Saved',
    fields: [
      { key: 'days_rented',              label: 'Days Rented (max 14)',     type: 'number', placeholder: '14' },
      { key: 'fair_market_daily_rate',   label: 'Fair Market Daily Rate ($)', type: 'number', placeholder: '500' },
      { key: 'marginal_rate',            label: 'Marginal Tax Rate (e.g. 0.24)', type: 'number', placeholder: '0.24' },
    ],
  },
  accountable_plan: {
    endpoint: '/calc/accountable_plan',
    resultKey: 'estimated_tax_saved',
    resultLabel: 'Estimated Tax Saved',
    fields: [
      { key: 'monthly_reimbursements', label: 'Monthly Reimbursements ($)', type: 'number', placeholder: '500' },
      { key: 'marginal_rate',          label: 'Marginal Tax Rate (e.g. 0.24)', type: 'number', placeholder: '0.24' },
    ],
  },
  tax_loss: {
    endpoint: '/calc/tax_loss',
    resultKey: 'total_tax_saved',
    resultLabel: 'Total Tax Saved',
    fields: [
      { key: 'loss_amount',    label: 'Loss Amount ($)',                type: 'number', placeholder: '5,000' },
      { key: 'marginal_rate',  label: 'Federal Marginal Rate (e.g. 0.24)', type: 'number', placeholder: '0.24' },
      { key: 'state_rate',     label: 'State Tax Rate (e.g. 0.093)',    type: 'number', placeholder: '0.093' },
    ],
  },
};

export default function StrategyDetail({ route, navigation }) {
  const { strategy } = route.params;
  const config = CALC_CONFIG[strategy.calc_type] || null;

  const [inputs, setInputs]   = useState({});
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);

  const setField = (key, val) => setInputs(prev => ({ ...prev, [key]: val }));

  const parseValue = (field, raw) => {
    if (field.type === 'boolean') return !!raw;
    if (field.type === 'number') return parseFloat(String(raw).replace(/,/g, '')) || 0;
    return raw;
  };

  const runCalculator = async () => {
    if (!config) return;
    setLoading(true);
    setResult(null);
    try {
      const body = {};
      config.fields.forEach(f => { body[f.key] = parseValue(f, inputs[f.key]); });

      const res = await fetch(`${API_BASE_URL}${config.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.error) {
        Alert.alert('Heads up', data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not reach the calculator. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const calculatedSavings = result?.[config?.resultKey] ?? strategy.potential_savings_high;

      await supabase.from('user_strategies').upsert({
        user_id: user.id,
        strategy_id: strategy.id,
        status: 'complete',
        calculated_savings: calculatedSavings,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,strategy_id' });

      Alert.alert(
        "You're on 🔥",
        `Nice work — $${calculatedSavings.toLocaleString()} locked in. That's real money back in your pocket.`,
        [{ text: 'See my dashboard', onPress: () => navigation.navigate('Main', { screen: 'Dashboard' }) }]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not save your progress. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={Gradients.hero} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>{strategy.title}</Text>
        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{strategy.setup_time_minutes} min setup</Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{strategy.difficulty}</Text>
        </View>
        <Text style={styles.savingsCallout}>
          Save up to ${strategy.potential_savings_high?.toLocaleString()}/yr
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {strategy.description && (
          <Text style={styles.description}>{strategy.description}</Text>
        )}

        {config && (
          <View style={styles.calcCard}>
            <Text style={styles.calcTitle}>Run Your Numbers</Text>
            {config.fields.map(field => (
              <View key={field.key} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                {field.type === 'boolean' ? (
                  <Switch
                    value={!!inputs[field.key]}
                    onValueChange={v => setField(field.key, v)}
                    trackColor={{ false: Colors.border, true: Colors.neonPink }}
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    placeholder={field.placeholder}
                    placeholderTextColor={Colors.textSecondary}
                    value={inputs[field.key] ?? ''}
                    onChangeText={v => setField(field.key, v)}
                    keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                  />
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.calcBtn} onPress={runCalculator} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.calcBtnText}>Calculate My Savings</Text>}
            </TouchableOpacity>

            {result && (
              <View style={styles.resultCard}>
                <Text style={styles.resultLabel}>{config.resultLabel}</Text>
                <Text style={styles.resultValue}>
                  ${Math.abs(result[config.resultKey] ?? 0).toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.completeBtn, saving && styles.completeBtnDisabled]}
          onPress={markComplete}
          disabled={saving}
        >
          <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
          <Text style={styles.completeBtnText}>{saving ? 'Saving…' : 'Mark Complete'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Colors.background },
  header:             { padding: 20, paddingTop: 60 },
  backBtn:            { marginBottom: 16 },
  title:              { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 8 },
  metaRow:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  metaText:           { color: Colors.textSecondary, fontSize: 13 },
  metaDot:            { color: Colors.textSecondary },
  savingsCallout:     { color: Colors.gold, fontSize: 18, fontWeight: '800' },
  content:            { padding: 20 },
  description:        { color: Colors.text, fontSize: 15, lineHeight: 22, marginBottom: 20 },
  calcCard:           { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 20 },
  calcTitle:          { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  fieldRow:           { marginBottom: 14 },
  fieldLabel:         { color: Colors.textSecondary, fontSize: 13, marginBottom: 6 },
  input:              { backgroundColor: Colors.cardElevated, borderRadius: 10, padding: 14, color: Colors.text, fontSize: 16, borderWidth: 1, borderColor: Colors.border },
  calcBtn:            { backgroundColor: Colors.neonBlue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 6 },
  calcBtnText:        { color: '#fff', fontWeight: '800', fontSize: 15 },
  resultCard:         { backgroundColor: 'rgba(245,197,66,0.1)', borderRadius: 12, padding: 16, marginTop: 16, alignItems: 'center' },
  resultLabel:        { color: Colors.gold, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  resultValue:        { color: Colors.gold, fontSize: 32, fontWeight: '900' },
  completeBtn:         { flexDirection: 'row', backgroundColor: Colors.success, borderRadius: 14, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 8 },
  completeBtnDisabled: { opacity: 0.6 },
  completeBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
});
