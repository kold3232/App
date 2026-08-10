import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui';
import { TIERS } from '../../data/tiers';
import { useApp } from '../../context/AppContext';
import { CompanyStackParamList } from '../../navigation/types';
import { SubscriptionTier } from '../../types';
import { colors, radius, shadow, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Props = NativeStackScreenProps<CompanyStackParamList, 'TierSelection'>;

export default function TierSelectionScreen({ navigation }: Props) {
  const { businessTier, changeTier } = useApp();
  const [selected, setSelected] = useState<SubscriptionTier | null>(businessTier);
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    if (!selected) return;
    setSaving(true);
    await changeTier(selected);
    setSaving(false);
    notify('Plan updated', `You're now on the ${TIERS.find((t) => t.id === selected)?.name} plan.`);
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <Text style={styles.title}>Change your plan</Text>
      <Text style={styles.subtitle}>Switch anytime — no re-vetting needed, just a subscription change.</Text>

      {TIERS.map((tier) => {
        const isSelected = selected === tier.id;
        return (
          <Pressable
            key={tier.id}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => setSelected(tier.id)}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.tierName}>{tier.name}</Text>
                <Text style={styles.tierPrice}>
                  {tier.price} <Text style={styles.tierPriceNote}>{tier.priceNote}</Text>
                </Text>
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
              </View>
            </View>
            {tier.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </Pressable>
        );
      })}

      <View style={{ height: spacing.sm }} />
      <Button title="Confirm change" onPress={handleConfirm} disabled={!selected} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadow.card,
  },
  cardSelected: { borderColor: colors.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  tierName: { fontSize: 17, fontWeight: '800', color: colors.text },
  tierPrice: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 2 },
  tierPriceNote: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  featureText: { fontSize: 13, color: colors.text, flex: 1 },
});
