import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { notify } from '../utils/alert';

/**
 * RockServ takes every payment through the app, so a business that has not
 * finished setting up Stripe cannot be paid — and therefore cannot work.
 *
 * Rather than hide their jobs, which would look like RockServ is dead and
 * gives them no reason to finish setting up, they see the requests coming in
 * and cannot act on them. The work in front of them is the argument.
 */
export function usePaymentSetupGate() {
  const { paymentAccount } = useApp();
  const navigation = useNavigation<any>();

  const locked = !paymentAccount.chargesEnabled;

  function promptSetup() {
    notify(
      'Set up payments first',
      'Customers pay for jobs through RockServ, so you need a payment account before you can take work. ' +
        'It takes a few minutes — Settings › Payments.'
    );
  }

  function goToSetup() {
    navigation.navigate('Payments');
  }

  return { locked, promptSetup, goToSetup };
}

/** The banner that explains why everything below it is greyed out. */
export function PaymentSetupBanner() {
  const { locked, goToSetup } = usePaymentSetupGate();
  if (!locked) return null;

  return (
    <Pressable onPress={goToSetup} style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed" size={16} color={colors.textInverse} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Set up payments to start working</Text>
        <Text style={styles.body}>
          Customers pay for jobs in RockServ, so you need a payment account before you can accept any of these. Takes
          a few minutes.
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.primary} />
    </Pressable>
  );
}

/**
 * Wraps something a business cannot use yet. It stays visible and readable but
 * dimmed, and tapping it explains why rather than doing nothing — a control
 * that silently ignores you reads as broken.
 */
export function LockedForPaymentSetup({ children }: { children: React.ReactNode }) {
  const { locked, promptSetup } = usePaymentSetupGate();
  if (!locked) return <>{children}</>;

  return (
    <Pressable onPress={promptSetup}>
      <View pointerEvents="none" style={styles.dimmed}>
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  bannerPressed: { opacity: 0.85 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: colors.text },
  body: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  dimmed: { opacity: 0.45 },
});
