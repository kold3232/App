import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, Chip, EmptyState } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { AdminBusinessesStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing } from '../../theme';

type Props = NativeStackScreenProps<AdminBusinessesStackParamList, 'BusinessesList'>;

type FilterOption = 'all' | 'active' | 'suspended' | 'rejected';

const FILTERS: { id: FilterOption; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'rejected', label: 'Rejected' },
];

export default function AdminBusinessesListScreen({ navigation }: Props) {
  const { adminBusinesses } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');

  const businesses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return adminBusinesses
      .filter((b) => b.applicationStatus !== 'pending')
      .filter((b) => {
        if (filter === 'active') return b.businessStatus === 'active' && b.applicationStatus === 'approved';
        if (filter === 'suspended') return b.businessStatus === 'suspended';
        if (filter === 'rejected') return b.applicationStatus === 'rejected';
        return true;
      })
      .filter((b) => q.length === 0 || b.businessName.toLowerCase().includes(q));
  }, [adminBusinesses, query, filter]);

  return (
    <View style={styles.container}>
      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Businesses</Text>
            <Text style={styles.subtitle}>{businesses.length} shown</Text>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by business name..."
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
            <View style={styles.chipWrap}>
              {FILTERS.map((f) => (
                <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />
              ))}
            </View>
            <View style={{ height: spacing.md }} />
          </View>
        }
        ListEmptyComponent={<EmptyState icon="business-outline" title="No businesses found" subtitle="Try a different filter or search." />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          return (
            <Pressable onPress={() => navigation.navigate('BusinessDetail', { businessId: item.id })}>
              {({ pressed }) => (
                <Card style={pressed && styles.cardPressed}>
                  <View style={styles.row}>
                    <Text style={styles.businessName}>{item.businessName}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        item.businessStatus === 'suspended' || item.applicationStatus === 'rejected'
                          ? styles.statusBadgeBad
                          : styles.statusBadgeGood,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          item.businessStatus === 'suspended' || item.applicationStatus === 'rejected'
                            ? styles.statusBadgeTextBad
                            : styles.statusBadgeTextGood,
                        ]}
                      >
                        {item.applicationStatus === 'rejected' ? 'Rejected' : item.businessStatus === 'suspended' ? 'Suspended' : 'Active'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.jobs}>{item.jobsCompleted} jobs</Text>
                    {item.commissionOwed > 0 && (
                      <>
                        <Text style={styles.dot}>·</Text>
                        <Text style={styles.commission}>£{item.commissionOwed.toFixed(2)} owed</Text>
                      </>
                    )}
                  </View>
                  {item.flags.length > 0 && (
                    <View style={styles.warningRow}>
                      <Ionicons name="flag-outline" size={13} color={colors.danger} />
                      <Text style={styles.warningText}>{item.flags.length} complaint{item.flags.length > 1 ? 's' : ''} logged</Text>
                    </View>
                  )}
                </Card>
              )}
            </Pressable>
          );
        }}
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
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  cardPressed: { opacity: 0.85 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  businessName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  statusBadgeGood: { backgroundColor: colors.successBg },
  statusBadgeBad: { backgroundColor: colors.dangerBg },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadgeTextGood: { color: colors.success },
  statusBadgeTextBad: { color: colors.danger },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  dot: { color: colors.textFaint },
  jobs: { fontSize: 12, color: colors.textMuted },
  commission: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  warningRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  warningText: { fontSize: 11.5, color: colors.pending, fontWeight: '600' },
  warningTextExpired: { color: colors.danger },
});
