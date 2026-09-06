import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, SectionLabel } from '../../components/ui';
import { Calendar } from '../../components/Calendar';
import { useApp } from '../../context/AppContext';
import { GIBRALTAR_AREAS } from '../../data/areas';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Props = NativeStackScreenProps<BrowseStackParamList, 'RequestQuote'>;

const TIME_OPTIONS = ['09:00', '11:30', '14:00', '16:30'];

export default function RequestQuoteScreen({ route, navigation }: Props) {
  const { addRequest, categories, customerProfile, businessListings } = useApp();
  const company = businessListings.find((c) => c.id === route.params.companyId);

  const [customerName, setCustomerName] = useState(customerProfile?.name ?? '');
  const [phone, setPhone] = useState(customerProfile?.phone ?? '');
  const [useSavedAddress, setUseSavedAddress] = useState(!!customerProfile?.address);
  const [address, setAddress] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [jobDetails, setJobDetails] = useState('');
  const [preferredIsoDate, setPreferredIsoDate] = useState<string | null>(null);
  const [preferredTime, setPreferredTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!company) return null;

  const categoryName = categories.find((c) => c.id === company.categoryIds[0])?.name ?? '';
  const resolvedAddress = useSavedAddress && customerProfile?.address ? customerProfile.address : address.trim();
  const canSubmit =
    customerName.trim().length > 0 &&
    phone.trim().length > 0 &&
    resolvedAddress.length > 0 &&
    !!area &&
    jobDetails.trim().length > 0;

  function selectDate(isoDate: string) {
    setPreferredIsoDate(isoDate);
    setPreferredTime(null);
  }

  function clearPreference() {
    setPreferredIsoDate(null);
    setPreferredTime(null);
  }

  async function handleSubmit() {
    const dateLabel = preferredIsoDate
      ? new Date(preferredIsoDate).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
      : '';
    const preferredDate = dateLabel && preferredTime ? `${dateLabel} · ${preferredTime}` : '';
    setSubmitting(true);
    const id = await addRequest({
      companyId: company!.id,
      companyName: company!.name,
      categoryName,
      type: 'quote',
      area: area ?? '',
      jobDetails: jobDetails.trim(),
      preferredDate,
      scheduledSlot: '',
      status: 'pending',
      contact: {
        name: customerName.trim(),
        phone: phone.trim(),
        address: resolvedAddress,
      },
    });
    setSubmitting(false);
    if (!id) {
      notify('Could not send request', 'Something went wrong sending your request. Please try again.');
      return;
    }
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

        <View style={styles.privacyNote}>
          <Text style={styles.privacyNoteText}>
            🔒 {company.name} will see your job description and your general area. Your phone number and exact
            address are only shared once you accept their quote in the app.
          </Text>
        </View>

        <Card>
          <View style={styles.field}>
            <SectionLabel>Your name</SectionLabel>
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="e.g. John Smith"
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
            {customerProfile?.address ? (
              <>
                <View style={styles.addressChipRow}>
                  <Chip label="Use saved address" selected={useSavedAddress} onPress={() => setUseSavedAddress(true)} />
                  <Chip label="Different address" selected={!useSavedAddress} onPress={() => setUseSavedAddress(false)} />
                </View>
                {useSavedAddress ? (
                  <Text style={styles.savedAddressText}>{customerProfile.address}</Text>
                ) : (
                  <TextInput
                    style={[styles.input, { marginTop: spacing.sm }]}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Street, block, floor, flat number..."
                    placeholderTextColor={colors.textFaint}
                    selectionColor={colors.primary}
                  />
                )}
              </>
            ) : (
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Street, block, floor, flat number..."
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.primary}
              />
            )}
          </View>

          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Which area is this in?</SectionLabel>
            <Text style={styles.fieldHint}>
              This is all {company.name} sees until you accept their quote.
            </Text>
            <View style={styles.chipWrap}>
              {GIBRALTAR_AREAS.map((option) => (
                <Chip key={option} label={option} selected={area === option} onPress={() => setArea(option)} />
              ))}
            </View>
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
            {(preferredIsoDate || preferredTime) && (
              <Text style={styles.clearLink} onPress={clearPreference}>
                Clear
              </Text>
            )}
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <Calendar selectedDate={preferredIsoDate} onSelectDate={selectDate} />
          </View>
          {preferredIsoDate && (
            <View style={styles.chipWrap}>
              {TIME_OPTIONS.map((time) => (
                <Chip key={time} label={time} selected={preferredTime === time} onPress={() => setPreferredTime(time)} />
              ))}
            </View>
          )}
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button title="Send request" onPress={handleSubmit} disabled={!canSubmit} loading={submitting} />
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
  fieldHint: { fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 17 },
  privacyNote: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  privacyNoteText: { fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  addressChipRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  savedAddressText: { fontSize: 14.5, color: colors.text, marginTop: spacing.xs, lineHeight: 20 },
  prefHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearLink: { fontSize: 12, fontWeight: '700', color: colors.primary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md },
});
