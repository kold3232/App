import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_GROUPS } from '../../data/categoryGroups';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing } from '../../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'CategoryGroup'>;

export default function CategoryGroupScreen({ route, navigation }: Props) {
  const { categories, businessListings } = useApp();
  const group = CATEGORY_GROUPS.find((g) => g.id === route.params.groupId);
  const groupCategories = categories.filter((c) => c.groupId === route.params.groupId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{group?.name ?? 'Category'}</Text>
        <Text style={styles.title}>What do you need help with?</Text>
      </View>
      <FlatList
        data={groupCategories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const isComingSoon = item.status === 'coming-soon';
          const count = isComingSoon ? 0 : businessListings.filter((c) => c.categoryIds.includes(item.id)).length;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, isComingSoon && styles.rowComingSoon, pressed && styles.rowPressed]}
              onPress={() =>
                isComingSoon
                  ? navigation.navigate('ComingSoon', { categoryId: item.id })
                  : navigation.navigate('CompanyList', { categoryId: item.id })
              }
            >
              <View style={[styles.iconWrap, isComingSoon && styles.iconWrapMuted]}>
                <Ionicons name={item.icon} size={26} color={isComingSoon ? colors.textFaint : colors.textInverse} />
              </View>
              <View style={styles.rowText}>
                <View style={styles.rowTitleLine}>
                  <Text style={[styles.rowTitle, isComingSoon && styles.rowTitleMuted]}>{item.name}</Text>
                  {isComingSoon && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonBadgeText}>Coming soon</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.rowDescription}>{item.description}</Text>
                {!isComingSoon && <Text style={styles.rowCount}>{count} companies</Text>}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textFaint} />
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  eyebrow: { color: colors.primary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text, marginTop: 4, letterSpacing: 0.1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.card,
  },
  rowComingSoon: { backgroundColor: colors.surfaceAlt, opacity: 0.85 },
  rowPressed: { opacity: 0.9 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapMuted: { backgroundColor: colors.surfaceAlt },
  rowText: { flex: 1 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  rowTitleMuted: { color: colors.textMuted },
  rowDescription: { fontSize: 12.5, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  rowCount: { fontSize: 11.5, color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
  comingSoonBadge: {
    backgroundColor: colors.pendingBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  comingSoonBadgeText: { fontSize: 9.5, fontWeight: '700', color: colors.pending },
});
