import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, SectionLabel } from '../../components/ui';
import { CATEGORIES } from '../../data/categories';
import { GIBRALTAR_AREAS } from '../../data/areas';
import { getCompanyById } from '../../data/companies';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Props = NativeStackScreenProps<BrowseStackParamList, 'RequestQuote'>;

export default function RequestQuoteScreen({ route, navigation }: Props) {
  const company = getCompanyById(route.params.companyId);
  const { addRequest } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [area, setArea] = useState(company?.areas[0] ?? GIBRALTAR_AREAS[0]);
  const [addressDetails, setAddressDetails] = useState('');
  const [jobDetails, setJobDetails] = useState('');
  const [preferredDate, setPreferredDate] = useState('');

  if (!company) return null;

  const categoryName = CATEGORIES.find((c) => c.id === company.categoryIds[0])?.name ?? '';
  const canSubmit = customerName.trim().length > 0 && phone.trim().length > 0 && jobDetails.trim().length > 0;

  function handleSubmit() {
    addRequest({
      companyId: company!.id,
      companyName: company!.name,
      categoryName,
      customerName: customerName.trim(),
      phone: phone.trim(),
      area,
      addressDetails: addressDetails.trim(),
      jobDetails: jobDetails.trim(),
      preferredDate: preferredDate.trim(),
    });
    notify('Request sent', `Your request has been sent to ${company!.name}.`);
    navigation.popToTop();
    (navigation as any).getParent()?.navigate('MyRequests');
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

        <SectionLabel>Your name</SectionLabel>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="e.g. Maria Chipolina"
          placeholderTextColor={colors.textMuted}
        />

        <SectionLabel>Phone number</SectionLabel>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+350 5400 0000"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />

        <SectionLabel>Area</SectionLabel>
        <View style={styles.chipWrap}>
          {GIBRALTAR_AREAS.map((a) => (
            <Chip key={a} label={a} selected={a === area} onPress={() => setArea(a)} />
          ))}
        </View>

        <SectionLabel>Address details</SectionLabel>
        <TextInput
          style={styles.input}
          value={addressDetails}
          onChangeText={setAddressDetails}
          placeholder="Block, floor, flat number..."
          placeholderTextColor={colors.textMuted}
        />

        <SectionLabel>What do you need done?</SectionLabel>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={jobDetails}
          onChangeText={setJobDetails}
          placeholder="Describe the job..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
        />

        <SectionLabel>Preferred date (optional)</SectionLabel>
        <TextInput
          style={styles.input}
          value={preferredDate}
          onChangeText={setPreferredDate}
          placeholder="e.g. This week, or 12 August"
          placeholderTextColor={colors.textMuted}
        />

        <View style={{ height: spacing.md }} />
        <Button title="Send request" onPress={handleSubmit} disabled={!canSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs, marginBottom: spacing.sm },
});
