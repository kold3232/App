import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORY_GROUPS } from '../../data/categoryGroups';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing } from '../../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'CategoryList'>;

export default function CategoryListScreen({ navigation }: Props) {
  const { categories } = useApp();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Gibraltar</Text>
        <Text style={styles.title}>What do you need help with?</Text>
      </View>
      <View style={styles.list}>
        {CATEGORY_GROUPS.map((item, index) => {
          const groupCategories = categories.filter((c) => c.groupId === item.id);
          const isComingSoon = groupCategories.length > 0 && groupCategories.every((c) => c.status === 'coming-soon');
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.shadowWrap,
                pressed && styles.rowPressed,
                index < CATEGORY_GROUPS.length - 1 && styles.rowSpacing,
              ]}
              onPress={() => navigation.navigate('CategoryGroup', { groupId: item.id })}
            >
              <View style={[styles.row, isComingSoon && styles.rowComingSoon]}>
                <View style={[styles.iconWrap, isComingSoon && styles.iconWrapMuted]}>
                  <Ionicons name={item.icon} size={34} color={isComingSoon ? colors.textFaint : colors.textInverse} />
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
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textFaint} style={styles.chevron} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  eyebrow: { color: colors.primary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 },
  title: { fontSize: 25, fontWeight: '800', color: colors.text, marginTop: 4, letterSpacing: 0.1 },
  list: { flex: 1, flexDirection: 'column', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  shadowWrap: { borderRadius: radius.lg, ...shadow.card },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 96,
  },
  rowSpacing: { marginBottom: spacing.md },
  rowComingSoon: { backgroundColor: colors.surfaceAlt, opacity: 0.85 },
  rowPressed: { opacity: 0.9 },
  iconWrap: {
    width: 92,
    alignSelf: 'stretch',
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapMuted: { backgroundColor: colors.surfaceAlt },
  rowText: { flex: 1, justifyContent: 'center', paddingVertical: spacing.lg, paddingLeft: spacing.md },
  chevron: { alignSelf: 'center', marginRight: spacing.lg },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  rowTitleMuted: { color: colors.textMuted },
  rowDescription: { fontSize: 12.5, color: colors.textMuted, marginTop: 3, lineHeight: 17 },
  comingSoonBadge: {
    backgroundColor: colors.pendingBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  comingSoonBadgeText: { fontSize: 9.5, fontWeight: '700', color: colors.pending },
});
