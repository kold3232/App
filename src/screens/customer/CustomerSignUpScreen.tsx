import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { ForgotPasswordLink } from '../../components/ForgotPasswordLink';
import { colors, radius, shadow, spacing } from '../../theme';
import { notify } from '../../utils/alert';

export default function CustomerSignUpScreen() {
  const { signUpCustomer, signInCustomer, setMode, authEmail } = useApp();
  const addingRoleToExistingAccount = !!authEmail;
  const [mode, setFormMode] = useState<'signup' | 'login'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = addingRoleToExistingAccount
    ? name.trim().length > 0 && phone.trim().length > 0 && address.trim().length > 0
    : mode === 'login'
      ? email.trim().length > 0 && password.length > 0
      : name.trim().length > 0 &&
        email.trim().length > 0 &&
        password.length >= 6 &&
        phone.trim().length > 0 &&
        address.trim().length > 0;

  async function handleSubmit() {
    setLoading(true);
    if (addingRoleToExistingAccount) {
      const { error } = await signUpCustomer(authEmail!, '', {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
      });
      setLoading(false);
      if (error) notify('Could not add customer profile', error);
      return;
    }
    if (mode === 'login') {
      const { error } = await signInCustomer(email.trim(), password);
      setLoading(false);
      if (error) notify('Could not log in', error);
      return;
    }
    const { error, needsEmailConfirmation } = await signUpCustomer(email.trim(), password, {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
    });
    setLoading(false);
    if (error) {
      notify('Could not create account', error);
      return;
    }
    if (needsEmailConfirmation) {
      notify('Check your email', `We sent a confirmation link to ${email.trim()}. Confirm it, then log in.`);
      setFormMode('login');
      setPassword('');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Ionicons name="person-add" size={28} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>
            {addingRoleToExistingAccount ? 'Add a customer profile' : mode === 'login' ? 'Log in' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            {addingRoleToExistingAccount
              ? `Add customer details to ${authEmail} so you can request services too.`
              : mode === 'login'
                ? 'Log in to your existing account to continue.'
                : 'Sign up with your details so businesses can get back to you about your requests.'}
          </Text>
        </View>

        {!addingRoleToExistingAccount && (
          <View style={styles.modeRow}>
            <Chip label="Sign up" selected={mode === 'signup'} onPress={() => setFormMode('signup')} />
            <Chip label="Log in" selected={mode === 'login'} onPress={() => setFormMode('login')} />
          </View>
        )}

        <Card>
          {(addingRoleToExistingAccount || mode === 'signup') && (
            <View style={styles.field}>
              <SectionLabel>Name</SectionLabel>
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
                  placeholder="you@example.com"
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
                  autoCapitalize="none"
                  secureTextEntry
                />
              </View>
            </>
          )}
          {(addingRoleToExistingAccount || mode === 'signup') && (
            <>
              <View style={[styles.field, styles.fieldBorder]}>
                <SectionLabel>Phone number</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+350 5400 0000"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={[styles.field, styles.fieldBorder]}>
                <SectionLabel>Address</SectionLabel>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Street, block, floor, flat number..."
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                />
              </View>
            </>
          )}
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button
          title={addingRoleToExistingAccount ? 'Add customer profile' : mode === 'login' ? 'Log in' : 'Create account'}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
        />
        {!addingRoleToExistingAccount && mode === 'login' && <ForgotPasswordLink email={email} />}

        <Pressable onPress={() => setMode(null)} hitSlop={12} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  hero: { alignItems: 'center', marginBottom: spacing.md },
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
  modeRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: spacing.md },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 15, color: colors.text, marginTop: 6, padding: 0 },
  cancel: { marginTop: spacing.lg, alignSelf: 'center' },
  cancelText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
