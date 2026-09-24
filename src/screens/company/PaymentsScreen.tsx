import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

/**
 * Where a business connects itself to Stripe so customers can pay it in the
 * app.
 *
 * RockServ collects none of this. Bank details, ID and date of birth go
 * straight to Stripe, which is licensed to hold them and does the identity
 * checks. What comes back is three booleans — and only one of them, whether
 * the account can take charges, actually decides anything.
 */
export default function PaymentsScreen() {
  const { paymentAccount, startPaymentSetup, refreshPaymentAccount } = useApp();
  const [busy, setBusy] = useState(false);

  // Onboarding happens in the browser, so the answer changes while this screen
  // is not on top. Re-reading it on focus is what makes coming back from
  // Stripe show the new state instead of the old one.
  useFocusEffect(
    useCallback(() => {
      void refreshPaymentAccount();
    }, [refreshPaymentAccount])
  );

  async function handleSetup() {
    setBusy(true);
    const { error } = await startPaymentSetup();
    setBusy(false);
    if (error) notify('Could not open payment setup', error);
  }

  const { connected, chargesEnabled, payoutsEnabled, detailsSubmitted } = paymentAccount;

  const state = !connected
    ? 'none'
    : chargesEnabled && payoutsEnabled
      ? 'ready'
      : detailsSubmitted
        ? 'reviewing'
        : 'unfinished';

  const copy = {
    none: {
      tone: 'muted' as const,
      label: 'Not set up',
      blurb:
        'Customers cannot pay you through RockServ yet. Setting up takes a few minutes and needs your bank details and some ID.',
      action: 'Set up payments',
    },
    unfinished: {
      tone: 'warn' as const,
      label: 'Half finished',
      blurb: 'Stripe still needs a few things from you before you can be paid. Picking up where you left off is fine.',
      action: 'Finish setting up',
    },
    reviewing: {
      tone: 'info' as const,
      label: 'Being checked',
      blurb:
        'Stripe has everything and is reviewing it. This is usually quick. If they need anything else they will ask here.',
      action: 'Check again',
    },
    ready: {
      tone: 'good' as const,
      label: 'Ready',
      blurb: 'Customers can pay you in the app, and the money lands in your bank account automatically.',
      action: 'Manage on Stripe',
    },
  }[state];

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <Text style={styles.title}>Payments</Text>
        <Text style={styles.subtitle}>
          Customers pay for the job in RockServ. Your money goes straight to your own account — RockServ never holds
          it.
        </Text>

        <Card style={[styles.statusCard, styles[`tone_${copy.tone}`]]}>
          <Text style={[styles.statusLabel, styles[`toneText_${copy.tone}`]]}>{copy.label}</Text>
          <Text style={styles.statusBlurb}>{copy.blurb}</Text>
          <View style={{ marginTop: spacing.md }}>
            <Button title={copy.action} onPress={handleSetup} loading={busy} />
          </View>
        </Card>

        <SectionLabel>How it works</SectionLabel>
        <Card style={{ marginTop: spacing.sm }}>
          <Step
            icon="pricetag-outline"
            title="You quote, they accept"
            body="Same as now. Nothing about quoting changes."
          />
          <Step
            icon="shield-outline"
            title="Ask for a deposit if you want one"
            body="Optional, and it comes off the final bill rather than being extra. Useful when you are buying materials up front."
          />
          <Step
            icon="hammer-outline"
            title="Do the job, then mark it complete"
            body="The customer is asked to pay once you say the work is done — never before."
          />
          <Step
            icon="cash-outline"
            title="You get paid"
            body="RockServ's commission comes out of the payment automatically. There is no invoice to settle afterwards."
            last
          />
        </Card>

        {state === 'ready' && (
          <>
            <View style={{ height: spacing.lg }} />
            <SectionLabel>Your account</SectionLabel>
            <Card style={{ marginTop: spacing.sm }}>
              <Flag label="Can take payments" ok={chargesEnabled} />
              <Flag label="Can receive payouts" ok={payoutsEnabled} />
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Step({
  icon,
  title,
  body,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.step, !last && styles.stepBorder]}>
      <View style={styles.stepIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

function Flag({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View style={styles.flagRow}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={ok ? colors.success : colors.textFaint}
      />
      <Text style={styles.flagLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18, marginBottom: spacing.md },
  statusCard: { marginBottom: spacing.lg, borderLeftWidth: 4 },
  tone_muted: { borderLeftColor: colors.textFaint },
  tone_info: { borderLeftColor: colors.info },
  tone_good: { borderLeftColor: colors.success },
  tone_warn: { borderLeftColor: colors.danger },
  statusLabel: { fontSize: 15, fontWeight: '800' },
  toneText_muted: { color: colors.textMuted },
  toneText_info: { color: colors.info },
  toneText_good: { color: colors.success },
  toneText_warn: { color: colors.danger },
  statusBlurb: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  step: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm, alignItems: 'flex-start' },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  stepBody: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  flagRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  flagLabel: { fontSize: 13.5, color: colors.text },
});
