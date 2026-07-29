import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors, Gradients } from '../constants/Colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const STEPS = ['income', 'entity', 'expenses', 'result'];

export default function Onboarding({ navigation }) {
  const [step, setStep]         = useState(0);
  const [income, setIncome]     = useState('');
  const [entity, setEntity]     = useState('');   // sole_prop | llc | s_corp | corp
  const [expenses, setExpenses] = useState('');
  const [savings, setSavings]   = useState(null);

  // ── S-Corp savings calculator ──────────────────────────────────
  const calcSavings = () => {
    const inc  = parseFloat(income.replace(/,/g, '')) || 0;
    const exp  = parseFloat(expenses.replace(/,/g, '')) || 0;
    const net  = Math.max(inc - exp, 0);

    // SE tax on sole prop / LLC = 15.3% on net
    const seTax = net * 0.153;

    // S-Corp: pay yourself reasonable salary ~40% of net, rest as distribution
    const salary       = net * 0.4;
    const distribution = net * 0.6;
    const sCorpSEtax   = salary * 0.153;
    const sCorpSavings = seTax - sCorpSEtax;

    // Home office, retirement, other deductions estimate
    const otherSavings = net > 0 ? net * 0.06 : 0;

    const total = Math.round(sCorpSavings + otherSavings);
    return Math.max(total, 0);
  };

  const handleNext = async () => {
    if (step === 2) {
      const s = calcSavings();
      setSavings(s);

      // Save to Supabase profile
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('profiles').update({
        annual_income:    parseFloat(income.replace(/,/g, '')) || 0,
        entity_type:      entity,
        annual_expenses:  parseFloat(expenses.replace(/,/g, '')) || 0,
        estimated_savings: s,
        onboarding_done:  true,
      }).eq('id', user.id);
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else navigation.replace('Main');
  };

  const canProceed = () => {
    if (step === 0) return income.length > 0;
    if (step === 1) return entity.length > 0;
    if (step === 2) return true;
    return true;
  };

  return (
    <LinearGradient colors={Gradients.hero} style={styles.container}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      {/* Theia intro */}
      {step === 0 && (
        <View style={styles.theiaRow}>
          <Image source={require('../assets/theia-avatar.png')} style={styles.avatar} />
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>Hi! I'm Theia 👋 Let's find your hidden tax savings in 60 seconds.</Text>
          </View>
        </View>
      )}

      {/* Step: Income */}
      {step === 0 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>What's your annual revenue?</Text>
          <Text style={styles.stepSub}>Gross income before expenses</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 150,000"
            placeholderTextColor={Colors.textSecondary}
            value={income}
            onChangeText={setIncome}
            keyboardType="numeric"
            autoFocus
          />
        </View>
      )}

      {/* Step: Entity type */}
      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>How are you set up?</Text>
          <Text style={styles.stepSub}>Your current business structure</Text>
          {[
            { id: 'sole_prop', label: 'Sole Proprietor / Freelancer', icon: 'account' },
            { id: 'llc',       label: 'LLC',                          icon: 'domain' },
            { id: 's_corp',    label: 'S-Corp',                       icon: 'office-building' },
            { id: 'corp',      label: 'C-Corp',                       icon: 'city' },
          ].map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.optionBtn, entity === opt.id && styles.optionBtnSelected]}
              onPress={() => setEntity(opt.id)}
            >
              <MaterialCommunityIcons name={opt.icon} size={22} color={entity === opt.id ? Colors.neonPink : Colors.textSecondary} />
              <Text style={[styles.optionText, entity === opt.id && { color: Colors.neonPink }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Step: Expenses */}
      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Annual business expenses?</Text>
          <Text style={styles.stepSub}>Rough estimate is fine</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 30,000"
            placeholderTextColor={Colors.textSecondary}
            value={expenses}
            onChangeText={setExpenses}
            keyboardType="numeric"
            autoFocus
          />
        </View>
      )}

      {/* Step: Result */}
      {step === 3 && (
        <View style={styles.stepContent}>
          <MaterialCommunityIcons name="party-popper" size={48} color={Colors.gold} style={{ alignSelf: 'center', marginBottom: 16 }} />
          <Text style={styles.stepTitle}>Your estimated savings</Text>
          <Text style={styles.savingsAmount}>${(savings ?? 23328).toLocaleString()}</Text>
          <Text style={styles.stepSub}>per year with the right strategies</Text>
          {entity !== 's_corp' && (
            <View style={styles.sCorpHint}>
              <MaterialCommunityIcons name="lightbulb-on" size={18} color={Colors.gold} />
              <Text style={styles.sCorpText}>Converting to S-Corp could save you the most — we'll show you how.</Text>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.nextBtn, !canProceed() && styles.nextBtnDisabled]}
        onPress={handleNext}
        disabled={!canProceed()}
      >
        <Text style={styles.nextBtnText}>
          {step === STEPS.length - 1 ? 'See My Tax Plan →' : 'Next →'}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, padding: 24, paddingTop: 60 },
  dots:             { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 8 },
  dot:              { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive:        { backgroundColor: Colors.neonPink, width: 24 },
  theiaRow:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  avatar:           { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  bubble:           { flex: 1, backgroundColor: Colors.card, borderRadius: 12, padding: 12 },
  bubbleText:       { color: Colors.text, fontSize: 14, lineHeight: 20 },
  stepContent:      { flex: 1 },
  stepTitle:        { fontSize: 26, fontWeight: '900', color: Colors.text, marginBottom: 8 },
  stepSub:          { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  input:            { backgroundColor: Colors.card, borderRadius: 12, padding: 16, color: Colors.text, fontSize: 24, fontWeight: '700', borderWidth: 1, borderColor: Colors.border },
  optionBtn:        { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  optionBtnSelected:{ borderColor: Colors.neonPink, backgroundColor: 'rgba(255,58,242,0.08)' },
  optionText:       { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
  savingsAmount:    { fontSize: 64, fontWeight: '900', color: Colors.gold, textAlign: 'center', marginVertical: 12 },
  sCorpHint:        { flexDirection: 'row', backgroundColor: 'rgba(245,197,66,0.1)', borderRadius: 10, padding: 12, marginTop: 20, gap: 8 },
  sCorpText:        { color: Colors.gold, fontSize: 13, flex: 1, lineHeight: 18 },
  nextBtn:          { backgroundColor: Colors.neonPink, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 16 },
  nextBtnDisabled:  { opacity: 0.4 },
  nextBtnText:      { color: '#fff', fontSize: 18, fontWeight: '800' },
});
