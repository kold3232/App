import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadow, spacing } from '../../theme';
import { notify } from '../../utils/alert';

export default function AdminLoginScreen() {
  const { authenticateAdmin, setMode } = useApp();
  const [passcode, setPasscode] = useState('');

  function handleSignIn() {
    const success = authenticateAdmin(passcode);
    if (!success) {
      notify('Incorrect passcode', 'Please check the passcode and try again.');
      return;
    }
    setPasscode('');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconBadge}>
          <Ionicons name="lock-closed" size={30} color={colors.textInverse} />
        </View>
        <Text style={styles.title}>Admin sign-in</Text>
        <Text style={styles.subtitle}>Enter the Gib Trades team passcode to access the admin dashboard.</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          value={passcode}
          onChangeText={setPasscode}
          placeholder="Passcode"
          placeholderTextColor={colors.textFaint}
          selectionColor={colors.primary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSignIn}
        />
        <View style={{ height: spacing.md }} />
        <Button title="Sign in" onPress={handleSignIn} disabled={passcode.trim().length === 0} />
      </View>

      <Pressable onPress={() => setMode(null)} hitSlop={12} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt, padding: spacing.lg, justifyContent: 'center' },
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
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
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
