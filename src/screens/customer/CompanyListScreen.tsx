import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Chip, EmptyState, RatingBadge, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { Company } from '../../types';
import { colors, radius, shadow, spacing } from '../../theme';
import { describeReplySpeed } from '../../utils/waiting';

type Props = NativeStackScreenProps<BrowseStackParamList, 'CompanyList'>;

type SortOption = 'rating' | 'reviews';
type PriceFilter = 'any' | Company['priceRange'];

const PRICE_FILTERS: PriceFilter[] = ['any', '£', '££', '£££'];

export default function CompanyListScreen({ route, navigation }: Props) {
  const { categories, businessListings, requests } = useApp();
  const category = categories.find((c) => c.id === route.params.categoryId);
  const prefillFromRequestId = route.params.prefillFromRequestId;
  // Arriving here from a request that went unanswered. The business that did
  // not answer is left out of the list — offering them again would be a poor
  // joke.
  const unanswered = prefillFromRequestId ? requests.find((r) => r.id === prefillFromRequestId) : undefined;
  const allCompanies = businessListings.filter(
    (c) => c.categoryIds.includes(route.params.categoryId) && c.id !== unanswered?.companyId
  );

  const [query, setQuery] = useState('');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('any');
  const [sortBy, setSortBy] = useState<SortOption>('rating');

  const companies = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allCompanies
      .filter((c) => {
        const matchesQuery =
          q.length === 0 ||
          c.name.toLowerCase().includes(q) ||
          c.tagline.toLowerCase().includes(q) ||
          c.services.some((s) => s.name.toLowerCase().includes(q));
        const matchesPrice = priceFilter === 'any' || c.priceRange === priceFilter;
        return matchesQuery && matchesPrice;
      })
      .sort((a, b) => (sortBy === 'rating' ? b.rating - a.rating : b.reviewCount - a.reviewCount));
  }, [allCompanies, query, priceFilter, sortBy]);

  const hasActiveFilters = query.length > 0 || priceFilter !== 'any';

  return (
    <View style={styles.container}>
      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              {category ? <Ionicons name={category.icon} size={20} color={colors.primary} /> : null}
              <Text style={styles.title}>{category?.name}</Text>
            </View>
            <Text style={styles.subtitle}>{allCompanies.length} companies in Gibraltar</Text>

            {unanswered && (
              <View style={styles.resendNote}>
                <Ionicons name="repeat-outline" size={15} color={colors.primary} />
                <Text style={styles.resendNoteText}>
                  Sending the same job to someone else. {unanswered.companyName} is left out, and your original
                  request stays open.
                </Text>
              </View>
            )}

            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by name or service..."
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />

            <SectionLabel>Sort by</SectionLabel>
            <View style={styles.chipWrap}>
              <Chip label="Top rated" selected={sortBy === 'rating'} onPress={() => setSortBy('rating')} />
              <Chip label="Most reviewed" selected={sortBy === 'reviews'} onPress={() => setSortBy('reviews')} />
            </View>

            <SectionLabel>Price</SectionLabel>
            <View style={styles.chipWrap}>
              {PRICE_FILTERS.map((p) => (
                <Chip
                  key={p}
                  label={p === 'any' ? 'Any' : p}
                  selected={priceFilter === p}
                  onPress={() => setPriceFilter(p)}
                />
              ))}
            </View>

            <Text style={styles.resultCount}>
              {companies.length} {companies.length === 1 ? 'result' : 'results'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="No matches"
            subtitle={hasActiveFilters ? 'Try clearing a filter or searching something else.' : 'No companies yet in this category.'}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => navigation.navigate('CompanyDetail', { companyId: item.id, prefillFromRequestId })}
          >
            {({ pressed }) => (
              <Card style={pressed && styles.cardPressed}>
                <View style={styles.row}>
                  {item.coverPhotoUrl ? (
                    <Image source={{ uri: item.coverPhotoUrl }} style={styles.avatar} resizeMode="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: item.color }]}>
                      <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.companyName}>{item.name}</Text>
                    <Text style={styles.tagline} numberOfLines={1}>
                      {item.tagline}
                    </Text>
                    <View style={styles.metaRow}>
                      <RatingBadge rating={item.rating} reviewCount={item.reviewCount} />
                      <Text style={styles.dot}>·</Text>
                      <Text style={styles.priceRange}>{item.priceRange}</Text>
                      <Text style={styles.dot}>·</Text>
                      <Text style={styles.years}>{item.yearsActive > 0 ? `${item.yearsActive} yrs` : 'New'}</Text>
                    </View>
                    {/* Only shown once there are enough replies behind it to
                        be a habit rather than a coincidence. */}
                    {item.medianReplyMinutes != null && (
                      <View style={styles.replyRow}>
                        <Ionicons name="flash-outline" size={12} color={colors.success} />
                        <Text style={styles.replyText}>{describeReplySpeed(item.medianReplyMinutes)}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  header: { marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  resendNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  resendNoteText: { flex: 1, fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },
  replyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  replyText: { fontSize: 11.5, color: colors.success, fontWeight: '700' },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs, marginBottom: spacing.xs },
  resultCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md },
  cardPressed: { opacity: 0.85 },
  avatar: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  companyName: { fontSize: 16, fontWeight: '700', color: colors.text },
  tagline: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 6 },
  dot: { color: colors.textFaint },
  priceRange: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
  years: { fontSize: 12, color: colors.textMuted },
});
