import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadow, spacing } from '../../theme';
import { confirmAction, notify } from '../../utils/alert';

/**
 * Shown when the app has been opened by a password reset link. The link has
 * already signed the account in by this point, so the only way out of here is
 * setting a password or signing back out — otherwise someone who got hold of
 * the email would be straight into the account without knowing a password.
 */
export default function ResetPasswordScreen() {
  const { updatePassword, cancelPasswordRecovery, authEmail } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit = password.length >= 6 && password === confirmPassword;

  async function handleSave() {
    setSaving(true);
    const { error } = await updatePassword(password);
    setSaving(false);
    if (error) {
      notify('Could not change your password', error);
      return;
    }
    notify('Password changed', 'You are signed in with your new password.');
  }

  function handleCancel() {
    confirmAction(
      'Leave without changing it?',
      'You will be signed out, and your old password still applies.',
      'Sign out',
      cancelPasswordRecovery
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.xl * 2 }}>
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Ionicons name="key" size={26} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>Set a new password</Text>
          <Text style={styles.subtitle}>
            {authEmail ? `For ${authEmail}.` : ''} Pick something you will remember — at least 6 characters.
          </Text>
        </View>

        <Card>
          <View style={styles.field}>
            <SectionLabel>New password</SectionLabel>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              secureTextEntry
              autoFocus
            />
            {tooShort && <Text style={styles.error}>That is too short.</Text>}
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Type it again</SectionLabel>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Same password"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              secureTextEntry
            />
            {mismatch && <Text style={styles.error}>These do not match.</Text>}
          </View>
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button title="Save new password" onPress={handleSave} disabled={!canSubmit} loading={saving} />

        <Pressable onPress={handleCancel} hitSlop={12}>
          <Text style={styles.link}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 15, color: colors.text, marginTop: 6, padding: 0 },
  error: { fontSize: 12, color: colors.danger, marginTop: 6 },
  link: { fontSize: 13, color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: spacing.lg },
});
