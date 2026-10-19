import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, EmptyState, StatusBadge } from '../../components/ui';
import { Screen } from '../../components/Screen';
import { ChatModal } from '../../components/ChatModal';
import { StarRating } from '../../components/StarRating';
import { useApp } from '../../context/AppContext';
import { CustomerTabParamList } from '../../navigation/types';
import { JobPayment, ServiceRequest } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { colorFromId } from '../../utils/color';

type MyRequestsRouteProp = RouteProp<CustomerTabParamList, 'MyRequests'>;
type Filter = 'all' | 'active' | 'completed';

const money = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

/** "Fill-A-Skip" becomes FS, "Focus Security" becomes FS — two letters, no more. */
function initials(name: string): string {
  const words = name.replace(/[^a-zA-Z ]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyRequestsScreen() {
  const {
    requests: allRequests,
    reviews,
    addReview,
    confirmCompletion,
    customerProfile,
    refreshRequests,
    fetchPaymentsFor,
  } = useApp();
  const route = useRoute<MyRequestsRouteProp>();
  const navigation = useNavigation();
  const [filter, setFilter] = useState<Filter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [chatRequestId, setChatRequestId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Map<string, JobPayment[]>>(new Map());

  useFocusEffect(
    useCallback(() => {
      refreshRequests();
    }, [refreshRequests])
  );

  // A single account can hold both roles — only show requests this customer sent.
  const requests = useMemo(
    () => allRequests.filter((r) => r.customerId === customerProfile?.id),
    [allRequests, customerProfile?.id]
  );

  // What has actually been paid, so the card can lead with "pay" when that is
  // what the job is waiting on rather than burying it behind Chat.
  const requestIds = useMemo(() => requests.map((r) => r.id).join(','), [requests]);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const ids = requestIds ? requestIds.split(',') : [];
      if (ids.length === 0) {
        setPayments(new Map());
        return;
      }
      void fetchPaymentsFor(ids).then((found) => {
        if (!cancelled) setPayments(found);
      });
      return () => {
        cancelled = true;
      };
    }, [fetchPaymentsFor, requestIds])
  );

  const chatRequest = requests.find((r) => r.id === chatRequestId) ?? null;

  useEffect(() => {
    const openRequestId = route.params?.openRequestId;
    if (openRequestId) {
      setChatRequestId(openRequestId);
      navigation.setParams({ openRequestId: undefined } as never);
    }
  }, [route.params?.openRequestId, navigation]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      active: requests.filter((r) => r.status === 'pending' || r.status === 'accepted').length,
      completed: requests.filter((r) => r.status === 'completed').length,
    }),
    [requests]
  );

  const visible = useMemo(() => {
    if (filter === 'active') return requests.filter((r) => r.status === 'pending' || r.status === 'accepted');
    if (filter === 'completed') return requests.filter((r) => r.status === 'completed');
    return requests;
  }, [requests, filter]);

  async function handlePullToRefresh() {
    setRefreshing(true);
    await refreshRequests();
    setRefreshing(false);
  }

  function openReview(requestId: string) {
    setActiveReviewId(requestId);
    setDraftRating(0);
    setDraftComment('');
  }

  function submitReview(requestId: string, companyId: string) {
    if (draftRating === 0) return;
    addReview(requestId, companyId, draftRating, draftComment.trim());
    setActiveReviewId(null);
  }

  /**
   * The one thing this job is waiting on, if anything. Everything on a card
   * competes for the same glance, so only one action is ever primary — and
   * when money is owed, that is the one.
   */
  function pendingAction(r: ServiceRequest): { label: string; kind: 'pay' | 'confirm' | 'rate' } | null {
    const paid = (payments.get(r.id) ?? []).filter((p) => p.status === 'paid');
    const depositPaid = !!r.depositPaidAt || paid.some((p) => p.kind === 'deposit');
    const balancePaid = paid.some((p) => p.kind === 'final');

    if (r.status === 'completed') {
      if (!balancePaid && r.jobValue != null) {
        const already = paid.reduce((sum, p) => sum + p.amount, 0);
        const due = Math.max(0, Math.round((r.jobValue - already) * 100) / 100);
        if (due > 0) return { label: `Pay ${money(due)}`, kind: 'pay' };
      }
      if (!r.customerConfirmed) return { label: 'Confirm it was done', kind: 'confirm' };
      if (!reviews.some((rv) => rv.requestId === r.id)) return { label: 'Rate job', kind: 'rate' };
      return null;
    }

    if (r.quoteAccepted && r.depositAmount && !depositPaid) {
      return { label: `Pay ${money(r.depositAmount)} deposit`, kind: 'pay' };
    }
    return null;
  }

  /** The one line of status that sits under the business name. */
  function summaryLine(r: ServiceRequest): { icon: keyof typeof Ionicons.glyphMap; text: string; tone: string } {
    if (r.status === 'declined') {
      return { icon: 'close-circle-outline', text: 'Not taken on', tone: colors.danger };
    }
    if (r.scheduledFor) {
      return { icon: 'calendar-outline', text: shortDateTime(r.scheduledFor), tone: colors.success };
    }
    if (r.status === 'pending') {
      return { icon: 'hourglass-outline', text: 'Waiting for a reply', tone: colors.pending };
    }
    return { icon: 'hourglass-outline', text: 'Waiting for a time', tone: colors.pending };
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
            <Text style={styles.title}>My requests</Text>
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
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title={filter === 'all' ? 'No requests yet' : `Nothing ${filter}`}
            subtitle={
              filter === 'all'
                ? 'Browse a category and request a quote to see it here.'
                : 'Switch to All to see your other requests.'
            }
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const review = reviews.find((r) => r.requestId === item.id);
          const isReviewing = activeReviewId === item.id;
          const expanded = expandedId === item.id;
          const action = pendingAction(item);
          const summary = summaryLine(item);
          const amount = item.jobValue ?? item.quotedAmount;

          return (
            <View style={styles.card}>
              {/* Who, and where it stands. Nothing else competes up here. */}
              <View style={styles.head}>
                <View style={[styles.avatar, { backgroundColor: colorFromId(item.companyId) }]}>
                  <Text style={styles.avatarText}>{initials(item.companyName)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.company} numberOfLines={1}>
                    {item.companyName}
                  </Text>
                  <Text style={styles.category} numberOfLines={1}>
                    {item.categoryName}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
                {/* Everything the card leaves out lives behind this. A card
                    that shows all of it is the thing being fixed. */}
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

              {isReviewing ? (
                <View style={styles.reviewBox}>
                  <Text style={styles.reviewLabel}>Rate this job</Text>
                  <StarRating rating={draftRating} onChange={setDraftRating} />
                  <TextInput
                    style={styles.commentInput}
                    value={draftComment}
                    onChangeText={setDraftComment}
                    placeholder="Add a comment (optional)"
                    placeholderTextColor={colors.textFaint}
                    selectionColor={colors.primary}
                    multiline
                  />
                  <View style={styles.actions}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Submit"
                        onPress={() => submitReview(item.id, item.companyId)}
                        disabled={draftRating === 0}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button title="Cancel" variant="secondary" onPress={() => setActiveReviewId(null)} />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.actions}>
                  {item.status !== 'declined' && (
                    <View style={{ flex: 1 }}>
                      <Button title="Chat" variant="outline" onPress={() => setChatRequestId(item.id)} />
                    </View>
                  )}
                  {action && (
                    <View style={{ flex: 1 }}>
                      <Button
                        title={action.label}
                        onPress={() => {
                          if (action.kind === 'rate') openReview(item.id);
                          else if (action.kind === 'confirm') confirmCompletion(item.id);
                          else setChatRequestId(item.id);
                        }}
                      />
                    </View>
                  )}
                </View>
              )}

              {review && !isReviewing && (
                <View style={styles.yourReview}>
                  <StarRating rating={review.rating} size={14} />
                  {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                </View>
              )}

              {expanded && (
                <View style={styles.details}>
                  <Text style={styles.detailLabel}>Your request</Text>
                  {item.jobDetails ? (
                    <Text style={styles.detailBody}>{item.jobDetails}</Text>
                  ) : (
                    <Text style={styles.detailMeta}>No description was given.</Text>
                  )}

                  <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={13} color={colors.textFaint} />
                    <Text style={styles.detailMeta}>{item.contact?.address || item.area || 'No address given'}</Text>
                  </View>

                  {item.preferredDate ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textFaint} />
                      <Text style={styles.detailMeta}>You asked for {item.preferredDate}</Text>
                    </View>
                  ) : null}

                  {item.scheduledFor ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
                      <Text style={styles.detailMeta}>Confirmed for {shortDateTime(item.scheduledFor)}</Text>
                    </View>
                  ) : null}

                  <View style={styles.detailRow}>
                    <Ionicons name="pricetag-outline" size={13} color={colors.textFaint} />
                    <Text style={styles.detailMeta}>
                      Case #{item.caseNumber} · {item.type === 'instant' ? 'Instant booking' : 'Quote request'} · sent{' '}
                      {shortDate(item.createdAt)}
                    </Text>
                  </View>

                  {item.quotedAmount != null ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text-outline" size={13} color={colors.textFaint} />
                      <Text style={styles.detailMeta}>
                        Quoted {money(item.quotedAmount)}
                        {item.quoteAccepted ? ' · accepted' : ' · not accepted yet'}
                      </Text>
                    </View>
                  ) : null}

                  {item.jobValue != null && item.jobValue !== item.quotedAmount ? (
                    <View style={styles.detailRow}>
                      <Ionicons name="cash-outline" size={13} color={colors.textFaint} />
                      <Text style={styles.detailMeta}>Final price {money(item.jobValue)}</Text>
                    </View>
                  ) : null}

                  {/* What has actually been paid, and what has not. The whole
                      point of the panel is that nothing is left to guess at. */}
                  {(() => {
                    const paid = (payments.get(item.id) ?? []).filter((p) => p.status === 'paid');
                    const rows: React.ReactNode[] = [];
                    if (item.depositAmount) {
                      const depositPaid = !!item.depositPaidAt || paid.some((p) => p.kind === 'deposit');
                      rows.push(
                        <View style={styles.detailRow} key="deposit">
                          <Ionicons
                            name={depositPaid ? 'checkmark-circle-outline' : 'hourglass-outline'}
                            size={13}
                            color={depositPaid ? colors.success : colors.pending}
                          />
                          <Text style={styles.detailMeta}>
                            Deposit {money(item.depositAmount)} · {depositPaid ? 'paid' : 'not paid yet'}
                          </Text>
                        </View>
                      );
                    }
                    const balance = paid.find((p) => p.kind === 'final');
                    if (balance) {
                      rows.push(
                        <View style={styles.detailRow} key="balance">
                          <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
                          <Text style={styles.detailMeta}>
                            Balance {money(balance.amount)} · paid
                            {balance.paidAt ? ` ${shortDate(balance.paidAt)}` : ''}
                          </Text>
                        </View>
                      );
                    }
                    return rows.length > 0 ? <>{rows}</> : null;
                  })()}
                </View>
              )}
            </View>
          );
        }}
      />

      {chatRequest && (
        <ChatModal
          visible
          request={chatRequest}
          perspective="customer"
          onClose={() => setChatRequestId(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },

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

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.textInverse, fontWeight: '800', fontSize: 13, letterSpacing: 0.3 },
  company: { fontSize: 16, fontWeight: '800', color: colors.text },
  category: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

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

  reviewBox: { gap: spacing.sm },
  reviewLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  commentInput: {
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  yourReview: { gap: 4 },
  reviewComment: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  expandButton: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButtonPressed: { opacity: 0.6 },

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
  detailMeta: { fontSize: 12.5, color: colors.textMuted, flex: 1 },
});
