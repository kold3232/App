import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, EmptyState, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

export default function AdminQueueScreen() {
  const {
    adminBusinesses,
    categories,
    approveAdminApplication,
    rejectAdminApplication,
    employeeAccessRequests,
    refreshEmployeeAccessRequests,
    reviewEmployeeAccessRequest,
  } = useApp();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [seatsById, setSeatsById] = useState<Record<string, string>>({});
  const [adminNote, setAdminNote] = useState('');

  useFocusEffect(
    useCallback(() => {
      refreshEmployeeAccessRequests();
    }, [refreshEmployeeAccessRequests])
  );

  const pending = adminBusinesses.filter((b) => b.applicationStatus === 'pending');
  const pendingSeatRequests = employeeAccessRequests.filter((r) => r.status === 'pending');

  async function handleSeatDecision(id: string, approve: boolean) {
    const seats = parseInt(seatsById[id] ?? '', 10);
    if (approve && (!seats || seats < 1)) {
      notify('Enter a seat count', 'Say how many staff accounts this business gets before approving.');
      return;
    }
    const { error } = await reviewEmployeeAccessRequest(id, { approve, seats, note: adminNote.trim() });
    if (error) {
      notify('Could not save', error);
      return;
    }
    setAdminNote('');
    notify(approve ? 'Approved' : 'Rejected', approve ? `${seats} employee seats granted.` : 'The business has been told.');
  }

  function categoryNames(ids: string[]) {
    return ids.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(', ');
  }

  function handleApprove(id: string, name: string) {
    approveAdminApplication(id);
    notify('Approved', `${name} is now live on RockServ.`);
  }

  function handleRejectConfirm(id: string, name: string) {
    if (!reason.trim()) return;
    rejectAdminApplication(id, reason.trim());
    notify('Rejected', `${name}'s application was rejected.`);
    setRejectingId(null);
    setReason('');
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Application queue</Text>
            <Text style={styles.subtitle}>
              {pending.length} application{pending.length === 1 ? '' : 's'} pending
              {pendingSeatRequests.length > 0
                ? ` · ${pendingSeatRequests.length} employee access request${pendingSeatRequests.length === 1 ? '' : 's'}`
                : ''}
            </Text>

            {pendingSeatRequests.length > 0 && (
              <View style={styles.seatSection}>
                <SectionLabel>Employee access requests</SectionLabel>
                <Text style={styles.seatNote}>
                  Seats are granted by hand. Decide the number with the business — and any extra charge — then set it
                  here. There is no fixed limit or price.
                </Text>
                {pendingSeatRequests.map((request) => (
                  <Card key={request.id} style={{ marginTop: spacing.sm }}>
                    <Text style={styles.businessName}>{request.businessName || 'Unnamed business'}</Text>
                    <Text style={styles.contact}>{request.businessEmail}</Text>
                    {request.note ? <Text style={styles.seatRequestNote}>“{request.note}”</Text> : null}
                    <Text style={styles.submitted}>Asked {new Date(request.createdAt).toLocaleDateString()}</Text>
                    <View style={styles.seatInputRow}>
                      <TextInput
                        style={styles.seatInput}
                        value={seatsById[request.id] ?? ''}
                        onChangeText={(t) => setSeatsById((prev) => ({ ...prev, [request.id]: t.replace(/[^0-9]/g, '') }))}
                        placeholder="Seats"
                        placeholderTextColor={colors.textFaint}
                        selectionColor={colors.primary}
                        keyboardType="number-pad"
                      />
                      <TextInput
                        style={[styles.input, styles.seatNoteInput]}
                        value={adminNote}
                        onChangeText={setAdminNote}
                        placeholder="Note back to them (optional)"
                        placeholderTextColor={colors.textFaint}
                        selectionColor={colors.primary}
                      />
                    </View>
                    <View style={styles.actions}>
                      <View style={{ flex: 1 }}>
                        <Button title="Approve seats" onPress={() => handleSeatDecision(request.id, true)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button title="Reject" variant="danger" onPress={() => handleSeatDecision(request.id, false)} />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="Queue is clear" subtitle="No pending applications right now." />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const isRejecting = rejectingId === item.id;
          return (
            <Card>
              <Text style={styles.businessName}>{item.businessName}</Text>
              <Text style={styles.meta}>{categoryNames(item.categoryIds)}</Text>
              <Text style={styles.submitted}>Submitted {new Date(item.submittedAt).toLocaleDateString()}</Text>
              <Text style={styles.contact}>{item.contactEmail} · {item.contactPhone}</Text>
              <Text style={styles.docNote}>
                Document verification isn't wired up yet — review based on this profile for now.
              </Text>

              {isRejecting ? (
                <View style={styles.rejectBox}>
                  <SectionLabel>Rejection reason</SectionLabel>
                  <TextInput
                    style={styles.input}
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Explain what needs fixing..."
                    placeholderTextColor={colors.textFaint}
                    selectionColor={colors.primary}
                    multiline
                  />
                  <View style={styles.actions}>
                    <View style={{ flex: 1 }}>
                      <Button title="Cancel" variant="secondary" onPress={() => { setRejectingId(null); setReason(''); }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button title="Confirm reject" variant="danger" onPress={() => handleRejectConfirm(item.id, item.businessName)} disabled={!reason.trim()} />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button title="Approve" onPress={() => handleApprove(item.id, item.businessName)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Reject" variant="danger" onPress={() => setRejectingId(item.id)} />
                  </View>
                </View>
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
  header: { marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  businessName: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12.5, color: colors.primary, fontWeight: '600', marginTop: 2 },
  docNote: { fontSize: 11.5, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  submitted: { fontSize: 11.5, color: colors.textMuted, marginTop: spacing.sm },
  contact: { fontSize: 12, color: colors.text, marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  rejectBox: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  seatSection: { marginTop: spacing.lg },
  seatNote: { fontSize: 11.5, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  seatRequestNote: { fontSize: 13, color: colors.text, marginTop: spacing.sm, fontStyle: 'italic', lineHeight: 18 },
  seatInputRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'flex-start' },
  seatInput: {
    width: 74,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  seatNoteInput: { flex: 1, marginTop: 0, minHeight: 0 },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    fontSize: 13,
    color: colors.text,
    marginTop: 6,
    minHeight: 60,
    textAlignVertical: 'top',
  },
});
