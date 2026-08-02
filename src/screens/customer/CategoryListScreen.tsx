import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '../../data/categories';
import { getCompaniesByCategory } from '../../data/companies';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing } from '../../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'CategoryList'>;

export default function CategoryListScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Gibraltar</Text>
        <Text style={styles.title}>What do you need help with?</Text>
      </View>
      <FlatList
        data={CATEGORIES}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={{ gap: spacing.md }}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const count = getCompaniesByCategory(item.id).length;
          return (
            <Pressable
              style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
              onPress={() => navigation.navigate('CompanyList', { categoryId: item.id })}
            >
              <View style={styles.tileIconWrap}>
                <Text style={styles.tileIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.tileTitle}>{item.name}</Text>
              <Text style={styles.tileDescription}>{item.description}</Text>
              <Text style={styles.tileCount}>{count} companies</Text>
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
    minHeight: 156,
    ...shadow.card,
  },
  tilePressed: { opacity: 0.9 },
  tileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIcon: { fontSize: 22 },
  tileTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  tileDescription: { fontSize: 12, color: colors.textMuted, marginTop: 4, minHeight: 32, lineHeight: 16 },
  tileCount: { fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
});
