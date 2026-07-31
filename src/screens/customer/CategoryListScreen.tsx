import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '../../data/categories';
import { getCompaniesByCategory } from '../../data/companies';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

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
              style={styles.tile}
              onPress={() => navigation.navigate('CompanyList', { categoryId: item.id })}
            >
              <Text style={styles.tileIcon}>{item.icon}</Text>
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
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  eyebrow: { color: colors.primary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 4 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 148,
  },
  tileIcon: { fontSize: 28 },
  tileTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  tileDescription: { fontSize: 12, color: colors.textMuted, marginTop: 4, minHeight: 32 },
  tileCount: { fontSize: 11, color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
});
