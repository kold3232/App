import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, SectionLabel } from '../../components/ui';
import { Screen } from '../../components/Screen';
import { useApp } from '../../context/AppContext';
import { DocumentKind } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { confirmAction, notify } from '../../utils/alert';

const KINDS: { kind: DocumentKind; label: string; hint: string }[] = [
  { kind: 'insurance', label: 'Public liability insurance', hint: 'Your certificate of insurance.' },
  { kind: 'trade_certificate', label: 'Trade qualification', hint: 'Any certificate for the work you do.' },
  { kind: 'company_registration', label: 'Company registration', hint: 'Companies House or equivalent.' },
  { kind: 'identity', label: 'Photo ID', hint: 'Passport or ID card of the owner.' },
  { kind: 'other', label: 'Something else', hint: 'Anything else that proves you are legitimate.' },
];

const STATUS_COPY: Record<string, { label: string; blurb: string; tone: 'muted' | 'pending' | 'good' | 'bad' }> = {
  unverified: {
    label: 'Not verified',
    blurb: 'Upload your documents and the RockServ team will check them.',
    tone: 'muted',
  },
  pending: {
    label: 'Under review',
    blurb: 'Your documents are with the RockServ team. You will hear back shortly.',
    tone: 'pending',
  },
  verified: {
    label: 'Verified',
    blurb: 'Customers can see that your business has been checked by RockServ.',
    tone: 'good',
  },
  rejected: {
    label: 'Not accepted',
    blurb: 'Something was not right with what you sent. Upload a replacement below.',
    tone: 'bad',
  },
};

export default function VerificationScreen() {
  const { myDocuments, myVerificationStatus, refreshMyDocuments, submitDocument, removeDocument } = useApp();
  const [uploading, setUploading] = useState<DocumentKind | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshMyDocuments();
    }, [refreshMyDocuments])
  );

  async function handleUpload(kind: DocumentKind) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Photo access needed', 'Allow photo access so you can attach a picture of your document.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    setUploading(kind);
    const { error } = await submitDocument(
      kind,
      asset.uri,
      asset.fileName ?? `${kind}.jpg`,
      asset.mimeType ?? 'image/jpeg'
    );
    setUploading(null);
    if (error) {
      notify('Could not upload', error);
      return;
    }
    notify('Sent for review', 'The RockServ team will check it and get back to you.');
  }

  function handleRemove(id: string) {
    confirmAction('Remove this document?', 'You can upload a replacement afterwards.', 'Remove', async () => {
      const { error } = await removeDocument(id);
      if (error) notify('Could not remove', error);
    });
  }

  const status = STATUS_COPY[myVerificationStatus] ?? STATUS_COPY.unverified;

  return (
    <Screen style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <Text style={styles.title}>Verification</Text>
        <Text style={styles.subtitle}>
          Verified businesses carry a badge customers can see. Your documents are private — only the RockServ team
          can open them, never customers or other businesses.
        </Text>

        <Card style={[styles.statusCard, styles[`tone_${status.tone}`]]}>
          <Text style={[styles.statusLabel, styles[`toneText_${status.tone}`]]}>{status.label}</Text>
          <Text style={styles.statusBlurb}>{status.blurb}</Text>
        </Card>

        <SectionLabel>What you have sent</SectionLabel>
        {myDocuments.length === 0 ? (
          <EmptyState
            icon="document-outline"
            title="Nothing sent yet"
            subtitle="Add whatever you have from the list below."
          />
        ) : (
          myDocuments.map((doc) => {
            const kindLabel = KINDS.find((k) => k.kind === doc.kind)?.label ?? doc.kind;
            return (
              <Card key={doc.id} style={{ marginTop: spacing.sm }}>
                <View style={styles.docRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docKind}>{kindLabel}</Text>
                    <Text style={styles.docMeta}>
                      Sent {new Date(doc.uploadedAt).toLocaleDateString()} ·{' '}
                      {doc.status === 'approved' ? 'Accepted' : doc.status === 'rejected' ? 'Not accepted' : 'Awaiting review'}
                    </Text>
                    {doc.adminNote ? <Text style={styles.docNote}>{doc.adminNote}</Text> : null}
                  </View>
                  <Pressable onPress={() => handleRemove(doc.id)} hitSlop={10}>
                    <Ionicons name="trash-outline" size={18} color={colors.textFaint} />
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}

        <View style={{ height: spacing.lg }} />
        <SectionLabel>Add a document</SectionLabel>
        {KINDS.map((k) => (
          <Pressable
            key={k.kind}
            onPress={() => handleUpload(k.kind)}
            disabled={uploading !== null}
            style={({ pressed }) => [styles.addRow, pressed && styles.addRowPressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.addLabel}>{k.label}</Text>
              <Text style={styles.addHint}>{k.hint}</Text>
            </View>
            {uploading === k.kind ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            )}
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18, marginBottom: spacing.md },
  statusCard: { marginBottom: spacing.lg, borderLeftWidth: 4 },
  tone_muted: { borderLeftColor: colors.textFaint },
  tone_pending: { borderLeftColor: colors.info },
  tone_good: { borderLeftColor: colors.success },
  tone_bad: { borderLeftColor: colors.danger },
  statusLabel: { fontSize: 15, fontWeight: '800' },
  toneText_muted: { color: colors.textMuted },
  toneText_pending: { color: colors.info },
  toneText_good: { color: colors.success },
  toneText_bad: { color: colors.danger },
  statusBlurb: { fontSize: 12.5, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  docKind: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  docMeta: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  docNote: { fontSize: 12, color: colors.danger, marginTop: 4, lineHeight: 17 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addRowPressed: { opacity: 0.85 },
  addLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  addHint: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
});
