import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { CompanyStackParamList } from '../../navigation/types';
import { colors, radius, spacing } from '../../theme';

type Props = NativeStackScreenProps<CompanyStackParamList, 'UnlicensedExplanation'>;

export default function UnlicensedExplanationScreen({ navigation }: Props) {
  const { businessApplication, updateApplicationDraft, categories } = useApp();
  const [explanation, setExplanation] = useState(businessApplication.unlicensedExplanation);

  const categoryNames = businessApplication.categoryIds
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  const canContinue = explanation.trim().length > 0;

  function handleContinue() {
    updateApplicationDraft({ unlicensedExplanation: explanation.trim() });
    navigation.navigate('DocumentUpload');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <Text style={styles.title}>Unlicensed / Sole Trader</Text>
        <Text style={styles.subtitle}>
          If you don't hold a formal trade licence, tell us a bit about your situation so we can review your
          application properly.
        </Text>

        <Card>
          <SectionLabel>Your application</SectionLabel>
          <Text style={styles.detailRow}>Business: {businessApplication.businessName || '—'}</Text>
          <Text style={styles.detailRow}>Categories: {categoryNames || '—'}</Text>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>Explain why you are applying for registration</SectionLabel>
          <TextInput
            style={styles.textArea}
            value={explanation}
            onChangeText={setExplanation}
            placeholder="e.g. I've been working as an independent tradesperson in Gibraltar for 3 years and am applying to register formally..."
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.primary}
            multiline
            numberOfLines={6}
          />
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button title="Continue to documents" onPress={handleContinue} disabled={!canContinue} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md, lineHeight: 19 },
  detailRow: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  textArea: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.sm,
    minHeight: 130,
    textAlignVertical: 'top',
  },
});
