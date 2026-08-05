import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { CompanyStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';

type Props = NativeStackScreenProps<CompanyStackParamList, 'BusinessSignup'>;

export default function BusinessSignupScreen({ navigation }: Props) {
  const { businessApplication, updateApplicationDraft, categories } = useApp();
  const liveCategories = categories.filter((c) => c.status === 'live');
  const [businessName, setBusinessName] = useState(businessApplication.businessName);
  const [contactEmail, setContactEmail] = useState(businessApplication.contactEmail);
  const [contactPhone, setContactPhone] = useState(businessApplication.contactPhone);
  const [categoryIds, setCategoryIds] = useState<string[]>(businessApplication.categoryIds);

  const canSubmit =
    businessName.trim().length > 0 &&
    contactEmail.trim().length > 0 &&
    contactPhone.trim().length > 0 &&
    categoryIds.length > 0;

  function toggleCategory(id: string) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function handleContinue() {
    updateApplicationDraft({
      businessName: businessName.trim(),
      contactEmail: contactEmail.trim(),
      contactPhone: contactPhone.trim(),
      categoryIds,
    });
    navigation.navigate('DocumentUpload');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <Text style={styles.title}>List your business</Text>
        <Text style={styles.subtitle}>Step 1 of 4 — Business details</Text>

        <Card>
          <View style={styles.field}>
            <SectionLabel>Business name</SectionLabel>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Rock Plumbing Services"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Contact email</SectionLabel>
            <TextInput
              style={styles.input}
              value={contactEmail}
              onChangeText={setContactEmail}
              placeholder="you@business.com"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Contact phone</SectionLabel>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              placeholder="+350 200 00000"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              keyboardType="phone-pad"
            />
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Categories</Text>
        <Text style={styles.sectionHint}>Select every category your business operates in.</Text>
        <View style={styles.chipWrap}>
          {liveCategories.map((c) => (
            <Chip key={c.id} label={c.name} selected={categoryIds.includes(c.id)} onPress={() => toggleCategory(c.id)} />
          ))}
        </View>

        <View style={{ height: spacing.lg }} />
        <Button title="Continue to documents" onPress={handleContinue} disabled={!canSubmit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 15, color: colors.text, marginTop: 6, padding: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: spacing.lg },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: spacing.xs },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs },
});
