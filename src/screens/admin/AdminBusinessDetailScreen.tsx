import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { AdminBusinessesStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';
import { getInsuranceStatus } from '../../utils/admin';

type Props = NativeStackScreenProps<AdminBusinessesStackParamList, 'BusinessDetail'>;

export default function AdminBusinessDetailScreen({ route }: Props) {
  const { adminBusinesses, categories, suspendBusiness, reinstateBusiness, addComplaintFlag, markCommissionPaid } = useApp();
  const business = adminBusinesses.find((b) => b.id === route.params.businessId);
  const [flagNote, setFlagNote] = useState('');

  if (!business) return null;

  const categoryNames = business.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(', ');
  const insurance = business.documents.find((d) => d.id === 'insurance');
  const insuranceStatus = getInsuranceStatus(insurance?.expiryDate);

  function handleAddFlag() {
    if (!flagNote.trim()) return;
    addComplaintFlag(business!.id, flagNote.trim());
    setFlagNote('');
    notify('Flag added', 'The complaint has been logged against this business.');
  }

  function handleSuspend() {
    suspendBusiness(business!.id);
    notify('Business suspended', `${business!.businessName} is now suspended and hidden from customers.`);
  }

  function handleReinstate() {
    reinstateBusiness(business!.id);
    notify('Business reinstated', `${business!.businessName} is active again.`);
  }

  function handleMarkPaid() {
    markCommissionPaid(business!.id);
    notify('Marked as paid', 'Commission balance has been cleared.');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <Text style={styles.title}>{business.businessName}</Text>
      <Text style={styles.subtitle}>{categoryNames}</Text>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Contact</SectionLabel>
        <Text style={styles.line}>{business.contactEmail}</Text>
        <Text style={styles.line}>{business.contactPhone}</Text>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Subscription</SectionLabel>
        <Text style={styles.line}>Tier: {business.tier}</Text>
        <Text style={styles.line}>Jobs completed: {business.jobsCompleted}</Text>
        <Text style={styles.line}>Commission owed: £{business.commissionOwed.toFixed(2)}</Text>
        <Text style={styles.line}>Commission paid to date: £{business.commissionPaid.toFixed(2)}</Text>
        {business.commissionOwed > 0 && (
          <View style={{ marginTop: spacing.sm }}>
            <Button title="Mark commission as paid" variant="outline" onPress={handleMarkPaid} />
          </View>
        )}
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Documents</SectionLabel>
        {business.documents.map((doc) => (
          <View key={doc.id} style={styles.docRow}>
            <Ionicons name={doc.uploaded ? 'checkmark-circle' : 'close-circle-outline'} size={16} color={doc.uploaded ? colors.success : colors.textFaint} />
            <Text style={styles.docLabel}>{doc.label}</Text>
            {doc.expiryDate ? (
              <Text style={[styles.docExpiry, insuranceStatus !== 'ok' && styles.docExpiryWarning]}>exp. {doc.expiryDate}</Text>
            ) : null}
          </View>
        ))}
        {insuranceStatus === 'expired' && <Text style={styles.dangerNote}>⚠️ Insurance has expired — this business should be suspended.</Text>}
        {insuranceStatus === 'expiring' && <Text style={styles.warnNote}>⚠️ Insurance expires within 30 days.</Text>}
      </Card>

      {business.applicationStatus === 'rejected' && business.rejectionReason ? (
        <Card style={{ marginTop: spacing.md, backgroundColor: colors.dangerBg }}>
          <SectionLabel>Rejection reason</SectionLabel>
          <Text style={styles.line}>{business.rejectionReason}</Text>
        </Card>
      ) : null}

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Complaints / flags</SectionLabel>
        {business.flags.length === 0 ? (
          <Text style={styles.noFlags}>No complaints logged.</Text>
        ) : (
          business.flags.map((f) => (
            <View key={f.id} style={styles.flagRow}>
              <Text style={styles.flagNote}>{f.note}</Text>
              <Text style={styles.flagDate}>{new Date(f.createdAt).toLocaleDateString()}</Text>
            </View>
          ))
        )}
        <View style={styles.addFlagRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={flagNote}
            onChangeText={setFlagNote}
            placeholder="Log a new complaint..."
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.primary}
          />
          <Button title="Add" onPress={handleAddFlag} />
        </View>
      </Card>

      {business.applicationStatus === 'approved' && (
        <View style={{ marginTop: spacing.lg }}>
          {business.businessStatus === 'active' ? (
            <Button title="Suspend business" variant="danger" onPress={handleSuspend} />
          ) : (
            <Button title="Reinstate business" onPress={handleReinstate} />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 4 },
  line: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.sm },
  docLabel: { fontSize: 13.5, color: colors.text, flex: 1 },
  docExpiry: { fontSize: 11.5, color: colors.textMuted },
  docExpiryWarning: { color: colors.danger, fontWeight: '700' },
  dangerNote: { fontSize: 12.5, color: colors.danger, fontWeight: '600', marginTop: spacing.sm },
  warnNote: { fontSize: 12.5, color: colors.pending, fontWeight: '600', marginTop: spacing.sm },
  noFlags: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
  flagRow: { marginTop: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  flagNote: { fontSize: 13.5, color: colors.text },
  flagDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  addFlagRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    fontSize: 13,
    color: colors.text,
  },
});
