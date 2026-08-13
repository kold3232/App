import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { BrowseStackParamList } from '../../navigation/types';
import { colors, radius, shadow, spacing } from '../../theme';
import { notify } from '../../utils/alert';

type Props = NativeStackScreenProps<BrowseStackParamList, 'ComingSoon'>;

export default function ComingSoonScreen({ route, navigation }: Props) {
  const { notifySignups, addNotifySignup, categories } = useApp();
  const category = categories.find((c) => c.id === route.params.categoryId);
  const [contact, setContact] = useState('');

  if (!category) return null;

  const alreadySignedUp = notifySignups.some((s) => s.categoryId === category.id);
  const canSubmit = contact.trim().length > 0;

  function handleSubmit() {
    addNotifySignup(category!.id, contact.trim());
    notify('You\'re on the list', `We'll let you know as soon as ${category!.name} is live.`);
    setContact('');
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}
      >
        <View style={styles.iconWrap}>
          <Ionicons name={category.icon} size={30} color={colors.textInverse} />
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming soon</Text>
        </View>
        <Text style={styles.title}>{category.name}</Text>
        <Text style={styles.subtitle}>{category.description}</Text>

        <Card style={{ marginTop: spacing.lg }}>
          <SectionLabel>Not bookable yet</SectionLabel>
          <Text style={styles.description}>
            We're lining up trusted {category.name.toLowerCase()} for Gibraltar. Leave your email or phone number
            and we'll let you know the moment this category goes live.
          </Text>
        </Card>

        {alreadySignedUp ? (
          <Card style={{ marginTop: spacing.md }}>
            <Text style={styles.confirmed}>✓ You're already on the notify list for this category.</Text>
          </Card>
        ) : (
          <Card style={{ marginTop: spacing.md }}>
            <SectionLabel>Email or phone</SectionLabel>
            <TextInput
              style={styles.input}
              value={contact}
              onChangeText={setContact}
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              autoCapitalize="none"
            />
          </Card>
        )}

        {!alreadySignedUp && (
          <>
            <View style={{ height: spacing.lg }} />
            <Button title="Notify me when live" onPress={handleSubmit} disabled={!canSubmit} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.pendingBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  badgeText: { fontSize: 11.5, fontWeight: '700', color: colors.pending, letterSpacing: 0.2 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: spacing.sm, letterSpacing: 0.1 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  description: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    marginTop: spacing.xs,
    ...shadow.card,
  },
  confirmed: { fontSize: 14, color: colors.success, fontWeight: '600' },
});
