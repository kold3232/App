import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, StatusBadge } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';

export default function MyRequestsScreen() {
  const { requests } = useApp();

  return (
    <View style={styles.container}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>My requests</Text>}
        ListEmptyComponent={
          <EmptyState
            icon="clipboard-outline"
            title="No requests yet"
            subtitle="Browse a category and request a quote to see it here."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.companyName}>{item.companyName}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.category}>
              {item.categoryName} · {item.type === 'instant' ? 'Instant booking' : 'Quote request'}
            </Text>
            {item.jobDetails ? <Text style={styles.detail}>{item.jobDetails}</Text> : null}
            <Text style={styles.meta} numberOfLines={1}>
              📍 {item.address}
              {item.type === 'instant' && item.scheduledSlot ? `  ·  🗓️ ${item.scheduledSlot}` : ''}
              {item.type === 'quote' && item.preferredDate ? `  ·  🗓️ ${item.preferredDate}` : ''}
            </Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: spacing.md, letterSpacing: 0.1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  companyName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: spacing.sm },
  category: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: 2 },
  detail: { fontSize: 13, color: colors.text, marginTop: spacing.sm },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  date: { fontSize: 11, color: colors.textMuted, marginTop: 6 },
});
