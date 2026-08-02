import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, RatingBadge, SectionLabel } from '../../components/ui';
import { getCompanyById } from '../../data/companies';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing } from '../../theme';

type Props = NativeStackScreenProps<BrowseStackParamList, 'CompanyDetail'>;

export default function CompanyDetailScreen({ route, navigation }: Props) {
  const company = getCompanyById(route.params.companyId);
  if (!company) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
    >
      <View style={[styles.banner, { backgroundColor: company.color }]}>
        <View style={styles.bannerAvatar}>
          <Text style={styles.bannerInitial}>{company.name.charAt(0)}</Text>
        </View>
      </View>

      <Text style={styles.name}>{company.name}</Text>
      <Text style={styles.tagline}>{company.tagline}</Text>

      <View style={styles.metaRow}>
        <RatingBadge rating={company.rating} reviewCount={company.reviewCount} />
        <Text style={styles.dot}>·</Text>
        <Text style={styles.meta}>{company.priceRange}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.meta}>{company.yearsActive} years in Gibraltar</Text>
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <SectionLabel>About</SectionLabel>
        <Text style={styles.description}>{company.description}</Text>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Services</SectionLabel>
        {company.services.map((s) => (
          <View key={s} style={styles.listRow}>
            <View style={styles.listDot} />
            <Text style={styles.listItem}>{s}</Text>
          </View>
        ))}
      </Card>

      <Card style={{ marginTop: spacing.md, marginBottom: spacing.lg }}>
        <SectionLabel>Contact</SectionLabel>
        <Text style={styles.description}>{company.phone}</Text>
      </Card>

      <Button
        title="Request a quote"
        onPress={() => navigation.navigate('RequestQuote', { companyId: company.id })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  banner: {
    height: 104,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
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
  name: { fontSize: 23, fontWeight: '800', color: colors.text, marginTop: spacing.md, letterSpacing: 0.1 },
  tagline: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 },
  dot: { color: colors.textFaint },
  meta: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  description: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  listDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 10 },
  listItem: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
