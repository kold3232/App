import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, EmptyState, StatusBadge } from '../../components/ui';
import { ChatModal } from '../../components/ChatModal';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadow, spacing } from '../../theme';

export default function AdminCasesScreen() {
  const { requests, refreshRequests } = useApp();
  const [query, setQuery] = useState('');
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshRequests();
    }, [refreshRequests])
  );

  const openCase = requests.find((r) => r.id === openCaseId) ?? null;

  const cases = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q.length === 0
      ? requests
      : requests.filter((r) => {
          if (String(r.caseNumber).includes(q)) return true;
          // Admins can read the contact table, so a search here should reach
          // the real name and phone number, not just the masked display name.
          const haystack = [r.customerName, r.companyName, r.contact?.name, r.contact?.phone]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return haystack.includes(q);
        });
    return [...list].sort((a, b) => b.caseNumber - a.caseNumber);
  }, [requests, query]);

  return (
    <View style={styles.container}>
      <FlatList
        data={cases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Cases</Text>
            <Text style={styles.subtitle}>{cases.length} shown · every customer↔business chat on the platform</Text>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by case number, customer, or business..."
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
          </View>
        }
        ListEmptyComponent={<EmptyState icon="chatbubbles-outline" title="No cases found" subtitle="Try a different search." />}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => setOpenCaseId(item.id)}>
            {({ pressed }) => (
              <Card style={pressed && styles.cardPressed}>
                <View style={styles.row}>
                  <Text style={styles.caseNumber}>Case #{item.caseNumber}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.parties}>{item.contact?.name ?? item.customerName} ↔ {item.companyName}</Text>
                <Text style={styles.category}>{item.categoryName} · {item.type === 'instant' ? 'Instant booking' : 'Quote request'}</Text>
                {item.contact && (
                  <Text style={styles.contact}>
                    {item.contact.phone} · {item.contact.address}
                  </Text>
                )}
                <Text style={styles.contact}>
                  Business sees: {item.area || 'no area given'}
                  {item.quoteAccepted ? ' · full contact unlocked' : ' · contact still masked'}
                </Text>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
              </Card>
            )}
          </Pressable>
        )}
      />
      {openCase && (
        <ChatModal
          visible={!!openCase}
          onClose={() => setOpenCaseId(null)}
          request={openCase}
          perspective="business"
          readOnly
        />
      )}
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
    ...shadow.card,
  },
  cardPressed: { opacity: 0.85 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  caseNumber: { fontSize: 16, fontWeight: '700', color: colors.text },
  parties: { fontSize: 13.5, color: colors.text, marginTop: 6, fontWeight: '600' },
  category: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 4 },
  contact: { fontSize: 11.5, color: colors.textMuted, marginTop: 4 },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
});
