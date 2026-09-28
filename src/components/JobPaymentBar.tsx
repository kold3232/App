import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { ChatMessageSender, JobPayment, ServiceRequest } from '../types';
import { colors, radius, spacing } from '../theme';
import { confirmAction, notify } from '../utils/alert';
import { Button } from './ui';

const money = (n: number) => `£${n.toFixed(2)}`;

/**
 * The money end of a job, for whichever side is looking at it.
 *
 * A customer sees what there is to pay and pays it. A business asks for a
 * deposit, sees what has landed, and can hand it back. Both read the same
 * rows — job_payments is written only by the edge functions, so what is shown
 * here is what Stripe actually confirmed, never what the app hoped happened.
 *
 * Deliberately quiet when there is nothing to do: a job with no quote, no
 * deposit and no completion renders nothing at all.
 */
export function JobPaymentBar({
  request,
  perspective,
  readOnly,
}: {
  request: ServiceRequest;
  perspective: ChatMessageSender;
  readOnly?: boolean;
}) {
  const {
    fetchJobPayments,
    payForJob,
    requestDeposit,
    cancelDepositRequest,
    refundJobPayment,
    paymentAccount,
  } = useApp();

  const [payments, setPayments] = useState<JobPayment[]>([]);
  const [busy, setBusy] = useState(false);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositInput, setDepositInput] = useState('');

  const load = useCallback(async () => {
    setPayments(await fetchJobPayments(request.id));
  }, [fetchJobPayments, request.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const paidDeposit = payments.find((p) => p.kind === 'deposit' && p.status === 'paid');
  const paidFinal = payments.find((p) => p.kind === 'final' && p.status === 'paid');

  const total = request.jobValue ?? request.quotedAmount ?? 0;
  const depositDue = request.depositAmount ?? 0;
  const balanceDue = request.jobValue ? Math.max(0, request.jobValue - (paidDeposit?.amount ?? 0)) : 0;

  async function handlePay(kind: 'deposit' | 'final') {
    setBusy(true);
    const { error, cancelled } = await payForJob(request.id, kind);
    setBusy(false);
    if (cancelled) return;
    if (error) {
      notify('Payment not taken', error);
      return;
    }
    await load();
    notify(
      'Paid',
      kind === 'deposit'
        ? 'Your deposit has been sent. It comes off the final bill.'
        : 'Thanks — the job is paid in full.'
    );
  }

  async function handleRequestDeposit() {
    const amount = parseFloat(depositInput);
    if (!amount || amount <= 0) {
      notify('Enter an amount', 'Type how much deposit you need before the job starts.');
      return;
    }
    setBusy(true);
    const { error } = await requestDeposit(request.id, amount);
    setBusy(false);
    if (error) {
      notify('Could not request that', error);
      return;
    }
    setShowDepositForm(false);
    setDepositInput('');
  }

  function handleRefund(payment: JobPayment) {
    confirmAction(
      `Refund ${money(payment.amount)}?`,
      'The money goes back to the customer and the RockServ commission on it is returned too. This cannot be undone.',
      'Refund',
      async () => {
        setBusy(true);
        const { error } = await refundJobPayment(payment.id);
        setBusy(false);
        if (error) {
          notify('Could not refund', error);
          return;
        }
        await load();
      }
    );
  }

  // --- Customer ------------------------------------------------------------
  if (perspective === 'customer') {
    const canPayDeposit = !!request.quoteAccepted && depositDue > 0 && !paidDeposit;
    const canPayBalance = request.status === 'completed' && balanceDue > 0 && !paidFinal;

    if (!canPayDeposit && !canPayBalance && !paidDeposit && !paidFinal) return null;

    return (
      <View style={styles.bar}>
        {paidDeposit && (
          <Row
            icon="checkmark-circle"
            tone="good"
            label={`Deposit paid — ${money(paidDeposit.amount)}`}
            detail={paidFinal ? undefined : `Comes off the ${money(total)} total.`}
          />
        )}
        {paidFinal && <Row icon="checkmark-circle" tone="good" label="Paid in full" />}

        {canPayDeposit && !readOnly && (
          <>
            <Row
              icon="shield-outline"
              tone="info"
              label={`${money(depositDue)} deposit required`}
              detail={`The job can't be booked in until this is paid. It comes off the ${money(total)} total — you are not paying extra.`}
            />
            <Button
              title={busy ? 'Opening…' : `Pay ${money(depositDue)} deposit`}
              onPress={() => handlePay('deposit')}
              loading={busy}
            />
          </>
        )}

        {canPayBalance && !readOnly && (
          <>
            <Row
              icon="briefcase-outline"
              tone="info"
              label="The job is finished"
              detail={
                paidDeposit
                  ? `${money(total)} total, less the ${money(paidDeposit.amount)} deposit you have already paid.`
                  : 'Payment is made here in RockServ.'
              }
            />
            <Button
              title={busy ? 'Opening…' : `Pay ${money(balanceDue)}`}
              onPress={() => handlePay('final')}
              loading={busy}
            />
          </>
        )}
      </View>
    );
  }

  // --- Business ------------------------------------------------------------
  if (readOnly) return null;

  // Nothing below is any use to a business that cannot yet be paid, and
  // saying so here is more useful than letting them ask for a deposit that
  // would fail at the card sheet.
  if (!paymentAccount.chargesEnabled) {
    if (!request.quoteAccepted) return null;
    return (
      <View style={styles.bar}>
        <Row
          icon="alert-circle-outline"
          tone="warn"
          label="Set up payments to get paid in the app"
          detail="Settings › Payments. Until then this job has to be settled between you and the customer directly."
        />
      </View>
    );
  }

  const somethingToShow = request.quoteAccepted || payments.length > 0;
  if (!somethingToShow) return null;

  return (
    <View style={styles.bar}>
      {paidDeposit && (
        <View style={styles.paidRow}>
          <Row icon="checkmark-circle" tone="good" label={`Deposit paid — ${money(paidDeposit.amount)}`} />
          <Pressable onPress={() => handleRefund(paidDeposit)} disabled={busy} hitSlop={8}>
            <Text style={styles.refundLink}>Refund</Text>
          </Pressable>
        </View>
      )}
      {paidFinal && (
        <View style={styles.paidRow}>
          <Row icon="checkmark-circle" tone="good" label={`Paid in full — ${money(paidFinal.amount)}`} />
          <Pressable onPress={() => handleRefund(paidFinal)} disabled={busy} hitSlop={8}>
            <Text style={styles.refundLink}>Refund</Text>
          </Pressable>
        </View>
      )}

      {!paidDeposit && depositDue > 0 && (
        <View style={styles.paidRow}>
          <Row
            icon="hourglass-outline"
            tone="info"
            label={`${money(depositDue)} deposit required`}
            detail="The job is on hold until the customer pays it."
          />
          <Pressable onPress={() => cancelDepositRequest(request.id)} disabled={busy} hitSlop={8}>
            <Text style={styles.refundLink}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {!paidDeposit && depositDue === 0 && request.quoteAccepted && request.status !== 'completed' && (
        showDepositForm ? (
          <View>
            <TextInput
              style={styles.input}
              value={depositInput}
              onChangeText={setDepositInput}
              placeholder={`Deposit amount (£) — job is ${money(total)}`}
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              keyboardType="decimal-pad"
            />
            <View style={styles.formActions}>
              <View style={{ flex: 1 }}>
                <Button title="Ask for it" onPress={handleRequestDeposit} loading={busy} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Cancel" variant="secondary" onPress={() => setShowDepositForm(false)} />
              </View>
            </View>
          </View>
        ) : (
          <Pressable style={styles.toggle} onPress={() => setShowDepositForm(true)}>
            <Ionicons name="shield-outline" size={16} color={colors.primary} />
            <Text style={styles.toggleText}>Ask for a deposit</Text>
          </Pressable>
        )
      )}

      {request.status === 'completed' && !paidFinal && (
        <Row
          icon="hourglass-outline"
          tone="info"
          label={`${money(balanceDue)} due from the customer`}
          detail="They pay in the app. Your share lands in your Stripe account automatically."
        />
      )}
    </View>
  );
}

function Row({
  icon,
  label,
  detail,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  tone: 'good' | 'info' | 'warn';
}) {
  const color = tone === 'good' ? colors.success : tone === 'warn' ? colors.danger : colors.primary;
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={16} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color }]}>{label}</Text>
        {detail ? <Text style={styles.rowDetail}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, flex: 1 },
  rowLabel: { fontSize: 13.5, fontWeight: '700' },
  rowDetail: { fontSize: 12, color: colors.textMuted, marginTop: 2, lineHeight: 17 },
  paidRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  refundLink: { fontSize: 12, fontWeight: '700', color: colors.textFaint, textDecorationLine: 'underline' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.xs },
  toggleText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  input: {
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
