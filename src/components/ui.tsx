import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'accent';
  disabled?: boolean;
  loading?: boolean;
}) {
  const styleForVariant = {
    primary: shadow.card,
    secondary: { backgroundColor: colors.surface, ...shadow.card },
    danger: { backgroundColor: colors.danger, ...shadow.card },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.accent },
    accent: shadow.card,
  }[variant];
  const textColor =
    variant === 'outline' ? colors.accent : variant === 'secondary' ? colors.slate700 : colors.textInverse;

  const content = loading ? (
    <ActivityIndicator color={textColor} />
  ) : (
    <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
  );

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
      {variant === 'primary' && (
        <LinearGradient
          colors={[colors.buttonGradientStart, colors.buttonGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientFill}
        />
      )}
      {variant === 'accent' && (
        <LinearGradient
          colors={[colors.accentGradientStart, colors.accentGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientFill}
        />
      )}
      {content}
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

/**
 * A single-choice field that opens a sheet rather than spreading every option
 * across the form. Chips are good for four or five choices; past that they
 * become a wall the eye has to scan, which is what Gibraltar's area list had
 * turned into.
 *
 * Built on Modal rather than a picker library because the two native pickers
 * look nothing like each other, and this has to sit in the middle of our own
 * form without looking borrowed.
 */
export function Select({
  value,
  options,
  onSelect,
  placeholder = 'Choose one',
  title,
}: {
  value: string | null;
  options: readonly string[];
  onSelect: (option: string) => void;
  placeholder?: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);

  function choose(option: string) {
    onSelect(option);
    setOpen(false);
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.selectField, pressed && styles.buttonPressed]}
      >
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]}>{value ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textFaint} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        {/* Tapping the dimmed area closes, which is what people expect of a
            sheet and saves hunting for a cancel button. */}
        <Pressable style={styles.selectBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.selectSheet} onPress={() => {}}>
            <View style={styles.selectGrabber} />
            {title ? <Text style={styles.selectTitle}>{title}</Text> : null}
            <ScrollView bounces={false}>
              {options.map((option) => {
                const selected = option === value;
                return (
                  <Pressable
                    key={option}
                    onPress={() => choose(option)}
                    style={({ pressed }) => [styles.selectOption, pressed && styles.selectOptionPressed]}
                  >
                    <Text style={[styles.selectOptionText, selected && styles.selectOptionTextSelected]}>
                      {option}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.85 },
  buttonText: { fontSize: 15.5, fontWeight: '700', letterSpacing: 0.2 },
  gradientFill: { ...StyleSheet.absoluteFillObject, borderRadius: radius.pill },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { color: colors.slate700, fontWeight: '600', fontSize: 13 },
  chipTextSelected: { color: colors.textInverse },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
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
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  selectValue: { fontSize: 15, color: colors.text, flex: 1 },
  selectPlaceholder: { color: colors.textFaint },
  selectBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  selectSheet: {
    maxHeight: '70%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  selectGrabber: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  selectTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectOptionPressed: { opacity: 0.6 },
  selectOptionText: { fontSize: 15, color: colors.text },
  selectOptionTextSelected: { fontWeight: '700', color: colors.primary },
});
