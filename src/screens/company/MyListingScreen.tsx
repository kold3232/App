import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';

export default function MyListingScreen() {
  const { myListings, refreshMyListings, categories } = useApp();
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      refreshMyListings();
    }, [refreshMyListings])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={myListings}
        keyExtractor={(item) => item.id ?? item.name}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>My listings</Text>
            <Text style={styles.subtitle}>This is what customers see when they browse Gib Trades.</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="storefront-outline"
            title="No listings yet"
            subtitle="Create your first listing so customers can find and book you."
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('ListingEditor', { listingId: item.id })}>
            {({ pressed }) => (
              <Card style={pressed && styles.cardPressed}>
                <View style={styles.row}>
                  {item.coverPhotoUrl ? (
                    <Image source={{ uri: item.coverPhotoUrl }} style={styles.avatar} resizeMode="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Ionicons name="storefront-outline" size={20} color={colors.textFaint} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listingName}>{item.name || 'Untitled listing'}</Text>
                    <Text style={styles.tagline} numberOfLines={1}>
                      {item.tagline || 'No tagline yet'}
                    </Text>
                    <Text style={styles.categories} numberOfLines={1}>
                      {item.categoryIds.length > 0
                        ? item.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(', ')
                        : 'No categories selected'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
                </View>
              </Card>
            )}
          </Pressable>
        )}
      />
      <View style={styles.addWrap}>
        <Button title="Add new listing" onPress={() => navigation.navigate('ListingEditor', { listingId: undefined })} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  list: { padding: spacing.lg, paddingBottom: spacing.xl * 2, flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  cardPressed: { opacity: 0.85 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  listingName: { fontSize: 16, fontWeight: '700', color: colors.text },
  tagline: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  categories: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 4 },
  addWrap: { padding: spacing.lg, paddingTop: 0 },
});
