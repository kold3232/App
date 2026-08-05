import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { getCompaniesByCategory } from '../../data/companies';
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
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={{ gap: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const isComingSoon = item.status === 'coming-soon';
          const count = isComingSoon ? 0 : getCompaniesByCategory(item.id).length;
          return (
            <Pressable
              style={({ pressed }) => [styles.tile, isComingSoon && styles.tileComingSoon, pressed && styles.tilePressed]}
              onPress={() =>
                isComingSoon
                  ? navigation.navigate('ComingSoon', { categoryId: item.id })
                  : navigation.navigate('CompanyList', { categoryId: item.id })
              }
            >
              {isComingSoon && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonBadgeText}>Coming soon</Text>
                </View>
              )}
              <View style={[styles.tileIconWrap, isComingSoon && styles.tileIconWrapMuted]}>
                <Ionicons name={item.icon} size={21} color={isComingSoon ? colors.textFaint : colors.textInverse} />
              </View>
              <Text style={[styles.tileTitle, isComingSoon && styles.tileTitleMuted]}>{item.name}</Text>
              <Text style={styles.tileDescription}>{item.description}</Text>
              {!isComingSoon && <Text style={styles.tileCount}>{count} companies</Text>}
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
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 152,
    ...shadow.card,
  },
  tileComingSoon: { backgroundColor: colors.surfaceAlt, opacity: 0.75 },
  tilePressed: { opacity: 0.9 },
  comingSoonBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.pendingBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  comingSoonBadgeText: { fontSize: 9.5, fontWeight: '700', color: colors.pending },
  tileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIconWrapMuted: { backgroundColor: colors.surfaceAlt },
  tileTitle: { fontSize: 14.5, fontWeight: '700', color: colors.text, marginTop: spacing.sm, letterSpacing: 0.1 },
  tileTitleMuted: { color: colors.textMuted },
  tileDescription: { fontSize: 11.5, color: colors.textMuted, marginTop: 4, minHeight: 30, lineHeight: 15.5 },
  tileCount: { fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
});
