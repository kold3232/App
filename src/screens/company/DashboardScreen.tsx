import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, EmptyState, StatusBadge } from '../../components/ui';
import { ChatModal } from '../../components/ChatModal';
import { googleMapsUrl, useApp } from '../../context/AppContext';
import { RequestStatus } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';
import { generateSlots } from '../../utils/booking';

const FILTERS: { id: RequestStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'completed', label: 'Completed' },
  { id: 'declined', label: 'Declined' },
];

export default function DashboardScreen() {
  const {
    requests: allRequests,
    updateRequestStatus,
    completeRequest,
    rescheduleRequest,
    myListings,
    businessAccount,
    refreshRequests,
    employees,
    refreshEmployees,
    assignRequestToEmployee,
  } = useApp();
  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');

  useFocusEffect(
    useCallback(() => {
      refreshRequests();
      refreshEmployees();
    }, [refreshRequests, refreshEmployees])
  );
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [jobValueInput, setJobValueInput] = useState('');
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignNotes, setAssignNotes] = useState('');
  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'active'), [employees]);
  const slots = useMemo(() => generateSlots(), []);
  // A single account can hold both roles, and can now own several listings —
  // only show requests addressed to one of this business's own listings.
  const myListingIds = useMemo(() => new Set(myListings.map((l) => l.id)), [myListings]);
  const requests = useMemo(
    () => allRequests.filter((r) => myListingIds.has(r.companyId)),
    [allRequests, myListingIds]
  );
  const chatRequest = requests.find((r) => r.id === chatRequestId) ?? null;

  function startCompleting(id: string, quotedAmount?: number) {
    setCompletingId(id);
    setJobValueInput(quotedAmount ? String(quotedAmount) : '');
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

  async function handleAssign(requestId: string, employeeId: string, address?: string) {
    const { error } = await assignRequestToEmployee(requestId, employeeId, {
      notes: assignNotes.trim(),
      mapUrl: address ? googleMapsUrl(address) : '',
    });
    if (error) {
      notify('Could not assign', error);
      return;
    }
    setAssigningId(null);
    setAssignNotes('');
  }

  async function handleUnassign(requestId: string) {
    const { error } = await assignRequestToEmployee(requestId, null, { notes: '', mapUrl: '' });
    if (error) notify('Could not unassign', error);
  }

  function confirmReschedule(id: string, slotId: string) {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;
    rescheduleRequest(id, `${slot.dayLabel} · ${slot.time}`);
    notify('Booking rescheduled', `Updated to ${slot.dayLabel} at ${slot.time}.`);
    setReschedulingId(null);
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
              Requests customers send in to {businessAccount?.name || 'your business'}
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
              Case #{item.caseNumber} · {item.categoryName} · {item.type === 'instant' ? 'Instant booking' : 'Quote request'}
            </Text>
            {myListings.length > 1 && <Text style={styles.forListing}>For {item.companyName}</Text>}
            {item.jobDetails ? <Text style={styles.detail}>{item.jobDetails}</Text> : null}
            <Text style={styles.meta} numberOfLines={1}>
              📍 {item.contact ? item.contact.address : item.area || 'Area not given'}
              {item.type === 'instant' && item.scheduledSlot ? `  ·  🗓️ ${item.scheduledSlot}` : ''}
              {item.type === 'quote' && item.preferredDate ? `  ·  🗓️ ${item.preferredDate}` : ''}
            </Text>
            {item.contact ? (
              <Text style={styles.meta}>📞 {item.contact.phone}</Text>
            ) : (
              <Text style={styles.locked}>
                🔒 {item.customerName}'s full name, phone number and exact address unlock as soon as they accept
                your quote. Use the chat to ask anything you need to price the job.
              </Text>
            )}
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
            {/* Assignment only makes sense once the job is on. Marking the job
                complete stays here on the manager's side either way — an
                employee's "done" is just a nudge that it is ready to close. */}
            {activeEmployees.length > 0 && (item.status === 'accepted' || item.status === 'pending') && (
              <View style={styles.assignBox}>
                {item.assignedEmployeeId ? (
                  <View style={styles.assignedRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.assignedTo}>
                        Assigned to{' '}
                        {employees.find((e) => e.id === item.assignedEmployeeId)?.name ?? 'a former employee'}
                      </Text>
                      <Text style={styles.assignedStatus}>
                        {item.employeeDone
                          ? `✓ Marked done${item.employeeDoneAt ? ` ${new Date(item.employeeDoneAt).toLocaleDateString()}` : ''} — ready for you to complete`
                          : 'Not finished yet'}
                      </Text>
                      {item.assignmentNotes ? <Text style={styles.assignedNotes}>{item.assignmentNotes}</Text> : null}
                    </View>
                    <Text style={styles.unassignLink} onPress={() => handleUnassign(item.id)}>
                      Unassign
                    </Text>
                  </View>
                ) : assigningId === item.id ? (
                  <View>
                    <Text style={styles.assignLabel}>Assign to</Text>
                    <TextInput
                      style={styles.assignInput}
                      value={assignNotes}
                      onChangeText={setAssignNotes}
                      placeholder="Anything they need to know (optional)"
                      placeholderTextColor={colors.textFaint}
                      selectionColor={colors.primary}
                      multiline
                    />
                    <View style={styles.chipWrap}>
                      {activeEmployees.map((employee) => (
                        <Chip
                          key={employee.id}
                          label={employee.name}
                          onPress={() => handleAssign(item.id, employee.id, item.contact?.address)}
                        />
                      ))}
                    </View>
                    <View style={{ marginTop: spacing.sm }}>
                      <Button title="Cancel" variant="outline" onPress={() => setAssigningId(null)} />
                    </View>
                  </View>
                ) : (
                  <Text
                    style={styles.assignLink}
                    onPress={() => {
                      setAssignNotes('');
                      setAssigningId(item.id);
                    }}
                  >
                    + Assign to an employee
                  </Text>
                )}
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
                  <Button
                    title="Mark as completed"
                    onPress={() => startCompleting(item.id, item.quotedAmount)}
                    variant="secondary"
                  />
                </View>
              ))}
            {item.type === 'quote' && (item.status === 'pending' || item.status === 'accepted') && (
              <View style={styles.actions}>
                <Button title="Chat with customer" variant="outline" onPress={() => setChatRequestId(item.id)} />
              </View>
            )}
            {item.status === 'accepted' && item.type === 'instant' && completingId !== item.id && (
              reschedulingId === item.id ? (
                <View style={styles.completeForm}>
                  <Text style={styles.completeLabel}>Pick a new slot</Text>
                  <View style={styles.chipWrap}>
                    {slots.map((s) => (
                      <Chip
                        key={s.id}
                        label={`${s.dayLabel} · ${s.time}`}
                        onPress={() => confirmReschedule(item.id, s.id)}
                      />
                    ))}
                  </View>
                  <View style={{ height: spacing.sm }} />
                  <Button title="Cancel" variant="outline" onPress={() => setReschedulingId(null)} />
                </View>
              ) : (
                <View style={styles.actions}>
                  <Button title="Reschedule" variant="outline" onPress={() => setReschedulingId(item.id)} />
                </View>
              )
            )}
            {item.status === 'completed' && item.jobValue != null && (
              <View style={styles.completedSummary}>
                <Text style={styles.completedText}>Job value £{item.jobValue.toFixed(2)}</Text>
                <Text style={styles.completedText}>Commission £{(item.commission ?? 0).toFixed(2)}</Text>
              </View>
            )}
            {item.status === 'completed' && (
              <Text style={styles.confirmStatus}>
                {item.customerConfirmed ? '✓ Confirmed by customer' : 'Awaiting customer confirmation'}
              </Text>
            )}
            {item.type === 'quote' && item.status === 'completed' && (
              <View style={{ marginTop: spacing.sm }}>
                <Button title="View chat" variant="outline" onPress={() => setChatRequestId(item.id)} />
              </View>
            )}
          </Card>
        )}
      />
      {chatRequest && (
        <ChatModal
          visible={!!chatRequest}
          onClose={() => setChatRequestId(null)}
          request={chatRequest}
          perspective="business"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, marginBottom: spacing.xs },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  category: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 },
  detail: { fontSize: 13, color: colors.text, marginTop: spacing.sm },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  forListing: { fontSize: 11.5, color: colors.textMuted, fontWeight: '600', marginTop: 3 },
  locked: { fontSize: 11.5, color: colors.textMuted, marginTop: 8, lineHeight: 17, fontStyle: 'italic' },
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
  confirmStatus: { fontSize: 11.5, color: colors.textMuted, marginTop: 6 },
  assignBox: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  assignLink: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  assignLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  assignInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.text,
    marginTop: 6,
    minHeight: 46,
    textAlignVertical: 'top',
  },
  assignedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  assignedTo: { fontSize: 13, fontWeight: '700', color: colors.text },
  assignedStatus: { fontSize: 11.5, color: colors.textMuted, marginTop: 3 },
  assignedNotes: { fontSize: 11.5, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  unassignLink: { fontSize: 12, fontWeight: '700', color: colors.danger },
});
