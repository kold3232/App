import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { BusinessDocument } from '../../types';
import { AdminBusinessesStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Props = NativeStackScreenProps<AdminBusinessesStackParamList, 'BusinessDetail'>;

export default function AdminBusinessDetailScreen({ route }: Props) {
  const {
    adminBusinesses,
    categories,
    suspendBusiness,
    reinstateBusiness,
    addComplaintFlag,
    markCommissionPaid,
    documentsForBusiness,
    openDocument,
    setVerificationStatus,
  } = useApp();
  const business = adminBusinesses.find((b) => b.id === route.params.businessId);
  const [flagNote, setFlagNote] = useState('');
  const [documents, setDocuments] = useState<BusinessDocument[]>([]);
  const [verifyNote, setVerifyNote] = useState('');
  const businessId = route.params.businessId;

  const loadDocuments = useCallback(async () => {
    setDocuments(await documentsForBusiness(businessId));
  }, [businessId, documentsForBusiness]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function handleOpenDocument(filePath: string) {
    // Private bucket, so this is a link that expires rather than a public URL.
    const url = await openDocument(filePath);
    if (!url) {
      notify('Could not open it', 'The file may have been removed.');
      return;
    }
    Linking.openURL(url);
  }

  async function handleVerify(status: 'verified' | 'rejected') {
    const { error } = await setVerificationStatus(businessId, status, verifyNote.trim());
    if (error) {
      notify('Could not save', error);
      return;
    }
    setVerifyNote('');
    await loadDocuments();
    notify(
      status === 'verified' ? 'Verified' : 'Rejected',
      status === 'verified' ? 'They now carry the verified badge.' : 'They have been told to send replacements.'
    );
  }

  if (!business) return null;

  const categoryNames = business.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(', ');

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
        <SectionLabel>Verification</SectionLabel>
        <Text style={styles.verifyStatus}>
          {business.verificationStatus === 'verified'
            ? '✓ Verified'
            : business.verificationStatus === 'pending'
            ? '● Documents awaiting review'
            : business.verificationStatus === 'rejected'
            ? '✕ Rejected'
            : 'Not verified'}
        </Text>
        {business.verificationNote ? <Text style={styles.line}>{business.verificationNote}</Text> : null}

        {documents.length === 0 ? (
          <Text style={styles.verifyEmpty}>Nothing uploaded yet.</Text>
        ) : (
          documents.map((doc) => (
            <Pressable key={doc.id} onPress={() => handleOpenDocument(doc.filePath)} style={styles.verifyDocRow}>
              <Text style={styles.verifyDocLink}>
                {doc.kind.replace(/_/g, ' ')} · {new Date(doc.uploadedAt).toLocaleDateString()}
              </Text>
            </Pressable>
          ))
        )}

        <TextInput
          style={styles.input}
          value={verifyNote}
          onChangeText={setVerifyNote}
          placeholder="Note back to them (optional)"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
        />
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button title="Verify" onPress={() => handleVerify('verified')} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Reject" variant="danger" onPress={() => handleVerify('rejected')} />
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Contact</SectionLabel>
        <Text style={styles.line}>{business.contactEmail}</Text>
        <Text style={styles.line}>{business.contactPhone}</Text>
      </Card>

      <Card style={{ marginTop: spacing.md }}>
        <SectionLabel>Commission</SectionLabel>
        <Text style={styles.line}>Jobs completed: {business.jobsCompleted}</Text>
        <Text style={styles.line}>Commission owed: £{business.commissionOwed.toFixed(2)}</Text>
        <Text style={styles.line}>Commission paid to date: £{business.commissionPaid.toFixed(2)}</Text>
        {business.commissionOwed > 0 && (
          <View style={{ marginTop: spacing.sm }}>
            <Button title="Mark commission as paid" variant="outline" onPress={handleMarkPaid} />
          </View>
        )}
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
  verifyStatus: { fontSize: 14.5, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  verifyEmpty: { fontSize: 12.5, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  verifyDocRow: { paddingVertical: 6 },
  verifyDocLink: { fontSize: 13.5, color: colors.primary, fontWeight: '600', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
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
