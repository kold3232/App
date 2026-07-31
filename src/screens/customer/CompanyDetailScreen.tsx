import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, RatingBadge, SectionLabel } from '../../components/ui';
import { getCompanyById } from '../../data/companies';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

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
        <Text style={styles.bannerInitial}>{company.name.charAt(0)}</Text>
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
          <Text key={s} style={styles.listItem}>
            •  {s}
          </Text>
        ))}
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Areas covered</SectionLabel>
        <Text style={styles.description}>{company.areas.join(', ')}</Text>
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
  banner: { height: 88, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bannerInitial: { color: '#fff', fontSize: 40, fontWeight: '800' },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  tagline: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, gap: 6 },
  dot: { color: colors.textMuted },
  meta: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  description: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  listItem: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
});
