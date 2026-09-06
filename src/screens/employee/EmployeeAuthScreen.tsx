import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Chip, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadow, spacing } from '../../theme';
import { notify } from '../../utils/alert';

export default function EmployeeAuthScreen() {
  const { signInEmployee, signUpEmployee, redeemEmployeeInvite, setMode, authEmail, signOutEmployee } = useApp();
  const [step, setStep] = useState<'auth' | 'code'>(authEmail ? 'code' : 'auth');
  const [mode, setLocalMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await signInEmployee(email.trim(), password);
        if (error) {
          notify('Log in failed', error);
          return;
        }
        // If they are already linked to a business the root navigator swaps
        // them straight into the jobs list; otherwise they still owe a code.
        setStep('code');
      } else {
        const { error, needsEmailConfirmation } = await signUpEmployee(email.trim(), password);
        if (error) {
          notify('Sign up failed', error);
        } else if (needsEmailConfirmation) {
          notify('Check your email', 'Confirm your email address, then log in here.');
          setLocalMode('login');
        } else {
          setStep('code');
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRedeem() {
    setLoading(true);
    const { error } = await redeemEmployeeInvite(code.trim());
    setLoading(false);
    if (error) notify('Could not join', error);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Ionicons name="construct" size={28} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>Staff account</Text>
          <Text style={styles.subtitle}>
            {step === 'auth'
              ? 'For people who work for a business already on RockServ. Your manager gives you a 6-character code.'
              : 'Enter the code your manager gave you to join their team.'}
          </Text>
        </View>

        {step === 'auth' ? (
          <>
            <View style={styles.toggleRow}>
              <Chip label="Sign up" selected={mode === 'signup'} onPress={() => setLocalMode('signup')} />
              <Chip label="Log in" selected={mode === 'login'} onPress={() => setLocalMode('login')} />
            </View>
            <Card>
              <View style={styles.field}>
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
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  secureTextEntry
                />
              </View>
            </Card>
            <View style={{ height: spacing.lg }} />
            <Button
              title={mode === 'login' ? 'Log in' : 'Create account'}
              onPress={handleAuth}
              loading={loading}
              disabled={email.trim().length === 0 || password.length < 6}
            />
          </>
        ) : (
          <>
            <Card>
              <SectionLabel>Invite code</SectionLabel>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                placeholder="ABC123"
                placeholderTextColor={colors.textFaint}
                selectionColor={colors.primary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
              />
            </Card>
            <View style={{ height: spacing.lg }} />
            <Button title="Join the team" onPress={handleRedeem} loading={loading} disabled={code.trim().length < 6} />
            <Pressable onPress={signOutEmployee} hitSlop={12}>
              <Text style={styles.link}>Use a different account</Text>
            </Pressable>
          </>
        )}

        <Pressable onPress={() => setMode(null)} hitSlop={12}>
          <Text style={styles.link}>Back</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  toggleRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 15, color: colors.text, marginTop: 6, padding: 0 },
  codeInput: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 8,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  link: { fontSize: 13, color: colors.primary, fontWeight: '700', textAlign: 'center', marginTop: spacing.lg },
});
