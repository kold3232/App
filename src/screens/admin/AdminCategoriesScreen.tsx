import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { Category } from '../../types';
import { colors, radius, shadow, spacing } from '../../theme';
import { notify } from '../../utils/alert';

const ICON_OPTIONS: Category['icon'][] = [
  'construct-outline',
  'flash-outline',
  'water-outline',
  'color-palette-outline',
  'hammer-outline',
  'snow-outline',
  'leaf-outline',
  'grid-outline',
  'cube-outline',
  'car-outline',
  'color-wand-outline',
  'camera-outline',
  'restaurant-outline',
  'briefcase-outline',
  'sparkles-outline',
];

export default function AdminCategoriesScreen() {
  const { categories, toggleCategoryStatus, addCategory } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<Category['icon']>(ICON_OPTIONS[0]);

  const liveCategories = categories.filter((c) => c.status === 'live');
  const comingSoonCategories = categories.filter((c) => c.status === 'coming-soon');

  function handleAddCategory() {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!id) return;
    if (categories.some((c) => c.id === id)) {
      notify('Category exists', 'A category with that name already exists.');
      return;
    }
    addCategory({ id, name: name.trim(), description: description.trim(), icon, status: 'coming-soon' });
    notify('Category added', `${name.trim()} was added as coming soon. Toggle it live when ready.`);
    setName('');
    setDescription('');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
      <Text style={styles.title}>Categories</Text>
      <Text style={styles.subtitle}>Toggle categories live or coming-soon, or add a new one.</Text>

      <SectionLabel>Live ({liveCategories.length})</SectionLabel>
      {liveCategories.map((c) => (
        <Card key={c.id} style={styles.categoryCard}>
          <View style={styles.categoryRow}>
            <Ionicons name={c.icon} size={18} color={colors.primary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.categoryName}>{c.name}</Text>
              <Text style={styles.categoryDesc}>{c.description}</Text>
            </View>
            <Switch value={true} onValueChange={() => toggleCategoryStatus(c.id)} trackColor={{ false: colors.border, true: colors.primary }} />
          </View>
        </Card>
      ))}

      <SectionLabel>Coming soon ({comingSoonCategories.length})</SectionLabel>
      {comingSoonCategories.map((c) => (
        <Card key={c.id} style={styles.categoryCard}>
          <View style={styles.categoryRow}>
            <Ionicons name={c.icon} size={18} color={colors.textMuted} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.categoryName}>{c.name}</Text>
              <Text style={styles.categoryDesc}>{c.description}</Text>
            </View>
            <Switch value={false} onValueChange={() => toggleCategoryStatus(c.id)} trackColor={{ false: colors.border, true: colors.primary }} />
          </View>
        </Card>
      ))}

      <SectionLabel>Add a category</SectionLabel>
      <Card style={{ marginTop: spacing.xs }}>
        <View style={styles.field}>
          <SectionLabel>Name</SectionLabel>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Locksmiths"
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.primary}
          />
        </View>
        <View style={[styles.field, styles.fieldBorder]}>
          <SectionLabel>Description</SectionLabel>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Short description shown on the tile"
            placeholderTextColor={colors.textFaint}
            selectionColor={colors.primary}
          />
        </View>
        <View style={[styles.field, styles.fieldBorder]}>
          <SectionLabel>Icon</SectionLabel>
          <View style={styles.iconGrid}>
            {ICON_OPTIONS.map((opt) => (
              <Pressable key={opt} style={[styles.iconOption, icon === opt && styles.iconOptionSelected]} onPress={() => setIcon(opt)}>
                <Ionicons name={opt} size={18} color={icon === opt ? colors.textInverse : colors.primary} />
              </Pressable>
            ))}
          </View>
        </View>
      </Card>
      <View style={{ height: spacing.sm }} />
      <Button title="Add category (coming soon)" onPress={handleAddCategory} disabled={!name.trim()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.md },
  categoryCard: { marginTop: spacing.xs, marginBottom: spacing.sm },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  categoryName: { fontSize: 14.5, fontWeight: '700', color: colors.text },
  categoryDesc: { fontSize: 11.5, color: colors.textMuted, marginTop: 2 },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 14, color: colors.text, marginTop: 6, padding: 0 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  iconOption: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconOptionSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
