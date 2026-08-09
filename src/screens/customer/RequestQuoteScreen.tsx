import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, SectionLabel } from '../../components/ui';
import { getCompanyById } from '../../data/companies';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { generateSlots } from '../../utils/booking';

type Props = NativeStackScreenProps<BrowseStackParamList, 'RequestQuote'>;

export default function RequestQuoteScreen({ route, navigation }: Props) {
  const company = getCompanyById(route.params.companyId);
  const { addRequest, categories } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [jobDetails, setJobDetails] = useState('');
  const [preferredDay, setPreferredDay] = useState<string | null>(null);
  const [preferredTime, setPreferredTime] = useState<string | null>(null);

  const slots = useMemo(() => generateSlots(21), []);
  const days = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    slots.forEach((s) => {
      if (!seen.has(s.dayLabel)) {
        seen.add(s.dayLabel);
        ordered.push(s.dayLabel);
      }
    });
    return ordered;
  }, [slots]);
  const timesForDay = useMemo(
    () => slots.filter((s) => s.dayLabel === preferredDay).map((s) => s.time),
    [slots, preferredDay]
  );

  if (!company) return null;

  const categoryName = categories.find((c) => c.id === company.categoryIds[0])?.name ?? '';
  const canSubmit =
    customerName.trim().length > 0 &&
    phone.trim().length > 0 &&
    address.trim().length > 0 &&
    jobDetails.trim().length > 0;

  function selectDay(day: string) {
    setPreferredDay(day);
    setPreferredTime(null);
  }

  function clearPreference() {
    setPreferredDay(null);
    setPreferredTime(null);
  }

  function handleSubmit() {
    const preferredDate = preferredDay && preferredTime ? `${preferredDay} · ${preferredTime}` : '';
    const id = addRequest({
      companyId: company!.id,
      companyName: company!.name,
      categoryName,
      type: 'quote',
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      jobDetails: jobDetails.trim(),
      preferredDate,
      scheduledSlot: '',
      status: 'pending',
    });
    navigation.popToTop();
    (navigation as any).getParent()?.navigate('MyRequests', { openRequestId: id });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <Text style={styles.title}>Request a quote</Text>
        <Text style={styles.subtitle}>Sending to {company.name}</Text>

        <Card>
          <View style={styles.field}>
            <SectionLabel>Your name</SectionLabel>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g. Maria Chipolina"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
          </View>

          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Phone number</SectionLabel>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+350 5400 0000"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Your address</SectionLabel>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Street, block, floor, flat number..."
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
          </View>

          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>What do you need done?</SectionLabel>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={jobDetails}
              onChangeText={setJobDetails}
              placeholder="Describe the job..."
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              multiline
              numberOfLines={4}
            />
          </View>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.prefHeader}>
            <SectionLabel>Preferred date (optional)</SectionLabel>
            {(preferredDay || preferredTime) && (
              <Text style={styles.clearLink} onPress={clearPreference}>
                Clear
              </Text>
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.sm }}>
            {days.map((day) => (
              <Chip key={day} label={day} selected={preferredDay === day} onPress={() => selectDay(day)} />
            ))}
          </ScrollView>
          {preferredDay && (
            <View style={styles.chipWrap}>
              {timesForDay.map((time) => (
                <Chip key={time} label={time} selected={preferredTime === time} onPress={() => setPreferredTime(time)} />
              ))}
            </View>
          )}
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button title="Send request" onPress={handleSubmit} disabled={!canSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: {
    fontSize: 15,
    color: colors.text,
    marginTop: 6,
    padding: 0,
  },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  prefHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
});
