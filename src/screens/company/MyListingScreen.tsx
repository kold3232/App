import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Chip, SectionLabel } from '../../components/ui';
import { CATEGORIES } from '../../data/categories';
import { GIBRALTAR_AREAS } from '../../data/areas';
import { useApp } from '../../context/AppContext';
import { CompanyProfile } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { notify } from '../../utils/alert';

const PRICE_OPTIONS: CompanyProfile['priceRange'][] = ['£', '££', '£££'];

export default function MyListingScreen() {
  const { companyProfile, updateCompanyProfile } = useApp();
  const [profile, setProfile] = useState<CompanyProfile>(companyProfile);
  const [newService, setNewService] = useState('');

  function toggleCategory(id: string) {
    setProfile((p) => ({
      ...p,
      categoryIds: p.categoryIds.includes(id) ? p.categoryIds.filter((c) => c !== id) : [...p.categoryIds, id],
    }));
  }

  function toggleArea(area: string) {
    setProfile((p) => ({
      ...p,
      areas: p.areas.includes(area) ? p.areas.filter((a) => a !== area) : [...p.areas, area],
    }));
  }

  function addService() {
    const trimmed = newService.trim();
    if (!trimmed) return;
    setProfile((p) => ({ ...p, services: [...p.services, trimmed] }));
    setNewService('');
  }

  function removeService(index: number) {
    setProfile((p) => ({ ...p, services: p.services.filter((_, i) => i !== index) }));
  }

  function handleSave() {
    updateCompanyProfile(profile);
    notify('Saved', 'Your business listing has been updated.');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <Text style={styles.title}>My listing</Text>
        <Text style={styles.subtitle}>This is what customers see when they view your business.</Text>

        <SectionLabel>Business name</SectionLabel>
        <TextInput
          style={styles.input}
          value={profile.name}
          onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
          placeholderTextColor={colors.textMuted}
        />

        <SectionLabel>Tagline</SectionLabel>
        <TextInput
          style={styles.input}
          value={profile.tagline}
          onChangeText={(v) => setProfile((p) => ({ ...p, tagline: v }))}
          placeholderTextColor={colors.textMuted}
        />

        <SectionLabel>Description</SectionLabel>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={profile.description}
          onChangeText={(v) => setProfile((p) => ({ ...p, description: v }))}
          multiline
          placeholderTextColor={colors.textMuted}
        />

        <SectionLabel>Categories</SectionLabel>
        <View style={styles.chipWrap}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={`${c.icon} ${c.name}`}
              selected={profile.categoryIds.includes(c.id)}
              onPress={() => toggleCategory(c.id)}
            />
          ))}
        </View>

        <SectionLabel>Areas covered</SectionLabel>
        <View style={styles.chipWrap}>
          {GIBRALTAR_AREAS.map((a) => (
            <Chip key={a} label={a} selected={profile.areas.includes(a)} onPress={() => toggleArea(a)} />
          ))}
        </View>

        <SectionLabel>Price range</SectionLabel>
        <View style={styles.chipWrap}>
          {PRICE_OPTIONS.map((p) => (
            <Chip key={p} label={p} selected={profile.priceRange === p} onPress={() => setProfile((prev) => ({ ...prev, priceRange: p }))} />
          ))}
        </View>

        <SectionLabel>Phone</SectionLabel>
        <TextInput
          style={styles.input}
          value={profile.phone}
          onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
          keyboardType="phone-pad"
          placeholderTextColor={colors.textMuted}
        />

        <SectionLabel>Services</SectionLabel>
        {profile.services.map((s, i) => (
          <View key={`${s}-${i}`} style={styles.serviceRow}>
            <Text style={styles.serviceText}>•  {s}</Text>
            <Pressable onPress={() => removeService(i)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.addServiceRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={newService}
            onChangeText={setNewService}
            placeholder="Add a service..."
            placeholderTextColor={colors.textMuted}
            onSubmitEditing={addService}
          />
          <Pressable style={styles.addButton} onPress={addService}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>

        <View style={{ height: spacing.lg }} />
        <Button title="Save listing" onPress={handleSave} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.xs, marginBottom: spacing.sm },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  serviceText: { fontSize: 14, color: colors.text, flex: 1 },
  remove: { fontSize: 12, color: colors.danger, fontWeight: '700' },
  addServiceRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, alignItems: 'center' },
  addButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: 14, borderRadius: radius.md },
  addButtonText: { color: colors.textInverse, fontWeight: '700' },
});
