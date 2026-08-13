import React, { useMemo } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';
import { confirmAction, notify } from '../../utils/alert';

export default function AdminInsightsScreen() {
  const { adminBusinesses, categories, notifySignups, logoutAdmin } = useApp();

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
  container: { flex: 1, backgroundColor: colors.background },
  title: { fontSize: 22, fontWeight: '800', color: colors.textInverse, letterSpacing: 0.1 },
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
});
