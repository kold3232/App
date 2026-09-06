import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, Card, EmptyState, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';
import { confirmAction, notify } from '../../utils/alert';

export default function TeamScreen() {
  const {
    employees,
    employeeSeats,
    refreshEmployees,
    inviteEmployee,
    setEmployeeStatus,
    removeEmployee,
    requestEmployeeAccess,
    myEmployeeAccessRequest,
    businessAccount,
  } = useApp();

  const [showInvite, setShowInvite] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [askingAccess, setAskingAccess] = useState(false);
  const [accessNote, setAccessNote] = useState('');

  useFocusEffect(
    useCallback(() => {
      refreshEmployees();
    }, [refreshEmployees])
  );

  const active = employees.filter((e) => e.status !== 'disabled');
  const seatsLeft = Math.max(0, employeeSeats - active.length);

  async function handleInvite() {
    if (!name.trim()) return;
    setBusy(true);
    const { error, code } = await inviteEmployee({ name: name.trim(), email: email.trim(), phone: phone.trim() });
    setBusy(false);
    if (error) {
      notify('Could not add employee', error);
      return;
    }
    setName('');
    setEmail('');
    setPhone('');
    setShowInvite(false);
    notify(
      'Invite code created',
      `Give ${code} to your employee. They download RockServ, choose "I work for a business", sign up, and enter the code.`
    );
  }

  async function handleShareCode(employeeName: string, code: string) {
    try {
      await Share.share({
        message: `${employeeName}, here's your RockServ staff invite code: ${code}\n\nDownload RockServ, tap "I work for a business", create your login, then enter this code.`,
      });
    } catch {
      notify('Could not share', 'Read the code out instead — it is on the card.');
    }
  }

  async function handleRequestAccess() {
    setBusy(true);
    const { error } = await requestEmployeeAccess(accessNote.trim());
    setBusy(false);
    if (error) {
      notify('Could not send request', error);
      return;
    }
    setAskingAccess(false);
    setAccessNote('');
    notify('Request sent', 'The RockServ team will review it and get back to you about seats and pricing.');
  }

  function handleRemove(id: string, employeeName: string) {
    confirmAction(
      `Remove ${employeeName}?`,
      'They lose access to every job immediately. Jobs already assigned to them stay on your dashboard.',
      'Remove',
      async () => {
        const { error } = await removeEmployee(id);
        if (error) notify('Could not remove', error);
      }
    );
  }

  const pendingRequest = myEmployeeAccessRequest?.status === 'pending' ? myEmployeeAccessRequest : null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <Text style={styles.title}>Your team</Text>
        <Text style={styles.subtitle}>
          Staff accounts see only the jobs you assign them — not your other jobs, not each other, not your billing.
        </Text>

        {employeeSeats === 0 ? (
          <Card style={{ marginTop: spacing.md }}>
            <SectionLabel>Multi-employee access</SectionLabel>
            <Text style={styles.blurb}>
              If you have staff rather than working alone, we can turn on employee accounts for{' '}
              {businessAccount?.name || 'your business'}. Someone from RockServ reviews each request and sets the
              number of seats with you.
            </Text>
            {pendingRequest ? (
              <View style={styles.pendingPill}>
                <Ionicons name="time-outline" size={14} color={colors.primary} />
                <Text style={styles.pendingText}>
                  Requested {new Date(pendingRequest.createdAt).toLocaleDateString()} — waiting on RockServ
                </Text>
              </View>
            ) : askingAccess ? (
              <View style={{ marginTop: spacing.sm }}>
                <SectionLabel>How many staff, and what do they do?</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={accessNote}
                  onChangeText={setAccessNote}
                  placeholder="e.g. 4 fitters and a supervisor, mostly bathroom installs"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  multiline
                />
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button title="Send request" onPress={handleRequestAccess} loading={busy} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Cancel" variant="outline" onPress={() => setAskingAccess(false)} />
                  </View>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: spacing.md }}>
                <Button
                  title="Request multi-employee access"
                  variant="accent"
                  onPress={() => setAskingAccess(true)}
                />
                {myEmployeeAccessRequest?.status === 'rejected' && (
                  <Text style={styles.rejectedNote}>
                    A previous request wasn't approved
                    {myEmployeeAccessRequest.adminNote ? `: ${myEmployeeAccessRequest.adminNote}` : '.'}
                  </Text>
                )}
              </View>
            )}
          </Card>
        ) : (
          <>
            <View style={styles.seatRow}>
              <Card style={styles.seatCard}>
                <Text style={styles.seatValue}>{active.length}</Text>
                <Text style={styles.seatLabel}>On the team</Text>
              </Card>
              <Card style={styles.seatCard}>
                <Text style={styles.seatValue}>{seatsLeft}</Text>
                <Text style={styles.seatLabel}>Seats left</Text>
              </Card>
            </View>

            {showInvite ? (
              <Card>
                <SectionLabel>Add an employee</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Their name"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email (optional)"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone (optional)"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  keyboardType="phone-pad"
                />
                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button title="Create invite" onPress={handleInvite} loading={busy} disabled={!name.trim()} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Cancel" variant="outline" onPress={() => setShowInvite(false)} />
                  </View>
                </View>
              </Card>
            ) : (
              <Button
                title={seatsLeft > 0 ? 'Add an employee' : 'All seats used'}
                onPress={() => setShowInvite(true)}
                disabled={seatsLeft === 0}
              />
            )}

            <View style={{ height: spacing.md }} />

            {employees.length === 0 ? (
              <EmptyState
                icon="people-outline"
                title="No staff yet"
                subtitle="Add someone and give them the invite code that appears."
              />
            ) : (
              employees.map((employee) => (
                <Card key={employee.id} style={{ marginBottom: spacing.md }}>
                  <View style={styles.row}>
                    <Text style={styles.employeeName}>{employee.name}</Text>
                    <Text
                      style={[
                        styles.statusChip,
                        employee.status === 'active' && styles.statusActive,
                        employee.status === 'disabled' && styles.statusDisabled,
                      ]}
                    >
                      {employee.status === 'invited'
                        ? 'Not signed up yet'
                        : employee.status === 'active'
                        ? 'Active'
                        : 'Disabled'}
                    </Text>
                  </View>
                  {(employee.email || employee.phone) && (
                    <Text style={styles.employeeMeta}>{[employee.email, employee.phone].filter(Boolean).join(' · ')}</Text>
                  )}

                  {employee.status === 'invited' && (
                    <Pressable
                      style={styles.codeBox}
                      onPress={() => handleShareCode(employee.name, employee.inviteCode)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.codeLabel}>Invite code</Text>
                        <Text style={styles.code}>{employee.inviteCode}</Text>
                      </View>
                      <Ionicons name="share-outline" size={18} color={colors.primary} />
                    </Pressable>
                  )}

                  <View style={styles.actions}>
                    {employee.status === 'active' && (
                      <View style={{ flex: 1 }}>
                        <Button
                          title="Disable"
                          variant="outline"
                          onPress={() => setEmployeeStatus(employee.id, 'disabled')}
                        />
                      </View>
                    )}
                    {employee.status === 'disabled' && (
                      <View style={{ flex: 1 }}>
                        <Button
                          title="Re-enable"
                          variant="outline"
                          onPress={() => setEmployeeStatus(employee.id, 'active')}
                        />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Button title="Remove" variant="danger" onPress={() => handleRemove(employee.id, employee.name)} />
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18, marginBottom: spacing.md },
  blurb: { fontSize: 13, color: colors.text, marginTop: spacing.sm, lineHeight: 19 },
  seatRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  seatCard: { flex: 1 },
  seatValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  seatLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  employeeName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  employeeMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  statusChip: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statusActive: { color: colors.success },
  statusDisabled: { color: colors.danger },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  code: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: 3, marginTop: 2 },
  pendingPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  pendingText: { fontSize: 12.5, color: colors.primary, fontWeight: '600', flex: 1 },
  rejectedNote: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
  },
});
