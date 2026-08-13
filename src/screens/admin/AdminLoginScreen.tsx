import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadow, spacing } from '../../theme';
import { notify } from '../../utils/alert';

export default function AdminLoginScreen() {
  const { signInAdmin, setMode } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const { error } = await signInAdmin(email.trim(), password);
    setLoading(false);
    if (error) {
      notify('Sign in failed', error);
      return;
    }
    setPassword('');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconBadge}>
          <Ionicons name="lock-closed" size={30} color={colors.textInverse} />
        </View>
        <Text style={styles.title}>Admin sign-in</Text>
        <Text style={styles.subtitle}>Sign in with your admin account to access the dashboard.</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Admin email"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <View style={{ height: spacing.sm }} />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSignIn}
        />
        <View style={{ height: spacing.md }} />
        <Button
          title="Sign in"
          onPress={handleSignIn}
          disabled={email.trim().length === 0 || password.length === 0}
          loading={loading}
        />
      </View>

      <Pressable onPress={() => setMode(null)} hitSlop={12} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, justifyContent: 'center' },
  hero: { alignItems: 'center' },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.textInverse, marginTop: spacing.lg, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  form: { marginTop: spacing.xl },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.text,
    ...shadow.card,
  },
  cancel: { marginTop: spacing.xl, alignSelf: 'center' },
  cancelText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
