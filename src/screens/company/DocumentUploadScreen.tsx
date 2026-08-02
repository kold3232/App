import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { CompanyStackParamList } from '../../navigation/types';
import { BusinessDocument } from '../../types';
import { colors, radius, shadow, spacing } from '../../theme';

type Props = NativeStackScreenProps<CompanyStackParamList, 'DocumentUpload'>;

export default function DocumentUploadScreen({ navigation }: Props) {
  const { businessApplication, updateApplicationDraft } = useApp();
  const [documents, setDocuments] = useState<BusinessDocument[]>(businessApplication.documents);

  const insuranceDoc = documents.find((d) => d.id === 'insurance');
  const canSubmit = documents.every((d) => d.uploaded) && !!insuranceDoc?.expiryDate?.trim();

  function markUploaded(id: string) {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, uploaded: true, fileName: `${d.id}.pdf` } : d))
    );
  }

  function setExpiryDate(value: string) {
    setDocuments((prev) => prev.map((d) => (d.id === 'insurance' ? { ...d, expiryDate: value } : d)));
  }

  function handleContinue() {
    updateApplicationDraft({ documents });
    navigation.navigate('TierSelection', { mode: 'signup' });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <Text style={styles.title}>Upload your documents</Text>
      <Text style={styles.subtitle}>Step 2 of 4 — Required for verification before you go live</Text>

      {documents.map((doc) => (
        <Card key={doc.id} style={{ marginBottom: spacing.md }}>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, doc.uploaded && styles.iconWrapDone]}>
                <Ionicons
                  name={doc.uploaded ? 'checkmark-circle' : 'document-outline'}
                  size={20}
                  color={doc.uploaded ? colors.success : colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docLabel}>{doc.label}</Text>
                <Text style={styles.docStatus}>{doc.uploaded ? doc.fileName : 'Not uploaded yet'}</Text>
              </View>
            </View>
            <Pressable style={styles.uploadButton} onPress={() => markUploaded(doc.id)}>
              <Text style={styles.uploadButtonText}>{doc.uploaded ? 'Replace' : 'Upload'}</Text>
            </Pressable>
          </View>

          {doc.id === 'insurance' && (
            <View style={styles.expiryField}>
              <SectionLabel>Expiry date</SectionLabel>
              <TextInput
                style={styles.input}
                value={doc.expiryDate}
                onChangeText={setExpiryDate}
                placeholder="e.g. 31/12/2026"
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.primary}
              />
            </View>
          )}
        </Card>
      ))}

      <View style={{ height: spacing.sm }} />
      <Button title="Continue to plans" onPress={handleContinue} disabled={!canSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, marginRight: spacing.sm },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDone: { backgroundColor: colors.successBg },
  docLabel: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  docStatus: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  uploadButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
  },
  uploadButtonText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  expiryField: { marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    fontSize: 14,
    color: colors.text,
    marginTop: 6,
    ...shadow.card,
  },
});
