import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { getCompanyById } from '../../data/companies';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Props = NativeStackScreenProps<BrowseStackParamList, 'RequestQuote'>;

export default function RequestQuoteScreen({ route, navigation }: Props) {
  const company = getCompanyById(route.params.companyId);
  const { addRequest, categories } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [jobDetails, setJobDetails] = useState('');
  const [preferredDate, setPreferredDate] = useState('');

  if (!company) return null;

  const categoryName = categories.find((c) => c.id === company.categoryIds[0])?.name ?? '';
  const canSubmit =
    customerName.trim().length > 0 &&
    phone.trim().length > 0 &&
    address.trim().length > 0 &&
    jobDetails.trim().length > 0;

  function handleSubmit() {
    addRequest({
      companyId: company!.id,
      companyName: company!.name,
      categoryName,
      type: 'quote',
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      jobDetails: jobDetails.trim(),
      preferredDate: preferredDate.trim(),
      scheduledSlot: '',
      status: 'pending',
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

          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Preferred date (optional)</SectionLabel>
            <TextInput
              style={styles.input}
              value={preferredDate}
              onChangeText={setPreferredDate}
              placeholder="e.g. This week, or 12 August"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
          </View>
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
});
