import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';

export default function InvoicesScreen() {
  const { requests } = useApp();

  const invoices = useMemo(
    () =>
      requests
        .filter((r) => r.status === 'completed' && r.jobValue != null)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests]
  );

  const totals = useMemo(
    () => ({
      jobValue: invoices.reduce((sum, r) => sum + (r.jobValue ?? 0), 0),
      commission: invoices.reduce((sum, r) => sum + (r.commission ?? 0), 0),
    }),
    [invoices]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Invoices</Text>
            <Text style={styles.subtitle}>
              Commission is 10% on completed jobs of £500 or less, and 5% on jobs above £500.
            </Text>
            <View style={styles.statRow}>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>£{totals.jobValue.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total invoiced</Text>
              </Card>
              <Card style={styles.statCard}>
                <Text style={styles.statValue}>£{totals.commission.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Commission owed</Text>
              </Card>
            </View>
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
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.customerName}>{item.customerName}</Text>
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
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.sm },
  statCard: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11.5, color: colors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  customerName: { fontSize: 15, fontWeight: '700', color: colors.text },
  date: { fontSize: 11.5, color: colors.textMuted },
  category: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 },
  amountRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  amountLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  amountValue: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 2 },
});
