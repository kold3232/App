import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, EmptyState, StatusBadge } from '../../components/ui';
import { Screen } from '../../components/Screen';
import { Calendar } from '../../components/Calendar';
import { ChatModal } from '../../components/ChatModal';
import { LockedForPaymentSetup, PaymentSetupBanner } from '../../components/PaymentSetupGate';
import { useApp } from '../../context/AppContext';
import { ServiceRequest } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';
import { callNumber, googleMapsUrl, openInMaps } from '../../utils/maps';
import { colorFromId } from '../../utils/color';
import { hoursSince, timeAgo } from '../../utils/waiting';
import { MIN_CARD_PAYMENT, tooSmallToCharge } from '../../utils/money';

const SCHEDULE_TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

type Filter = 'all' | 'active' | 'completed';

const money = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

function initials(name: string): string {
  const words = name.replace(/[^a-zA-Z ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/**
 * A deposit is money taken before the work starts, so until it lands the work
 * does not start. Asking for one and then cracking on anyway would make it
 * meaningless — and would leave the business exposed on exactly the jobs where
 * they felt they needed protecting.
 */
function awaitingDeposit(r: ServiceRequest): boolean {
  return !!r.depositAmount && r.depositAmount > 0 && !r.depositPaidAt && r.status !== 'completed';
}

export default function DashboardScreen() {
  const {
    requests: allRequests,
    updateRequestStatus,
    completeRequest,
    myListings,
    businessAccount,
    refreshRequests,
    employees,
    refreshEmployees,
    assignRequestToEmployee,
    setRequestSchedule,
    refreshPaymentAccount,
  } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshRequests();
      refreshEmployees();
      // The lock banner lives on this screen, but the answer it depends on was
      // only ever refreshed by the Payments screen. A business finishing Stripe
      // setup came back here and was still told it could not work, until
      // something happened to remount the app. Ask again on the way in.
      refreshPaymentAccount();
    }, [refreshRequests, refreshEmployees, refreshPaymentAccount])
  );

  const [completingId, setCompletingId] = useState<string | null>(null);
  const [jobValueInput, setJobValueInput] = useState('');
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignNotes, setAssignNotes] = useState('');
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState('09:00');

  const activeEmployees = useMemo(() => employees.filter((e) => e.status === 'active'), [employees]);
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
    // The customer pays this on a card, so a figure below Stripe's floor would
    // close the job and then refuse to be paid.
    if (value < MIN_CARD_PAYMENT) {
      notify('Too small to charge', tooSmallToCharge('a job'));
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

  async function handleSchedule(requestId: string) {
    if (!scheduleDate) return;
    const [h, m] = scheduleTime.split(':').map(Number);
    const [y, mo, d] = scheduleDate.split('-').map(Number);
    const at = new Date(y, mo - 1, d, h, m, 0, 0);
    const { error } = await setRequestSchedule(requestId, at.toISOString());
    if (error) {
      notify('Could not schedule', error);
      return;
    }
    setSchedulingId(null);
    setScheduleDate(null);
  }

  async function handlePullToRefresh() {
    setRefreshing(true);
    await Promise.all([refreshRequests(), refreshEmployees()]);
    setRefreshing(false);
  }

  async function handleConfirmPreferred(requestId: string, preferredFor: string) {
    const { error } = await setRequestSchedule(requestId, preferredFor);
    if (error) notify('Could not confirm', error);
  }

  async function handleUnassign(requestId: string) {
    const { error } = await assignRequestToEmployee(requestId, null, { notes: '', mapUrl: '' });
    if (error) notify('Could not unassign', error);
  }

  const counts = useMemo(
    () => ({
      all: requests.length,
      active: requests.filter((r) => r.status === 'pending' || r.status === 'accepted').length,
      completed: requests.filter((r) => r.status === 'completed').length,
    }),
    [requests]
  );

  const visible = useMemo(() => {
    const base =
      filter === 'active'
        ? requests.filter((r) => r.status === 'pending' || r.status === 'accepted')
        : filter === 'completed'
          ? requests.filter((r) => r.status === 'completed')
          : requests;
    // A new request is the only thing on this screen with a clock on it, so it
    // goes to the top wherever it appears.
    return [...base].sort((a, b) => {
      const rank = (r: ServiceRequest) => (r.status === 'pending' ? 0 : r.status === 'accepted' ? 1 : 2);
      return rank(a) - rank(b) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [requests, filter]);

  /** The one line under the customer's name: what this job is waiting on. */
  function summaryLine(r: ServiceRequest): { icon: keyof typeof Ionicons.glyphMap; text: string; tone: string } {
    if (r.status === 'declined') return { icon: 'close-circle-outline', text: 'Declined', tone: colors.danger };
    if (r.status === 'completed') return { icon: 'checkmark-circle-outline', text: 'Finished', tone: colors.success };
    if (awaitingDeposit(r)) {
      return {
        icon: 'hourglass-outline',
        text: `Waiting for ${money(r.depositAmount ?? 0)} deposit`,
        tone: colors.pending,
      };
    }
    // How long it has been waiting, not just that it is waiting. A business
    // scrolling past "needs a reply" for the fourth day running should be able
    // to see that is what they are doing.
    if (r.status === 'pending') {
      const stale = hoursSince(r.createdAt) >= 24;
      return {
        icon: 'alert-circle-outline',
        text: stale ? `Needs a reply · sent ${timeAgo(r.createdAt)}` : 'Needs a reply',
        tone: stale ? colors.danger : colors.pending,
      };
    }
    if (r.scheduledFor) return { icon: 'calendar-outline', text: when(r.scheduledFor), tone: colors.success };
    if (r.preferredFor) return { icon: 'calendar-outline', text: `Asked for ${when(r.preferredFor)}`, tone: colors.info };
    return { icon: 'time-outline', text: 'No time set', tone: colors.pending };
  }

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'active', label: 'Active', count: counts.active },
    { id: 'completed', label: 'Completed', count: counts.completed },
  ];

  return (
    <Screen style={styles.container}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handlePullToRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Requests</Text>
            <Text style={styles.subtitle}>Sent in to {businessAccount?.name || 'your business'}</Text>
            <View style={styles.segment}>
              {FILTERS.map((f) => {
                const on = filter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setFilter(f.id)}
                    style={[styles.segmentItem, on && styles.segmentItemOn]}
                  >
                    <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                      {f.label}
                      {f.count > 0 ? ` · ${f.count}` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <PaymentSetupBanner />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="file-tray-outline"
            title={filter === 'all' ? 'Nothing here yet' : `Nothing ${filter}`}
            subtitle={
              filter === 'all'
                ? 'New customer requests will show up in this list.'
                : 'Switch to All to see your other jobs.'
            }
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const expanded = expandedId === item.id;
          const summary = summaryLine(item);
          const name = item.contact?.companyName ?? item.customerName;
          const amount = item.jobValue ?? item.quotedAmount;
          const scheduling = schedulingId === item.id;
          const completing = completingId === item.id;
          const assigning = assigningId === item.id;
          const assignee = employees.find((e) => e.id === item.assignedEmployeeId);

          return (
            <LockedForPaymentSetup>
              <View style={styles.card}>
                <View style={styles.head}>
                  <View style={[styles.avatar, { backgroundColor: colorFromId(item.customerId) }]}>
                    <Text style={styles.avatarText}>{initials(name)}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.customer} numberOfLines={1}>
                      {name}
                    </Text>
                    <Text style={styles.category} numberOfLines={1}>
                      {item.categoryName}
                      {myListings.length > 1 ? ` · ${item.companyName}` : ''}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                  <Pressable
                    onPress={() => setExpandedId(expanded ? null : item.id)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.expandButton, pressed && styles.expandButtonPressed]}
                    accessibilityLabel={expanded ? 'Hide full details' : 'Show full details'}
                  >
                    <Ionicons name={expanded ? 'remove' : 'add'} size={18} color={colors.primary} />
                  </Pressable>
                </View>

                <View style={styles.summary}>
                  <View style={styles.summaryLeft}>
                    <Ionicons name={summary.icon} size={14} color={summary.tone} />
                    <Text style={[styles.summaryText, { color: summary.tone }]} numberOfLines={1}>
                      {summary.text}
                    </Text>
                  </View>
                  {amount != null && <Text style={styles.amount}>{money(amount)}</Text>}
                </View>

                {/* A form takes over the card while it is open, so the actions
                    below never argue with it. */}
                {scheduling ? (
                  <View style={styles.form}>
                    <Text style={styles.formLabel}>When is this happening?</Text>
                    <Calendar selectedDate={scheduleDate} onSelectDate={setScheduleDate} />
                    {scheduleDate && (
                      <View style={styles.chipWrap}>
                        {SCHEDULE_TIMES.map((t) => (
                          <Chip key={t} label={t} selected={scheduleTime === t} onPress={() => setScheduleTime(t)} />
                        ))}
                      </View>
                    )}
                    <View style={styles.actions}>
                      <View style={{ flex: 1 }}>
                        <Button title="Cancel" variant="outline" onPress={() => setSchedulingId(null)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button title="Save" onPress={() => handleSchedule(item.id)} disabled={!scheduleDate} />
                      </View>
                    </View>
                  </View>
                ) : completing ? (
                  <View style={styles.form}>
                    <Text style={styles.formLabel}>What did the job come to?</Text>
                    <TextInput
                      style={styles.input}
                      value={jobValueInput}
                      onChangeText={setJobValueInput}
                      placeholder="e.g. 120"
                      placeholderTextColor={colors.textFaint}
                      selectionColor={colors.primary}
                      keyboardType="decimal-pad"
                    />
                    <View style={styles.actions}>
                      <View style={{ flex: 1 }}>
                        <Button title="Cancel" variant="outline" onPress={() => setCompletingId(null)} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button title="Finish job" onPress={() => confirmCompleting(item.id)} />
                      </View>
                    </View>
                  </View>
                ) : assigning ? (
                  <View style={styles.form}>
                    <Text style={styles.formLabel}>Who is doing it?</Text>
                    <TextInput
                      style={styles.input}
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
                    <Button title="Cancel" variant="outline" onPress={() => setAssigningId(null)} />
                  </View>
                ) : (
                  <>
                    <View style={styles.actions}>
                      {item.status !== 'declined' && (
                        <View style={{ flex: 1 }}>
                          <Button title="Chat" variant="outline" onPress={() => setChatRequestId(item.id)} />
                        </View>
                      )}

                      {item.status === 'pending' && (
                        <View style={{ flex: 1 }}>
                          <Button title="Accept" onPress={() => updateRequestStatus(item.id, 'accepted')} />
                        </View>
                      )}

                      {item.status === 'accepted' && !awaitingDeposit(item) && (
                        <View style={{ flex: 1 }}>
                          {!item.scheduledFor && item.preferredFor ? (
                            <Button
                              title="Confirm time"
                              onPress={() => handleConfirmPreferred(item.id, item.preferredFor!)}
                            />
                          ) : !item.scheduledFor ? (
                            <Button
                              title="Set a time"
                              onPress={() => {
                                setScheduleDate(null);
                                setSchedulingId(item.id);
                              }}
                            />
                          ) : (
                            <Button title="Finish job" onPress={() => startCompleting(item.id, item.quotedAmount)} />
                          )}
                        </View>
                      )}
                    </View>

                    {/* Declining is deliberate, so it is a link rather than a
                        button sitting next to Accept. */}
                    {item.status === 'pending' && (
                      <Pressable onPress={() => updateRequestStatus(item.id, 'declined')} hitSlop={8}>
                        <Text style={styles.decline}>Can't take this one</Text>
                      </Pressable>
                    )}

                    {awaitingDeposit(item) && (
                      <Text style={styles.waiting}>
                        Nothing can be booked in until the {money(item.depositAmount ?? 0)} deposit is paid. Nudge them
                        in the chat.
                      </Text>
                    )}

                    {item.status === 'completed' && item.jobValue != null && (
                      <Text style={styles.youGet}>
                        You receive {money(item.jobValue - (item.commission ?? 0))} of {money(item.jobValue)}
                      </Text>
                    )}
                  </>
                )}

                {expanded && (
                  <View style={styles.details}>
                    <Text style={styles.detailLabel}>What they asked for</Text>
                    {item.jobDetails ? (
                      <Text style={styles.detailBody}>{item.jobDetails}</Text>
                    ) : (
                      <Text style={styles.detailMeta}>No description was given.</Text>
                    )}

                    {item.isBusinessCustomer && (
                      <View style={styles.detailRow}>
                        <Ionicons name="business-outline" size={13} color={colors.textFaint} />
                        <Text style={styles.detailMeta}>Booking for a company</Text>
                      </View>
                    )}

                    {/* Once the address is unlocked it becomes a link into the
                        Maps app, which is where a tradesman actually wants it.
                        Before that there is only an area, and nothing to route
                        to. */}
                    {item.contact ? (
                      <>
                        <Pressable onPress={() => openInMaps(item.contact!.address)} hitSlop={6} style={styles.detailRow}>
                          <Ionicons name="location-outline" size={13} color={colors.primary} />
                          <Text style={[styles.detailMeta, styles.link]} numberOfLines={2}>
                            {item.contact.address} · Open in Maps
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => callNumber(item.contact!.phone)} hitSlop={6} style={styles.detailRow}>
                          <Ionicons name="call-outline" size={13} color={colors.primary} />
                          <Text style={[styles.detailMeta, styles.link]}>{item.contact.phone}</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <View style={styles.detailRow}>
                          <Ionicons name="location-outline" size={13} color={colors.textFaint} />
                          <Text style={styles.detailMeta}>{item.area || 'Area not given'}</Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Ionicons name="lock-closed-outline" size={13} color={colors.textFaint} />
                          <Text style={styles.detailMeta}>
                            Full name, phone and exact address unlock when they accept your quote. Use the chat until
                            then.
                          </Text>
                        </View>
                      </>
                    )}

                    {item.preferredDate ? (
                      <View style={styles.detailRow}>
                        <Ionicons name="calendar-outline" size={13} color={colors.textFaint} />
                        <Text style={styles.detailMeta}>They asked for {item.preferredDate}</Text>
                      </View>
                    ) : null}

                    <View style={styles.detailRow}>
                      <Ionicons name="pricetag-outline" size={13} color={colors.textFaint} />
                      <Text style={styles.detailMeta}>
                        Case #{item.caseNumber} · {item.type === 'instant' ? 'Instant booking' : 'Quote request'} ·{' '}
                        {shortDate(item.createdAt)}
                      </Text>
                    </View>

                    {item.depositAmount ? (
                      <View style={styles.detailRow}>
                        <Ionicons
                          name={item.depositPaidAt ? 'checkmark-circle-outline' : 'hourglass-outline'}
                          size={13}
                          color={item.depositPaidAt ? colors.success : colors.pending}
                        />
                        <Text style={styles.detailMeta}>
                          Deposit {money(item.depositAmount)} · {item.depositPaidAt ? 'paid' : 'not paid yet'}
                        </Text>
                      </View>
                    ) : null}

                    {/* Staff live down here: useful, but not what the card is
                        for. */}
                    {activeEmployees.length > 0 && (item.status === 'accepted' || item.status === 'pending') && (
                      <View style={styles.assignBlock}>
                        {assignee ? (
                          <View style={styles.assignedRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.assignedTo}>{assignee.name}</Text>
                              <Text style={styles.assignedStatus}>
                                {item.employeeDone ? '✓ Says it is done' : 'Not finished yet'}
                              </Text>
                              {item.assignmentNotes ? (
                                <Text style={styles.assignedNotes}>{item.assignmentNotes}</Text>
                              ) : null}
                            </View>
                            <Text style={styles.assignLink} onPress={() => handleUnassign(item.id)}>
                              Unassign
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={styles.assignLink}
                            onPress={() => {
                              setAssignNotes('');
                              setAssigningId(item.id);
                            }}
                          >
                            + Assign to someone
                          </Text>
                        )}
                      </View>
                    )}

                    {item.scheduledFor && item.status === 'accepted' && (
                      <Text
                        style={styles.assignLink}
                        onPress={() => {
                          setScheduleDate(null);
                          setSchedulingId(item.id);
                        }}
                      >
                        Change the time
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </LockedForPaymentSetup>
          );
        }}
      />

      {chatRequest && (
        <ChatModal visible request={chatRequest} perspective="business" onClose={() => setChatRequestId(null)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 3 },

  segment: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    padding: 4,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  segmentItem: { flex: 1, paddingVertical: 8, borderRadius: radius.pill, alignItems: 'center' },
  segmentItemOn: { backgroundColor: colors.primary },
  segmentText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  segmentTextOn: { color: colors.textInverse },

  card: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.textInverse, fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  customer: { fontSize: 16, fontWeight: '800', color: colors.text },
  category: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  expandButton: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonPressed: { opacity: 0.6 },

  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  summaryText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  amount: { fontSize: 15, fontWeight: '800', color: colors.text },

  actions: { flexDirection: 'row', gap: spacing.sm },
  decline: { fontSize: 12.5, fontWeight: '600', color: colors.textFaint, textAlign: 'center', paddingVertical: 4 },
  waiting: { fontSize: 12.5, color: colors.pending, lineHeight: 18, fontWeight: '600' },
  youGet: { fontSize: 13, color: colors.success, fontWeight: '700' },

  form: { gap: spacing.sm },
  formLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  input: {
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 44,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },

  details: { gap: 6, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  detailLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailBody: { fontSize: 13.5, color: colors.text, lineHeight: 19 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailMeta: { fontSize: 12.5, color: colors.textMuted, flex: 1, lineHeight: 17 },
  link: { color: colors.primary, fontWeight: '600' },

  assignBlock: { marginTop: 4 },
  assignedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  assignedTo: { fontSize: 13, fontWeight: '700', color: colors.text },
  assignedStatus: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  assignedNotes: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  assignLink: { fontSize: 12.5, fontWeight: '700', color: colors.primary, paddingVertical: 4 },
});
