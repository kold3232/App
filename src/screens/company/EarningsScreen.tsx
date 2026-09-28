import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState } from '../../components/ui';
import { PaymentSetupBanner, usePaymentSetupGate } from '../../components/PaymentSetupGate';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import { JobPayment, ServiceRequest } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

const money = (n: number) => `£${n.toFixed(2)}`;

type Line = {
  request: ServiceRequest;
  received: number;
  awaiting: number;
  state: 'paid' | 'awaiting' | 'deposit' | 'none';
};

const STATE = {
  paid: { label: 'Paid', fg: colors.success, bg: colors.successBg },
  awaiting: { label: 'Awaiting payment', fg: colors.pending, bg: colors.pendingBg },
  deposit: { label: 'Deposit paid', fg: colors.info, bg: colors.infoBg },
  none: { label: 'Not due yet', fg: colors.textMuted, bg: colors.surfaceAlt },
} as const;

/**
 * What a business has actually been paid, and what is still coming.
 *
 * Deliberately not the old invoices screen with the sign flipped. That one
 * existed to bill the business; this one exists to show them their money. The
 * number that matters is what lands in their account — the job value less
 * RockServ's cut — which is not a column anywhere and has to be worked out
 * from the payments themselves.
 */
export default function EarningsScreen() {
  const { requests: allRequests, myListings, refreshRequests, fetchPaymentsFor, openPayoutsDashboard } = useApp();
  const { locked } = usePaymentSetupGate();
  const [payments, setPayments] = useState<Map<string, JobPayment[]>>(new Map());
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState(false);

  // One account can be both a customer and a business, so `requests` also
  // holds jobs this account booked from other businesses. Those are money
  // going out, not coming in.
  const myListingIds = useMemo(() => new Set(myListings.map((l) => l.id)), [myListings]);
  const myJobs = useMemo(
    () => allRequests.filter((r) => myListingIds.has(r.companyId) && r.status !== 'declined'),
    [allRequests, myListingIds]
  );

  const jobIds = useMemo(() => myJobs.map((r) => r.id).join(','), [myJobs]);

  useFocusEffect(
    useCallback(() => {
      void refreshRequests();
    }, [refreshRequests])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const ids = jobIds ? jobIds.split(',') : [];
      if (ids.length === 0) {
        setPayments(new Map());
        return;
      }
      void fetchPaymentsFor(ids).then((found) => {
        if (!cancelled) setPayments(found);
      });
      return () => {
        cancelled = true;
      };
    }, [fetchPaymentsFor, jobIds])
  );

  const lines = useMemo<Line[]>(() => {
    return myJobs
      .map((request) => {
        const paid = (payments.get(request.id) ?? []).filter((p) => p.status === 'paid');
        // What actually reaches the business: what the customer paid, less the
        // commission taken out of that same payment.
        const received = paid.reduce((sum, p) => sum + (p.amount - p.commission), 0);

        const depositPaid = paid.some((p) => p.kind === 'deposit');
        const balancePaid = paid.some((p) => p.kind === 'final');
        const depositAmountPaid = paid.filter((p) => p.kind === 'deposit').reduce((s, p) => s + p.amount, 0);

        let awaiting = 0;
        let state: Line['state'] = 'none';

        if (request.status === 'completed' && request.jobValue != null && !balancePaid) {
          // The job is done and the balance has not been paid. What is left of
          // the job value, less whatever the deposit already covered, is still
          // owed — and the business keeps all of it bar the remaining
          // commission, which is taken from that payment when it happens.
          const outstanding = Math.max(0, request.jobValue - depositAmountPaid);
          const remainingCommission = Math.max(0, (request.commission ?? 0) - paid.reduce((s, p) => s + p.commission, 0));
          awaiting = Math.max(0, Math.round((outstanding - remainingCommission) * 100) / 100);
          state = 'awaiting';
        } else if (balancePaid) {
          state = 'paid';
        } else if (request.depositAmount && !depositPaid) {
          // A deposit asked for and not yet paid. The job is on hold, so this
          // is money waiting on the customer rather than on the work.
          const commissionShare = Math.round(request.depositAmount * 0.05 * 100) / 100;
          awaiting = Math.max(0, Math.round((request.depositAmount - commissionShare) * 100) / 100);
          state = 'awaiting';
        } else if (depositPaid) {
          state = 'deposit';
        }

        return { request, received, awaiting, state };
      })
      .filter((l) => l.received > 0 || l.awaiting > 0)
      .sort((a, b) => {
        // Anything owed first — it is the only part that needs chasing.
        if ((b.awaiting > 0 ? 1 : 0) !== (a.awaiting > 0 ? 1 : 0)) return b.awaiting > 0 ? 1 : -1;
        return new Date(b.request.createdAt).getTime() - new Date(a.request.createdAt).getTime();
      });
  }, [myJobs, payments]);

  const totals = useMemo(
    () =>
      lines.reduce(
        (acc, l) => {
          acc.received += l.received;
          acc.awaiting += l.awaiting;
          return acc;
        },
        { received: 0, awaiting: 0 }
      ),
    [lines]
  );

  async function handleRefresh() {
    setRefreshing(true);
    await refreshRequests();
    setRefreshing(false);
  }

  async function handleOpenPayouts() {
    setOpening(true);
    const { error } = await openPayoutsDashboard();
    setOpening(false);
    if (error) notify('Could not open Stripe', error);
  }

  return (
    <Screen style={styles.container}>
      <FlatList
        data={lines}
        keyExtractor={(l) => l.request.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Earnings</Text>
            <Text style={styles.subtitle}>
              What customers have paid you through RockServ, after commission.
            </Text>

            <PaymentSetupBanner />

            <View style={styles.statRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>{money(totals.received)}</Text>
                <Text style={styles.statLabel}>Paid to you</Text>
              </Card>
              <Card style={[styles.statCard, totals.awaiting > 0 && styles.statCardAwaiting]}>
                <Text style={[styles.statValue, totals.awaiting > 0 && { color: colors.pending }]}>
                  {money(totals.awaiting)}
                </Text>
                <Text style={styles.statLabel}>Still to come</Text>
              </Card>
            </View>

            {!locked && (
              <Pressable
                onPress={handleOpenPayouts}
                disabled={opening}
                style={({ pressed }) => [styles.payoutRow, pressed && styles.payoutRowPressed]}
              >
                <Ionicons name="business-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutTitle}>{opening ? 'Opening…' : 'View payouts on Stripe'}</Text>
                  <Text style={styles.payoutBody}>
                    When the money reaches your bank, and your payout schedule. RockServ can't see that.
                  </Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.textFaint} />
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="cash-outline"
            title="Nothing yet"
            subtitle="Once a customer pays for a job, what you earned from it shows up here."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const tone = STATE[item.state];
          return (
            <Card>
              <View style={styles.row}>
                <Text style={styles.customer} numberOfLines={1}>
                  {item.request.contact?.companyName ?? item.request.contact?.name ?? item.request.customerName}
                </Text>
                <View style={[styles.badge, { backgroundColor: tone.bg }]}>
                  <Text style={[styles.badgeText, { color: tone.fg }]}>{tone.label}</Text>
                </View>
              </View>
              <Text style={styles.category}>
                Case #{item.request.caseNumber} · {item.request.categoryName}
              </Text>
              <View style={styles.amountRow}>
                {item.received > 0 && (
                  <View>
                    <Text style={styles.amountLabel}>Paid to you</Text>
                    <Text style={[styles.amountValue, { color: colors.success }]}>{money(item.received)}</Text>
                  </View>
                )}
                {item.awaiting > 0 && (
                  <View>
                    <Text style={styles.amountLabel}>Still to come</Text>
                    <Text style={[styles.amountValue, { color: colors.pending }]}>{money(item.awaiting)}</Text>
                  </View>
                )}
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18, marginBottom: spacing.md },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1 },
  statCardAwaiting: { borderWidth: 1, borderColor: colors.pending },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.success },
  statLabel: { fontSize: 11.5, color: colors.textMuted, marginTop: 4 },
  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payoutRowPressed: { opacity: 0.85 },
  payoutTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  payoutBody: { fontSize: 11.5, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  customer: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  category: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 },
  amountRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amountLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  amountValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  badge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill },
  badgeText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.2 },
});
