import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, EmptyState, StatusBadge } from '../../components/ui';
import { StarRating } from '../../components/StarRating';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';

export default function MyRequestsScreen() {
  const { requests, reviews, addReview } = useApp();
  const [activeReviewId, setActiveReviewId] = useState<string | null>(null);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');

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

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>My requests</Text>}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title="No requests yet"
            subtitle="Browse a category and request a quote to see it here."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const review = reviews.find((r) => r.requestId === item.id);
          const isReviewing = activeReviewId === item.id;
          return (
            <Card>
              <View style={styles.row}>
                <Text style={styles.companyName}>{item.companyName}</Text>
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
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>

              {item.status === 'completed' && (
                <View style={styles.reviewSection}>
                  {review ? (
                    <View>
                      <Text style={styles.reviewLabel}>Your review</Text>
                      <StarRating rating={review.rating} size={16} />
                      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
                    </View>
                  ) : isReviewing ? (
                    <View>
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
                      <View style={styles.reviewActions}>
                        <View style={{ flex: 1 }}>
                          <Button
                            title="Submit review"
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
                    <Button title="Rate this job" variant="outline" onPress={() => openReview(item.id)} />
                  )}
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
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.md, letterSpacing: 0.1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  companyName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  category: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 },
  detail: { fontSize: 13, color: colors.text, marginTop: spacing.sm },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
  reviewSection: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  reviewLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  reviewComment: { fontSize: 13, color: colors.text, marginTop: 6, lineHeight: 19 },
  commentInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    color: colors.text,
    marginTop: spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  reviewActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
