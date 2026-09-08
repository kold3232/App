import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, Chip, EmptyState, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { GIBRALTAR_AREAS } from '../../data/areas';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Props = NativeStackScreenProps<BrowseStackParamList, 'InstantBook'>;

function dayLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function InstantBookScreen({ route, navigation }: Props) {
  const { addRequest, categories, businessListings, fetchAvailableSlots } = useApp();
  const company = businessListings.find((c) => c.id === route.params.companyId);

  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The free slots are worked out server-side from this listing's own working
  // days and hours, minus anything already in its calendar.
  useEffect(() => {
    let active = true;
    setLoadingSlots(true);
    fetchAvailableSlots(route.params.companyId).then((result) => {
      if (!active) return;
      setSlots(result);
      setLoadingSlots(false);
    });
    return () => {
      active = false;
    };
  }, [route.params.companyId, fetchAvailableSlots]);

  const byDay = useMemo(() => {
    const groups = new Map<string, string[]>();
    slots.forEach((slot) => {
      const key = dayLabel(slot);
      groups.set(key, [...(groups.get(key) ?? []), slot]);
    });
    return Array.from(groups.entries());
  }, [slots]);

  if (!company) return null;

  const categoryName = categories.find((c) => c.id === company.categoryIds[0])?.name ?? '';
  const canSubmit =
    !!selectedSlot &&
    customerName.trim().length > 0 &&
    phone.trim().length > 0 &&
    address.trim().length > 0 &&
    !!area;

  async function handleSubmit() {
    if (!selectedSlot) return;
    setSubmitting(true);
    const id = await addRequest({
      companyId: company!.id,
      companyName: company!.name,
      categoryName,
      type: 'instant',
      area: area ?? '',
      jobDetails: '',
      preferredDate: '',
      scheduledSlot: `${dayLabel(selectedSlot)} · ${timeLabel(selectedSlot)}`,
      scheduledFor: selectedSlot,
      status: 'accepted',
      contact: { name: customerName.trim(), phone: phone.trim(), address: address.trim() },
    });
    setSubmitting(false);
    if (!id) {
      // Most likely cause is someone else taking the slot first, so reload
      // rather than leaving a stale list on screen.
      notify('That slot has gone', 'Someone booked it first. Pick another time.');
      setSelectedSlot(null);
      setSlots(await fetchAvailableSlots(route.params.companyId));
      return;
    }
    notify('Booking confirmed', `${company!.name} is booked for ${dayLabel(selectedSlot)} at ${timeLabel(selectedSlot)}.`);
    navigation.popToTop();
    (navigation as any).getParent()?.navigate('MyRequests');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <Text style={styles.title}>Book a time</Text>
        <Text style={styles.subtitle}>With {company.name} — confirmed instantly</Text>

        {loadingSlots ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : byDay.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No times available"
            subtitle={`${company.name} has nothing free at the moment. Request a quote instead and agree a time with them directly.`}
          />
        ) : (
          byDay.map(([day, times]) => (
            <View key={day} style={{ marginBottom: spacing.md }}>
              <SectionLabel>{day}</SectionLabel>
              <View style={styles.chipWrap}>
                {times.map((slot) => (
                  <Chip
                    key={slot}
                    label={timeLabel(slot)}
                    selected={selectedSlot === slot}
                    onPress={() => setSelectedSlot(slot)}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        {byDay.length > 0 && (
          <>
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
                <SectionLabel>Which area is this in?</SectionLabel>
                <View style={styles.chipWrap}>
                  {GIBRALTAR_AREAS.map((option) => (
                    <Chip key={option} label={option} selected={area === option} onPress={() => setArea(option)} />
                  ))}
                </View>
              </View>
            </Card>

            <View style={{ height: spacing.lg }} />
            <Button
              title={selectedSlot ? `Confirm ${dayLabel(selectedSlot)} · ${timeLabel(selectedSlot)}` : 'Select a time'}
              onPress={handleSubmit}
              disabled={!canSubmit}
              loading={submitting}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 15, color: colors.text, marginTop: 6, padding: 0 },
});
