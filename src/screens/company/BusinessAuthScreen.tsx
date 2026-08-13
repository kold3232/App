import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadow, spacing } from '../../theme';
import { notify } from '../../utils/alert';

export default function BusinessAuthScreen() {
  const { signUpBusiness, signInBusiness, setMode, authEmail } = useApp();
  const addingRoleToExistingAccount = !!authEmail;
  const [mode, setLocalMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = addingRoleToExistingAccount
    ? name.trim().length > 0 && phone.trim().length > 0
    : mode === 'login'
      ? email.trim().length > 0 && password.length > 0
      : name.trim().length > 0 && email.trim().length > 0 && password.length >= 6 && phone.trim().length > 0;

  async function handleSubmit() {
    setLoading(true);
    try {
      if (addingRoleToExistingAccount) {
        const { error } = await signUpBusiness(authEmail!, '', { name: name.trim(), phone: phone.trim() });
        if (error) notify('Could not add business profile', error);
        return;
      }
      if (mode === 'login') {
        const { error } = await signInBusiness(email.trim(), password);
        if (error) notify('Log in failed', error);
      } else {
        const { error, needsEmailConfirmation } = await signUpBusiness(email.trim(), password, {
          name: name.trim(),
          phone: phone.trim(),
        });
        if (error) {
          notify('Sign up failed', error);
        } else if (needsEmailConfirmation) {
          notify('Check your email', 'Confirm your email address, then log in.');
          setLocalMode('login');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Ionicons name="briefcase" size={28} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>Business account</Text>
          <Text style={styles.subtitle}>
            {addingRoleToExistingAccount
              ? `Add a business profile to ${authEmail} so you can list your business and manage requests.`
              : 'Sign up or log in to list your business and manage requests.'}
          </Text>
        </View>

        {!addingRoleToExistingAccount && (
          <View style={styles.toggleRow}>
            <Chip label="Sign up" selected={mode === 'signup'} onPress={() => setLocalMode('signup')} />
            <Chip label="Log in" selected={mode === 'login'} onPress={() => setLocalMode('login')} />
          </View>
        )}

        <Card>
          {(addingRoleToExistingAccount || mode === 'signup') && (
            <View style={styles.field}>
              <SectionLabel>Your name</SectionLabel>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. John Smith"
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.primary}
              />
            </View>
          )}
          {!addingRoleToExistingAccount && (
            <>
              <View style={[styles.field, mode === 'signup' && styles.fieldBorder]}>
                <SectionLabel>Email</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@business.com"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View style={[styles.field, styles.fieldBorder]}>
                <SectionLabel>Password</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  secureTextEntry
                />
              </View>
            </>
          )}
          {(addingRoleToExistingAccount || mode === 'signup') && (
            <View style={[styles.field, styles.fieldBorder]}>
              <SectionLabel>Phone number</SectionLabel>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+350 200 00000"
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.primary}
                keyboardType="phone-pad"
              />
            </View>
          )}
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button
          title={addingRoleToExistingAccount ? 'Add business profile' : mode === 'signup' ? 'Create business account' : 'Log in'}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
        />

        <Pressable onPress={() => setMode(null)} hitSlop={12} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  subtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.sm,
  },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', marginBottom: spacing.md },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 15, color: colors.text, marginTop: 6, padding: 0 },
  cancel: { marginTop: spacing.lg, alignSelf: 'center' },
  cancelText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
