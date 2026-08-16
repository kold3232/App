import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, RatingBadge } from '../../components/ui';
import { CATEGORY_GROUPS } from '../../data/categoryGroups';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { Category } from '../../types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'CategoryGroup'>;

function FilterBubble({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: Category['icon'];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.bubble, selected && styles.bubbleSelected, pressed && styles.bubblePressed]}
    >
      {icon ? (
        <Ionicons name={icon} size={15} color={selected ? colors.textInverse : colors.primary} />
      ) : null}
      <Text style={[styles.bubbleText, selected && styles.bubbleTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export default function CategoryGroupScreen({ route, navigation }: Props) {
  const { categories, businessListings } = useApp();
  const group = CATEGORY_GROUPS.find((g) => g.id === route.params.groupId);
  const groupCategories = categories.filter((c) => c.groupId === route.params.groupId);
  const liveCategories = groupCategories.filter((c) => c.status === 'live');
  const comingSoonCategories = groupCategories.filter((c) => c.status === 'coming-soon');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleCategory(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const companies = useMemo(() => {
    // No filter selected means "everything in this group" rather than
    // "nothing" — an empty filter bar should never look like an empty app.
    const activeIds = selectedIds.length > 0 ? selectedIds : liveCategories.map((c) => c.id);
    return businessListings
      .filter((company) => company.categoryIds.some((id) => activeIds.includes(id)))
      .sort((a, b) => b.rating - a.rating);
  }, [businessListings, selectedIds, liveCategories]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{group?.name ?? 'Category'}</Text>
        <Text style={styles.title}>Who can help?</Text>
      </View>

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBarContent}
        >
          <FilterBubble label="All" selected={selectedIds.length === 0} onPress={() => setSelectedIds([])} />
          {liveCategories.map((category) => (
            <FilterBubble
              key={category.id}
              label={category.name}
              icon={category.icon}
              selected={selectedIds.includes(category.id)}
              onPress={() => toggleCategory(category.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <Text style={styles.resultCount}>
            {companies.length} {companies.length === 1 ? 'business' : 'businesses'}
            {selectedIds.length > 0 ? ` · ${selectedIds.length} filter${selectedIds.length === 1 ? '' : 's'}` : ''}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title="Nothing here yet"
            subtitle={
              selectedIds.length > 0
                ? 'No businesses match those filters yet. Try removing one.'
                : 'No businesses listed in this group yet.'
            }
          />
        }
        ListFooterComponent={
          comingSoonCategories.length > 0 ? (
            <View style={styles.comingSoonSection}>
              <Text style={styles.comingSoonHeading}>Coming soon</Text>
              <View style={styles.comingSoonWrap}>
                {comingSoonCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    onPress={() => navigation.navigate('ComingSoon', { categoryId: category.id })}
                    style={({ pressed }) => [styles.comingSoonChip, pressed && styles.bubblePressed]}
                  >
                    <Ionicons name={category.icon} size={14} color={colors.textMuted} />
                    <Text style={styles.comingSoonChipText}>{category.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('CompanyDetail', { companyId: item.id })}>
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
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} style={styles.chevron} />
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  eyebrow: { color: colors.primary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text, marginTop: 4, letterSpacing: 0.1 },
  filterBar: { paddingBottom: spacing.sm },
  filterBarContent: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingVertical: spacing.xs },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  bubbleSelected: { backgroundColor: colors.primary },
  bubblePressed: { opacity: 0.85 },
  bubbleText: { fontSize: 13.5, fontWeight: '700', color: colors.text },
  bubbleTextSelected: { color: colors.textInverse },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl * 2 },
  resultCount: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardPressed: { opacity: 0.85 },
  avatar: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  companyName: { fontSize: 16, fontWeight: '700', color: colors.text },
  tagline: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, gap: 6 },
  dot: { color: colors.textFaint },
  priceRange: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
  chevron: { alignSelf: 'center' },
  comingSoonSection: { marginTop: spacing.xl },
  comingSoonHeading: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  comingSoonWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  comingSoonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  comingSoonChipText: { fontSize: 12.5, fontWeight: '600', color: colors.textMuted },
});
