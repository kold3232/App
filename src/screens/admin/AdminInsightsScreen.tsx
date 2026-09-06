import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';
import { confirmAction, notify } from '../../utils/alert';

// A business that takes a lot of enquiries and logs almost no completions is
// either bad at closing or doing the work off-platform. This cannot tell the
// two apart — it just surfaces who is worth a phone call.
const LEAKAGE_MIN_REQUESTS = 3;
const LEAKAGE_RATIO = 0.25;
// Hours a business has blocked out in its own diary over the last 90 days.
// We can see the total and nothing else — no titles, no clients.
const BUSY_HOURS_FLAG = 20;

export default function AdminInsightsScreen() {
  const {
    adminBusinesses,
    categories,
    notifySignups,
    logoutAdmin,
    requests,
    businessListings,
    refreshRequests,
    busySummary,
    refreshBusySummary,
  } = useApp();

  useFocusEffect(
    useCallback(() => {
      refreshRequests();
      refreshBusySummary();
    }, [refreshRequests, refreshBusySummary])
  );

  function handleExit() {
    confirmAction('Log out of admin', 'You will need the passcode again to return to the admin dashboard.', 'Log out', logoutAdmin);
  }

  const stats = useMemo(() => {
    const approved = adminBusinesses.filter((b) => b.applicationStatus === 'approved');
    const jobsCompleted = approved.reduce((sum, b) => sum + b.jobsCompleted, 0);
    const commissionCollected = approved.reduce((sum, b) => sum + b.commissionPaid, 0);
    const commissionOwed = approved.reduce((sum, b) => sum + b.commissionOwed, 0);

    const categoryBreakdown = categories
      .map((c) => ({
        name: c.name,
        count: approved.filter((b) => b.categoryIds.includes(c.id)).length,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count);

    return { onboarded: approved.length, jobsCompleted, commissionCollected, commissionOwed, categoryBreakdown };
  }, [adminBusinesses, categories]);

  // Grouped by listing rather than by account: a business with several
  // listings can be leaking through one of them and clean on the rest.
  const conversionByListing = useMemo(() => {
    const byListing = new Map<
      string,
      { name: string; received: number; quoted: number; accepted: number; completed: number }
    >();
    requests.forEach((r) => {
      const row = byListing.get(r.companyId) ?? {
        name: r.companyName,
        received: 0,
        quoted: 0,
        accepted: 0,
        completed: 0,
      };
      row.received += 1;
      if (r.quotedAmount != null) row.quoted += 1;
      if (r.quoteAccepted) row.accepted += 1;
      if (r.status === 'completed') row.completed += 1;
      byListing.set(r.companyId, row);
    });

    return Array.from(byListing.entries())
      .map(([id, row]) => {
        const listing = businessListings.find((l) => l.id === id);
        const rate = row.received === 0 ? 0 : row.completed / row.received;
        // Diary hours are per business account, not per listing — all we get
        // back is a total, never what is in it.
        const busy = listing ? busySummary.find((b) => b.businessId === listing.businessId) : undefined;
        const busyHours = busy?.busyHours ?? 0;
        return {
          ...row,
          id,
          // The listing's current name beats the one copied onto the request,
          // which is a snapshot from whenever the request was raised.
          name: listing?.name ?? row.name,
          rate,
          busyHours,
          // Only flag once there's enough volume for the ratio to mean
          // anything — one unconverted enquiry is not a pattern.
          flagged: row.received >= LEAKAGE_MIN_REQUESTS && rate < LEAKAGE_RATIO,
          // The second, independent signal: plenty of time blocked out, no
          // RockServ jobs closed against it.
          busyFlagged: busyHours >= BUSY_HOURS_FLAG && row.completed === 0,
        };
      })
      .sort(
        (a, b) =>
          Number(b.flagged || b.busyFlagged) - Number(a.flagged || a.busyFlagged) || b.received - a.received
      );
  }, [requests, businessListings, busySummary]);

  const flaggedCount = conversionByListing.filter((r) => r.flagged || r.busyFlagged).length;

  const waitlistByCategory = useMemo(() => {
    const map = new Map<string, number>();
    notifySignups.forEach((s) => map.set(s.categoryId, (map.get(s.categoryId) ?? 0) + 1));
    return Array.from(map.entries())
      .map(([categoryId, count]) => ({
        categoryId,
        name: categories.find((c) => c.id === categoryId)?.name ?? categoryId,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [notifySignups, categories]);

  async function handleExportWaitlist() {
    if (notifySignups.length === 0) {
      notify('Nothing to export', 'No waitlist signups yet.');
      return;
    }
    const header = 'category,contact,signed_up_at';
    const rows = notifySignups.map((s) => `${s.categoryId},${s.contact},${s.createdAt}`);
    const csv = [header, ...rows].join('\n');
    try {
      await Share.share({ message: csv, title: 'RockServ waitlist export' });
    } catch {
      notify('Export failed', 'Could not open the share sheet.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.subtitle}>Basic analytics across the platform</Text>

      <View style={styles.statGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.onboarded}</Text>
          <Text style={styles.statLabel}>Businesses onboarded</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.jobsCompleted}</Text>
          <Text style={styles.statLabel}>Jobs completed</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>£{stats.commissionCollected.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Commission collected</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>£{stats.commissionOwed.toFixed(0)}</Text>
          <Text style={styles.statLabel}>Commission owed</Text>
        </Card>
      </View>

      <SectionLabel>Businesses by category</SectionLabel>
      <Card style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
        {stats.categoryBreakdown.length === 0 ? (
          <Text style={styles.emptyText}>No approved businesses yet.</Text>
        ) : (
          stats.categoryBreakdown.map((c) => (
            <View key={c.name} style={styles.tierRow}>
              <Text style={styles.tierLabel}>{c.name}</Text>
              <Text style={styles.tierValue}>{c.count}</Text>
            </View>
          ))
        )}
      </Card>

      <SectionLabel>Requests vs completions</SectionLabel>
      <Text style={styles.sectionNote}>
        Enquiries received against jobs actually logged as complete, plus how much time each business blocks out in
        its own calendar. A business under {Math.round(LEAKAGE_RATIO * 100)}% on {LEAKAGE_MIN_REQUESTS}+ enquiries is
        flagged, as is one with {BUSY_HOURS_FLAG}h+ booked and nothing logged against it. Both are prompts to look,
        not proof of anything — and we only ever see the hours, never who they are for.
      </Text>
      {conversionByListing.length === 0 ? (
        <EmptyState
          icon="trending-up-outline"
          title="No requests yet"
          subtitle="Once customers start sending requests, conversion per business shows up here."
        />
      ) : (
        <Card style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
          {flaggedCount > 0 && (
            <Text style={styles.flagSummary}>
              {flaggedCount} {flaggedCount === 1 ? 'business' : 'businesses'} worth a look
            </Text>
          )}
          {conversionByListing.map((row) => (
            <View key={row.id} style={styles.conversionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.conversionName}>
                  {row.flagged || row.busyFlagged ? '⚠️ ' : ''}
                  {row.name}
                </Text>
                <Text style={styles.conversionDetail}>
                  {row.received} received · {row.quoted} quoted · {row.accepted} accepted · {row.completed} completed
                </Text>
                {row.busyHours > 0 && (
                  <Text style={[styles.conversionDetail, row.busyFlagged && styles.busyFlaggedText]}>
                    {row.busyHours}h blocked out in their own calendar (90 days)
                    {row.busyFlagged ? ' — nothing logged against it' : ''}
                  </Text>
                )}
              </View>
              <Text style={[styles.conversionRate, row.flagged && styles.conversionRateFlagged]}>
                {Math.round(row.rate * 100)}%
              </Text>
            </View>
          ))}
        </Card>
      )}

      <SectionLabel>"Notify me" waitlist</SectionLabel>
      {waitlistByCategory.length === 0 ? (
        <EmptyState icon="mail-outline" title="No signups yet" subtitle="Waitlist signups from coming-soon categories will show here." />
      ) : (
        <Card style={{ marginTop: spacing.xs }}>
          {waitlistByCategory.map((w) => (
            <View key={w.categoryId} style={styles.tierRow}>
              <Text style={styles.tierLabel}>{w.name}</Text>
              <Text style={styles.tierValue}>{w.count}</Text>
            </View>
          ))}
          <View style={{ marginTop: spacing.md }}>
            <Button title="Export waitlist" variant="outline" onPress={handleExportWaitlist} />
          </View>
        </Card>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Button title="Log out of admin" variant="outline" onPress={handleExit} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { width: '47%' },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tierLabel: { fontSize: 14, color: colors.text, textTransform: 'capitalize' },
  tierValue: { fontSize: 14, fontWeight: '700', color: colors.primary },
  emptyText: { fontSize: 13, color: colors.textMuted },
  sectionNote: { fontSize: 11.5, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  flagSummary: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  conversionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  conversionName: { fontSize: 14, fontWeight: '700', color: colors.text },
  conversionDetail: { fontSize: 11.5, color: colors.textMuted, marginTop: 3 },
  conversionRate: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
    minWidth: 48,
    textAlign: 'right',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  conversionRateFlagged: { color: colors.danger, backgroundColor: 'rgba(220,38,38,0.08)' },
  busyFlaggedText: { color: colors.danger, fontWeight: '600' },
});
