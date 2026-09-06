import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Chip, EmptyState } from '../../components/ui';
import { googleMapsUrl, useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';
import { confirmAction, notify } from '../../utils/alert';

export default function EmployeeJobsScreen() {
  const { requests, refreshRequests, setEmployeeJobDone, myEmployment, signOutEmployee } = useApp();
  const [filter, setFilter] = useState<'open' | 'done' | 'all'>('open');
  const [busyId, setBusyId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshRequests();
    }, [refreshRequests])
  );

  // RLS already limits this account to jobs assigned to it, so there is no
  // filtering to do here — what comes back is the whole of their work.
  const jobs = useMemo(() => {
    const sorted = [...requests].sort(
      (a, b) => new Date(b.assignedAt ?? b.createdAt).getTime() - new Date(a.assignedAt ?? a.createdAt).getTime()
    );
    if (filter === 'open') return sorted.filter((r) => !r.employeeDone && r.status !== 'completed');
    if (filter === 'done') return sorted.filter((r) => r.employeeDone || r.status === 'completed');
    return sorted;
  }, [requests, filter]);

  async function toggleDone(id: string, done: boolean) {
    setBusyId(id);
    const { error } = await setEmployeeJobDone(id, done);
    setBusyId(null);
    if (error) notify('Could not update', error);
  }

  function confirmDone(id: string) {
    confirmAction(
      'Mark this job done?',
      'This tells your manager the work is finished. They still close the job off with the customer.',
      'Mark done',
      () => toggleDone(id, true)
    );
  }

  async function openMaps(url: string) {
    try {
      await Linking.openURL(url);
    } catch {
      notify('Could not open Maps', 'No maps app is available on this device.');
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>My jobs</Text>
                <Text style={styles.subtitle}>{myEmployment?.name ? `Signed in as ${myEmployment.name}` : 'Staff account'}</Text>
              </View>
              <Pressable onPress={signOutEmployee} hitSlop={12} style={styles.signOut}>
                <Ionicons name="log-out-outline" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <View style={styles.filterRow}>
              <Chip label="To do" selected={filter === 'open'} onPress={() => setFilter('open')} />
              <Chip label="Done" selected={filter === 'done'} onPress={() => setFilter('done')} />
              <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="hammer-outline"
            title={filter === 'open' ? 'Nothing to do right now' : 'Nothing here'}
            subtitle="Jobs your manager assigns to you will show up in this list."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const mapUrl = item.assignmentMapUrl || (item.contact ? googleMapsUrl(item.contact.address) : '');
          return (
            <Card>
              <View style={styles.row}>
                <Text style={styles.jobTitle}>Case #{item.caseNumber}</Text>
                {item.status === 'completed' ? (
                  <Text style={styles.closedChip}>Closed by manager</Text>
                ) : item.employeeDone ? (
                  <Text style={styles.doneChip}>Marked done</Text>
                ) : null}
              </View>
              <Text style={styles.category}>{item.categoryName}</Text>
              {item.jobDetails ? <Text style={styles.detail}>{item.jobDetails}</Text> : null}
              {item.assignmentNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>From your manager</Text>
                  <Text style={styles.notesText}>{item.assignmentNotes}</Text>
                </View>
              ) : null}

              {item.contact ? (
                <View style={styles.contactBox}>
                  <Text style={styles.contactLine}>{item.contact.name}</Text>
                  <Pressable onPress={() => Linking.openURL(`tel:${item.contact!.phone.replace(/\s/g, '')}`)}>
                    <Text style={styles.contactLink}>{item.contact.phone}</Text>
                  </Pressable>
                  <Text style={styles.contactLine}>{item.contact.address}</Text>
                </View>
              ) : (
                <Text style={styles.meta}>📍 {item.area || 'Area not given'}</Text>
              )}

              {item.scheduledSlot ? <Text style={styles.meta}>🗓️ {item.scheduledSlot}</Text> : null}
              {item.preferredDate ? <Text style={styles.meta}>🗓️ Preferred: {item.preferredDate}</Text> : null}

              <View style={styles.actions}>
                {mapUrl ? (
                  <View style={{ flex: 1 }}>
                    <Button title="Open in Maps" variant="outline" onPress={() => openMaps(mapUrl)} />
                  </View>
                ) : null}
                {item.status !== 'completed' && (
                  <View style={{ flex: 1 }}>
                    <Button
                      title={item.employeeDone ? 'Undo done' : 'Mark done'}
                      variant={item.employeeDone ? 'secondary' : 'primary'}
                      loading={busyId === item.id}
                      onPress={() => (item.employeeDone ? toggleDone(item.id, false) : confirmDone(item.id))}
                    />
                  </View>
                )}
              </View>

              {item.employeeDone && item.status !== 'completed' && (
                <Text style={styles.footnote}>
                  Your manager closes the job off with the customer — nothing else for you to do here.
                </Text>
              )}
            </Card>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 3 },
  signOut: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  jobTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  doneChip: { fontSize: 10.5, fontWeight: '700', color: colors.success, textTransform: 'uppercase', letterSpacing: 0.4 },
  closedChip: { fontSize: 10.5, fontWeight: '700', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
  category: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 },
  detail: { fontSize: 13.5, color: colors.text, marginTop: spacing.sm, lineHeight: 19 },
  notesBox: {
    marginTop: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  notesText: { fontSize: 13, color: colors.text, marginTop: 4, lineHeight: 18 },
  contactBox: { marginTop: spacing.sm, gap: 2 },
  contactLine: { fontSize: 13, color: colors.text },
  contactLink: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  footnote: { fontSize: 11.5, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic', lineHeight: 16 },
});
