import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, RatingBadge } from '../../components/ui';
import { CATEGORIES } from '../../data/categories';
import { getCompaniesByCategory } from '../../data/companies';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'CompanyList'>;

export default function CompanyListScreen({ route, navigation }: Props) {
  const category = CATEGORIES.find((c) => c.id === route.params.categoryId);
  const companies = getCompaniesByCategory(route.params.categoryId);

  return (
    <View style={styles.container}>
      <FlatList
        data={companies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>
              {category?.icon} {category?.name}
            </Text>
            <Text style={styles.subtitle}>{companies.length} companies in Gibraltar</Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('CompanyDetail', { companyId: item.id })}>
            <Card>
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: item.color }]}>
                  <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
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
                    <Text style={styles.years}>{item.yearsActive} yrs</Text>
                  </View>
                  <Text style={styles.areas} numberOfLines={1}>
                    📍 {item.areas.join(', ')}
                  </Text>
                </View>
              </View>
            </Card>
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
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing.md },
  avatar: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  companyName: { fontSize: 16, fontWeight: '700', color: colors.text },
  tagline: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  dot: { color: colors.textMuted },
  priceRange: { fontSize: 13, color: colors.textMuted, fontWeight: '700' },
  years: { fontSize: 12, color: colors.textMuted },
  areas: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
});
