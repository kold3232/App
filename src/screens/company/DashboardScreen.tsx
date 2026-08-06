import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, EmptyState, StatusBadge } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { RequestStatus } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

const FILTERS: { id: RequestStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'completed', label: 'Completed' },
  { id: 'declined', label: 'Declined' },
];

export default function DashboardScreen() {
  const { requests, updateRequestStatus, completeRequest, companyProfile } = useApp();
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [jobValueInput, setJobValueInput] = useState('');

  function startCompleting(id: string) {
    setCompletingId(id);
    setJobValueInput('');
  }

  function confirmCompleting(id: string) {
    const value = parseFloat(jobValueInput);
    if (!value || value <= 0) {
      notify('Enter a job value', 'Please enter the final job value to complete this booking.');
      return;
    }
    completeRequest(id, value);
    setCompletingId(null);
  }

  const filtered = useMemo(
    () => (filter === 'all' ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Incoming requests</Text>
            <Text style={styles.subtitle}>
              Requests customers send in to {companyProfile.name || 'your business'}
            </Text>
            <View style={styles.filterRow}>
              {FILTERS.map((f) => (
                <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="file-tray-outline" title="Nothing here yet" subtitle="New customer requests will show up in this list." />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.category}>
              {item.categoryName} · {item.type === 'instant' ? 'Instant booking' : 'Quote request'}
            </Text>
            {item.jobDetails ? <Text style={styles.detail}>{item.jobDetails}</Text> : null}
            <Text style={styles.meta} numberOfLines={1}>
              📍 {item.address}
              {item.type === 'instant' && item.scheduledSlot ? `  ·  🗓️ ${item.scheduledSlot}` : ''}
              {item.type === 'quote' && item.preferredDate ? `  ·  🗓️ ${item.preferredDate}` : ''}
            </Text>
            <Text style={styles.meta}>📞 {item.phone}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>

            {item.status === 'pending' && (
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <Button title="Accept" onPress={() => updateRequestStatus(item.id, 'accepted')} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="Decline" onPress={() => updateRequestStatus(item.id, 'declined')} variant="danger" />
                </View>
              </View>
            )}
            {item.status === 'accepted' &&
              (completingId === item.id ? (
                <View style={styles.completeForm}>
                  <Text style={styles.completeLabel}>Job value (£)</Text>
                  <TextInput
                    style={styles.jobValueInput}
                    value={jobValueInput}
                    onChangeText={setJobValueInput}
                    placeholder="e.g. 120"
                    placeholderTextColor={colors.textFaint}
                    selectionColor={colors.primary}
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.actions}>
                    <View style={{ flex: 1 }}>
                      <Button title="Confirm completion" onPress={() => confirmCompleting(item.id)} variant="secondary" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button title="Cancel" variant="outline" onPress={() => setCompletingId(null)} />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Button title="Mark as completed" onPress={() => startCompleting(item.id)} variant="secondary" />
                </View>
              ))}
            {item.status === 'completed' && item.jobValue != null && (
              <View style={styles.completedSummary}>
                <Text style={styles.completedText}>Job value £{item.jobValue.toFixed(2)}</Text>
                <Text style={styles.completedText}>Commission £{(item.commission ?? 0).toFixed(2)}</Text>
              </View>
            )}
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
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  category: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 },
  detail: { fontSize: 13, color: colors.text, marginTop: spacing.sm },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  completeForm: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  completeLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  jobValueInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  completedSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  completedText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
});
