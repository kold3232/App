import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState } from '../../components/ui';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import { ServiceRequest } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Settlement = 'automatic' | 'paid' | 'owed';

const SETTLEMENT = {
  automatic: { label: 'Taken automatically', fg: colors.success, bg: colors.successBg },
  paid: { label: 'Paid', fg: colors.textMuted, bg: colors.surfaceAlt },
  owed: { label: 'Owed', fg: colors.danger, bg: colors.dangerBg },
} as const;

export default function InvoicesScreen() {
  const { requests: allRequests, myListings, payCommission, refreshRequests, fetchCommissionState } = useApp();
  const [paying, setPaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commissionState, setCommissionState] = useState<
    Map<string, { collected: number; balancePaidInApp: boolean }>
  >(new Map());

  // One account can be both a customer and a business, so `requests` also
  // contains jobs this account booked *as a customer* from other businesses.
  // Billing those back as commission owed is wrong, and it disagreed with the
  // checkout function — which counts only jobs on this business's own
  // listings, and so reported "no commission owed" against a non-zero total.
  const myListingIds = useMemo(() => new Set(myListings.map((l) => l.id)), [myListings]);

  const invoices = useMemo(
    () => allRequests.filter((r) => myListingIds.has(r.companyId) && r.status === 'completed' && r.jobValue != null),
    [allRequests, myListingIds]
  );

  const load = useCallback(async () => {
    await refreshRequests();
  }, [refreshRequests]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // What each job has already paid towards its commission, and how. Kept
  // separate from the requests themselves because commission_paid cannot
  // answer either question: a job settled in cash and a job paid in RockServ
  // both end up with that flag set, and neither says how much was collected.
  const invoiceIds = useMemo(() => invoices.map((r) => r.id).join(','), [invoices]);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const ids = invoiceIds ? invoiceIds.split(',') : [];
      if (ids.length === 0) {
        setCommissionState(new Map());
        return;
      }
      void fetchCommissionState(ids).then((found) => {
        if (!cancelled) setCommissionState(found);
      });
      return () => {
        cancelled = true;
      };
    }, [fetchCommissionState, invoiceIds])
  );

  // What is still owed on a job: its commission, less whatever the app has
  // already taken. A deposit paid in RockServ followed by a cash balance leaves
  // part of it collected, and billing the whole amount again would charge the
  // business twice for that deposit.
  const owedOn = useCallback(
    (r: ServiceRequest): number => {
      if (r.commissionPaid) return 0;
      const collected = commissionState.get(r.id)?.collected ?? 0;
      return Math.max(0, Math.round(((r.commission ?? 0) - collected) * 100) / 100);
    },
    [commissionState]
  );

  const settlementOf = useCallback(
    (r: ServiceRequest): Settlement => {
      if (commissionState.get(r.id)?.balancePaidInApp) return 'automatic';
      if (owedOn(r) > 0) return 'owed';
      return 'paid';
    },
    [commissionState, owedOn]
  );

  // Anything still owed goes to the top — it is the only part of this screen
  // that asks the business to do something.
  const sorted = useMemo(() => {
    const rank = (r: ServiceRequest) => (owedOn(r) > 0 ? 0 : 1);
    return [...invoices].sort(
      (a, b) => rank(a) - rank(b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [invoices, owedOn]);

  const totals = useMemo(
    () =>
      invoices.reduce(
        (acc, r) => {
          acc.jobValue += r.jobValue ?? 0;
          acc.owed += owedOn(r);
          acc.automatic += commissionState.get(r.id)?.collected ?? 0;
          return acc;
        },
        { jobValue: 0, owed: 0, automatic: 0 }
      ),
    [invoices, owedOn, commissionState]
  );

  async function handlePullToRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handlePayCommission() {
    setPaying(true);
    const { error } = await payCommission();
    setPaying(false);
    if (error) notify('Could not start checkout', error);
  }

  return (
    <Screen style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Invoices</Text>
            <Text style={styles.subtitle}>
              Commission is 10% on jobs of £500 or less, and 5% above £500.
            </Text>

            <View style={styles.statRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>£{totals.jobValue.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Invoiced</Text>
              </Card>
              <Card style={[styles.statCard, totals.owed > 0 && styles.statCardOwed]}>
                <Text style={[styles.statValue, totals.owed > 0 && { color: colors.danger }]}>
                  £{totals.owed.toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Owed now</Text>
              </Card>
            </View>

            {totals.owed > 0 ? (
              <>
                <View style={styles.explain}>
                  <Text style={styles.explainText}>
                    These jobs were settled outside RockServ, so the commission on them still has to be paid here.
                    Jobs the customer pays for in the app never appear as owed — the commission comes out of the
                    payment before it reaches you.
                  </Text>
                </View>
                <View style={{ marginBottom: spacing.md }}>
                  <Button
                    title={`Pay £${totals.owed.toFixed(2)} commission`}
                    onPress={handlePayCommission}
                    loading={paying}
                  />
                </View>
              </>
            ) : (
              invoices.length > 0 && (
                <View style={[styles.explain, styles.explainClear]}>
                  <Text style={styles.explainText}>
                    Nothing to pay. Commission on jobs paid through RockServ is taken out of the payment
                    automatically, so there is no invoice to settle.
                  </Text>
                </View>
              )
            )}

            {totals.automatic > 0 && (
              <Text style={styles.footnote}>
                £{totals.automatic.toFixed(2)} has been taken automatically from payments made in the app.
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No invoices yet"
            subtitle="Completed jobs with a recorded job value will show up here."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const settlement = SETTLEMENT[settlementOf(item)];
          return (
            <Card>
              <View style={styles.row}>
                <Text style={styles.customerName}>
                  {item.contact?.companyName ?? item.contact?.name ?? item.customerName}
                </Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.category}>{item.categoryName}</Text>
              <View style={styles.amountRow}>
                <View>
                  <Text style={styles.amountLabel}>Job value</Text>
                  <Text style={styles.amountValue}>£{(item.jobValue ?? 0).toFixed(2)}</Text>
                </View>
                <View>
                  <Text style={styles.amountLabel}>Commission</Text>
                  <Text style={styles.amountValue}>£{(item.commission ?? 0).toFixed(2)}</Text>
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={[styles.badge, { backgroundColor: settlement.bg }]}>
                    <Text style={[styles.badgeText, { color: settlement.fg }]}>{settlement.label}</Text>
                  </View>
                </View>
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
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  statCard: { flex: 1 },
  statCardOwed: { borderWidth: 1, borderColor: colors.danger },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11.5, color: colors.textMuted, marginTop: 4 },
  explain: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  explainClear: { backgroundColor: colors.successBg },
  explainText: { fontSize: 12.5, color: colors.text, lineHeight: 18 },
  footnote: { fontSize: 11.5, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 17 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  date: { fontSize: 11.5, color: colors.textMuted },
  category: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 },
  amountRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  amountLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  amountValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
  badge: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: radius.pill },
  badgeText: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.2 },
});
