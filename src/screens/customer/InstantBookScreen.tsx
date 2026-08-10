import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import { notify } from '../../utils/alert';
import { generateSlots } from '../../utils/booking';

type Props = NativeStackScreenProps<BrowseStackParamList, 'InstantBook'>;

export default function InstantBookScreen({ route, navigation }: Props) {
  const { addRequest, categories, businessListings } = useApp();
  const company = businessListings.find((c) => c.id === route.params.companyId);
  const slots = useMemo(() => generateSlots(), []);

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

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  if (!company) return null;

  const categoryName = categories.find((c) => c.id === company.categoryIds[0])?.name ?? '';
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const canSubmit = !!selectedSlot && customerName.trim().length > 0 && phone.trim().length > 0 && address.trim().length > 0;

  async function handleSubmit() {
    const id = await addRequest({
      companyId: company!.id,
      companyName: company!.name,
      categoryName,
      type: 'instant',
      customerName: customerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      jobDetails: '',
      preferredDate: '',
      scheduledSlot: `${selectedSlot!.dayLabel} · ${selectedSlot!.time}`,
      status: 'accepted',
    });
    if (!id) {
      notify('Could not confirm booking', 'Something went wrong sending your booking. Please try again.');
      return;
    }
    notify('Booking confirmed', `Your booking with ${company!.name} for ${selectedSlot!.dayLabel} at ${selectedSlot!.time} is confirmed.`);
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

        {days.map((day) => (
          <View key={day} style={{ marginBottom: spacing.md }}>
            <SectionLabel>{day}</SectionLabel>
            <View style={styles.chipWrap}>
              {slots
                .filter((s) => s.dayLabel === day)
                .map((s) => (
                  <Chip key={s.id} label={s.time} selected={selectedSlotId === s.id} onPress={() => setSelectedSlotId(s.id)} />
                ))}
            </View>
          </View>
        ))}

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
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button
          title={selectedSlot ? `Confirm ${selectedSlot.dayLabel} · ${selectedSlot.time}` : 'Select a time slot'}
          onPress={handleSubmit}
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 15, color: colors.text, marginTop: 6, padding: 0 },
});
