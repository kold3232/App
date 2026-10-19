import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';

/**
 * The customer side is closed while only businesses are being tested.
 *
 * The code is checked on the server, not held in the app, so it can be changed
 * without shipping anything — and removing the row in app_access_codes opens
 * the customer side to everyone with no release at all.
 *
 * Worth being clear about what this is: a gate, not a vault. It stops someone
 * who finds RockServ on the App Store from signing up before there is anything
 * here for them. It is not protection for anything sensitive; the data itself
 * is guarded by row-level security either way.
 */
export default function CustomerAccessGateScreen() {
  const { submitCustomerAccessCode, setMode } = useApp();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleSubmit() {
    setChecking(true);
    setError(null);
    const result = await submitCustomerAccessCode(code);
    setChecking(false);
    if (result.error) setError(result.error);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.inner} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={26} color={colors.primary} />
        </View>

        <Text style={styles.title}>Not open yet</Text>
        <Text style={styles.body}>
          RockServ is being tested with tradespeople in Gibraltar before it opens to customers. If you have been given
          an access code, enter it below.
        </Text>

        <TextInput
          style={[styles.input, error && styles.inputError]}
          value={code}
          onChangeText={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          placeholder="Access code"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!checking}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={{ height: spacing.md }} />
        <Button title="Continue" onPress={handleSubmit} loading={checking} disabled={!code.trim()} />

        <Pressable onPress={() => setMode(null)} hitSlop={10} style={styles.backWrap}>
          <Text style={styles.back}>Back</Text>
        </Pressable>

        <Text style={styles.footnote}>
          If you run a trade business in Gibraltar and want to be on RockServ, go back and choose "I run a business".
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  input: {
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
    letterSpacing: 1,
  },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 13, color: colors.danger, marginTop: spacing.sm, textAlign: 'center' },
  backWrap: { alignSelf: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  back: { fontSize: 13.5, fontWeight: '700', color: colors.textMuted },
  footnote: {
    fontSize: 12,
    color: colors.textFaint,
    textAlign: 'center',
    lineHeight: 17,
    marginTop: spacing.sm,
  },
});
