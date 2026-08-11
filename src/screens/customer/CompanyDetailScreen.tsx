import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, FlatList, Image, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, RatingBadge, SectionLabel } from '../../components/ui';
import { StarRating } from '../../components/StarRating';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { GalleryImage } from '../../types';
import { colors, radius, shadow, spacing } from '../../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'CompanyDetail'>;

const TIER_LABEL = { standard: 'Standard', premium: 'Premium', pro: 'Pro' } as const;
const SCREEN_WIDTH = Dimensions.get('window').width;

export default function CompanyDetailScreen({ route, navigation }: Props) {
  const { businessListings, fetchGalleryImages, reviews } = useApp();
  const company = businessListings.find((c) => c.id === route.params.companyId);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!company) return;
    fetchGalleryImages(company.id).then(setGallery);
  }, [company, fetchGalleryImages]);

  const companyReviews = useMemo(
    () =>
      company
        ? reviews
            .filter((r) => r.companyId === company.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        : [],
    [reviews, company]
  );

  if (!company) return null;

  const showAvailability = company.tier !== 'standard';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
    >
      {company.coverPhotoUrl ? (
        <Image source={{ uri: company.coverPhotoUrl }} style={styles.banner} resizeMode="cover" />
      ) : (
        <View style={[styles.banner, styles.bannerFallback, { backgroundColor: company.color }]}>
          <View style={styles.bannerAvatar}>
            <Text style={styles.bannerInitial}>{company.name.charAt(0)}</Text>
          </View>
        </View>
      )}

      <View style={styles.badgeRow}>
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>{TIER_LABEL[company.tier]}</Text>
        </View>
        {showAvailability && (
          <View style={styles.availabilityRow}>
            <View style={[styles.availabilityDot, { backgroundColor: company.availableNow ? colors.success : colors.textFaint }]} />
            <Text style={styles.availabilityText}>{company.availableNow ? 'Available now' : 'Unavailable right now'}</Text>
          </View>
        )}
      </View>

      <Text style={styles.name}>{company.name}</Text>
      <Text style={styles.tagline}>{company.tagline}</Text>

      <View style={styles.metaRow}>
        <RatingBadge rating={company.rating} reviewCount={company.reviewCount} />
        <Text style={styles.dot}>·</Text>
        <Text style={styles.meta}>{company.priceRange}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.meta}>{company.yearsActive > 0 ? `${company.yearsActive} years in Gibraltar` : 'New to RockServ'}</Text>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <SectionLabel>About</SectionLabel>
        <Text style={styles.description}>{company.description}</Text>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Pricing</SectionLabel>
        {company.services.length === 0 ? (
          <Text style={styles.description}>No services listed yet.</Text>
        ) : (
          company.services.map((s, i) => (
            <View key={`${s.name}-${i}`} style={styles.serviceRow}>
              <Text style={styles.listItem}>{s.name}</Text>
              <Text style={styles.servicePrice}>{s.priceFrom != null ? `from £${s.priceFrom}` : 'Price on request'}</Text>
            </View>
          ))
        )}
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Gallery</SectionLabel>
        {gallery.length === 0 ? (
          <EmptyState icon="images-outline" title="No photos yet" subtitle="This business hasn't added any portfolio photos." />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
            {gallery.map((image, index) => (
              <Pressable key={image.id} onPress={() => setViewerIndex(index)}>
                <Image source={{ uri: image.url }} style={styles.galleryImage} resizeMode="cover" />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Card>

      <Card style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
        <SectionLabel>Reviews</SectionLabel>
        {companyReviews.length === 0 ? (
          <EmptyState icon="chatbubble-ellipses-outline" title="No reviews yet" subtitle="Be the first to leave a review after a job is done." />
        ) : (
          companyReviews.map((review) => (
            <View key={review.id} style={styles.reviewRow}>
              <View style={styles.reviewHeader}>
                <StarRating rating={review.rating} size={14} />
                <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
              </View>
              {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
            </View>
          ))
        )}
      </Card>

      <Button
        title="Request a quote"
        onPress={() => navigation.navigate('RequestQuote', { companyId: company.id })}
      />

      <Modal visible={viewerIndex !== null} animationType="fade" onRequestClose={() => setViewerIndex(null)}>
        <SafeAreaView style={styles.viewerContainer}>
          <Pressable style={styles.viewerClose} onPress={() => setViewerIndex(null)} hitSlop={12}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          {viewerIndex !== null && (
            <FlatList
              data={gallery}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              initialScrollIndex={viewerIndex}
              getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
              renderItem={({ item }) => (
                <View style={styles.viewerPage}>
                  <Image source={{ uri: item.url }} style={styles.viewerImage} resizeMode="contain" />
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  banner: {
    height: 140,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    ...shadow.raised,
  },
  bannerFallback: { alignItems: 'center', justifyContent: 'center' },
  bannerAvatar: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bannerInitial: { color: '#fff', fontSize: 30, fontWeight: '800' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: 10 },
  tierBadge: {
    backgroundColor: colors.infoBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  tierBadgeText: { fontSize: 11.5, fontWeight: '700', color: colors.info },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  availabilityDot: { width: 7, height: 7, borderRadius: 4 },
  availabilityText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  name: { fontSize: 23, fontWeight: '800', color: colors.text, marginTop: spacing.sm, letterSpacing: 0.1 },
  tagline: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 },
  dot: { color: colors.textFaint },
  meta: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  description: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  listItem: { fontSize: 14, color: colors.text, lineHeight: 20, flex: 1, marginRight: spacing.sm },
  servicePrice: { fontSize: 13.5, fontWeight: '700', color: colors.primary },
  galleryRow: { gap: spacing.sm, marginTop: spacing.xs },
  galleryImage: { width: 120, height: 120, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  reviewRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewDate: { fontSize: 11.5, color: colors.textMuted },
  reviewComment: { fontSize: 13.5, color: colors.text, marginTop: 6, lineHeight: 19 },
  viewerContainer: { flex: 1, backgroundColor: '#000' },
  viewerClose: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerPage: { width: SCREEN_WIDTH, alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: SCREEN_WIDTH, height: '100%' },
});
