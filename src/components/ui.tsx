import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  disabled?: boolean;
  loading?: boolean;
}) {
  const styleForVariant = {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.accent },
    danger: { backgroundColor: colors.danger },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  }[variant];
  const textColor = variant === 'outline' ? colors.primary : variant === 'secondary' ? colors.text : colors.textInverse;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        styleForVariant,
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      disabled={!onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function RatingBadge({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <View style={styles.ratingRow}>
      <Text style={styles.ratingStar}>★</Text>
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      <Text style={styles.ratingCount}>({reviewCount})</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: 'pending' | 'accepted' | 'declined' | 'completed' }) {
  const map = {
    pending: { bg: '#FDF1D8', fg: colors.pending, label: 'Pending' },
    accepted: { bg: '#DFF5E7', fg: colors.success, label: 'Accepted' },
    declined: { bg: '#FBE2E0', fg: colors.danger, label: 'Declined' },
    completed: { bg: '#E4E9FF', fg: colors.primary, label: 'Completed' },
  }[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: map.bg }]}>
      <Text style={[styles.statusBadgeText, { color: map.fg }]}>{map.label}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextSelected: { color: colors.textInverse },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingStar: { color: colors.accent, fontSize: 14, marginRight: 3 },
  ratingText: { fontWeight: '700', color: colors.text, fontSize: 13, marginRight: 3 },
  ratingCount: { color: colors.textMuted, fontSize: 12 },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
});
