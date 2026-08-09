import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { getTierInfo } from '../../data/tiers';
import { useApp } from '../../context/AppContext';
import { CompanyStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Props = NativeStackScreenProps<CompanyStackParamList, 'ApplicationStatus'>;

export default function ApplicationStatusScreen({ navigation }: Props) {
  const { businessApplication, approveApplication, categories } = useApp();
  const categoryNames = businessApplication.categoryIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  const isRejected = businessApplication.status === 'rejected';

  function handleDemoApprove() {
    approveApplication();
    notify('Application approved', 'Your business is now live on Gib Trades.');
    navigation.navigate('CompanyTabs');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <View style={[styles.iconWrap, isRejected && styles.iconWrapRejected]}>
        <Ionicons
          name={isRejected ? 'close-circle-outline' : 'time-outline'}
          size={30}
          color={isRejected ? colors.danger : colors.pending}
        />
      </View>
      <View style={[styles.badge, isRejected && styles.badgeRejected]}>
        <Text style={[styles.badgeText, isRejected && styles.badgeTextRejected]}>
          {isRejected ? 'Rejected' : 'Pending review'}
        </Text>
      </View>
      <Text style={styles.title}>{isRejected ? 'Application needs changes' : 'Your application is under review'}</Text>
      <Text style={styles.subtitle}>
        {isRejected
          ? businessApplication.rejectionReason || 'Please update your details and resubmit.'
          : "We're checking your documents and details. This usually takes 1–2 business days."}
      </Text>

      <Card style={{ marginTop: spacing.lg }}>
        <SectionLabel>Submitted details</SectionLabel>
        <Text style={styles.detailRow}>Business: {businessApplication.businessName || '—'}</Text>
        <Text style={styles.detailRow}>Categories: {categoryNames || '—'}</Text>
        <Text style={styles.detailRow}>
          Plan: {businessApplication.tier ? getTierInfo(businessApplication.tier).name : '—'}
        </Text>
        <Text style={styles.detailRow}>
          Submitted: {businessApplication.submittedAt ? new Date(businessApplication.submittedAt).toLocaleDateString() : '—'}
        </Text>
      </Card>

      {isRejected ? (
        <>
          <View style={{ height: spacing.lg }} />
          <Button title="Update & resubmit" onPress={() => navigation.navigate('BusinessSignup')} />
        </>
      ) : (
        <>
          <View style={{ height: spacing.lg }} />
          <Card style={styles.demoCard}>
            <SectionLabel>Demo only</SectionLabel>
            <Text style={styles.demoText}>
              There's no live admin team reviewing applications in this prototype yet — use this button to simulate
              an admin approving your application.
            </Text>
            <View style={{ height: spacing.sm }} />
            <Button title="Simulate admin approval" onPress={handleDemoApprove} variant="outline" />
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.pendingBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapRejected: { backgroundColor: colors.dangerBg },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pendingBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  badgeRejected: { backgroundColor: colors.dangerBg },
  badgeText: { fontSize: 11.5, fontWeight: '700', color: colors.pending },
  badgeTextRejected: { color: colors.danger },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.sm, letterSpacing: 0.1 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  detailRow: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  demoCard: { backgroundColor: colors.surfaceAlt, borderStyle: 'dashed' },
  demoText: { fontSize: 12.5, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
});
