import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

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
    primary: { backgroundColor: colors.primary, ...shadow.card },
    secondary: { backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.borderStrong },
    danger: { backgroundColor: colors.danger, ...shadow.card },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  }[variant];
  const textColor =
    variant === 'outline' ? colors.primary : variant === 'secondary' ? colors.slate700 : colors.textInverse;

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
    pending: { bg: colors.pendingBg, fg: colors.pending, label: 'Pending' },
    accepted: { bg: colors.infoBg, fg: colors.info, label: 'Accepted' },
    declined: { bg: colors.dangerBg, fg: colors.danger, label: 'Declined' },
    completed: { bg: colors.successBg, fg: colors.success, label: 'Completed' },
  }[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: map.bg }]}>
      <Text style={[styles.statusBadgeText, { color: map.fg }]}>{map.label}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={28} color={colors.textFaint} />
      </View>
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
    paddingVertical: 15,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: 15.5, fontWeight: '700', letterSpacing: 0.2 },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.slate700, fontWeight: '600', fontSize: 13 },
  chipTextSelected: { color: colors.textInverse },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingStar: { color: colors.accent, fontSize: 14, marginRight: 3 },
  ratingText: { fontWeight: '700', color: colors.text, fontSize: 13, marginRight: 3 },
  ratingCount: { color: colors.textMuted, fontSize: 12 },
  statusBadge: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  statusBadgeText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl * 2, paddingHorizontal: spacing.lg },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 19 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
