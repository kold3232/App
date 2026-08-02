import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { getTierInfo } from '../../data/tiers';
import { useApp } from '../../context/AppContext';
import { CompanyStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Props = NativeStackScreenProps<CompanyStackParamList, 'Payment'>;

const FOUNDING_CODE = 'FOUNDER50';

function offerEndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PaymentScreen({ route, navigation }: Props) {
  const { mode, tier } = route.params;
  const tierInfo = getTierInfo(tier);
  const { updateApplicationDraft, submitApplication, changeTier } = useApp();

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [promoCode, setPromoCode] = useState('');

  const promoApplied = promoCode.trim().toUpperCase() === FOUNDING_CODE;
  const endDate = useMemo(() => offerEndDate(), []);

  const canSubmit =
    mode === 'change' || (cardNumber.trim().length > 0 && expiry.trim().length > 0 && cvc.trim().length > 0);

  function handleConfirm() {
    if (mode === 'change') {
      changeTier(tier);
      notify('Plan updated', `You're now on the ${tierInfo.name} plan.`);
      navigation.navigate('CompanyTabs');
      return;
    }
    updateApplicationDraft({ tier, promoCode: promoCode.trim() });
    submitApplication();
    navigation.navigate('ApplicationStatus');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <Text style={styles.title}>{mode === 'change' ? 'Confirm your plan change' : 'Subscribe'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'change' ? `Switching to ${tierInfo.name}` : 'Step 4 of 4 — Set up billing'}
        </Text>

        <Card>
          <SectionLabel>Selected plan</SectionLabel>
          <View style={styles.planRow}>
            <Text style={styles.planName}>{tierInfo.name}</Text>
            <Text style={styles.planPrice}>
              {promoApplied ? (
                <>
                  <Text style={styles.strikethrough}>{tierInfo.price}</Text> {'  '}
                  {tierInfo.price.replace(/\d+/g, (n) => String(Math.round(Number(n) / 2)))}
                </>
              ) : (
                tierInfo.price
              )}{' '}
              <Text style={styles.planPriceNote}>{tierInfo.priceNote}</Text>
            </Text>
          </View>
          {promoApplied && (
            <Text style={styles.promoNote}>🎉 Founding-cohort discount applied — 50% off until {endDate}</Text>
          )}
        </Card>

        {mode === 'signup' && (
          <Card style={{ marginTop: spacing.md }}>
            <View style={styles.field}>
              <SectionLabel>Card number</SectionLabel>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="4242 4242 4242 4242"
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.primary}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.cardRow}>
              <View style={[styles.field, styles.fieldBorder, { flex: 1 }]}>
                <SectionLabel>Expiry</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={expiry}
                  onChangeText={setExpiry}
                  placeholder="MM/YY"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                />
              </View>
              <View style={[styles.field, styles.fieldBorder, { flex: 1 }]}>
                <SectionLabel>CVC</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={cvc}
                  onChangeText={setCvc}
                  placeholder="123"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  keyboardType="number-pad"
                />
              </View>
            </View>
          </Card>
        )}

        {mode === 'signup' && (
          <Card style={{ marginTop: spacing.md }}>
            <SectionLabel>Promo code</SectionLabel>
            <TextInput
              style={styles.input}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="Founding-cohort code, if you have one"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              autoCapitalize="characters"
            />
          </Card>
        )}

        <View style={{ height: spacing.lg }} />
        <Button
          title={mode === 'change' ? 'Confirm change' : 'Subscribe & submit application'}
          onPress={handleConfirm}
          disabled={!canSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  planName: { fontSize: 16, fontWeight: '700', color: colors.text },
  planPrice: { fontSize: 15, fontWeight: '700', color: colors.primary },
  planPriceNote: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  strikethrough: { textDecorationLine: 'line-through', color: colors.textFaint, fontWeight: '600' },
  promoNote: { fontSize: 12.5, color: colors.success, fontWeight: '600', marginTop: spacing.sm },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  cardRow: { flexDirection: 'row', gap: spacing.md },
  input: {
    fontSize: 15,
    color: colors.text,
    marginTop: 6,
    padding: 0,
  },
});
