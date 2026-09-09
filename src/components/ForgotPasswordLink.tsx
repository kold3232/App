import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, spacing } from '../theme';
import { notify } from '../utils/alert';

/**
 * Shared by the customer, business and staff login forms. Uses the email
 * already typed into the form rather than asking for it twice.
 */
export function ForgotPasswordLink({ email }: { email: string }) {
  const { sendPasswordReset } = useApp();
  const [sending, setSending] = useState(false);

  async function handlePress() {
    const trimmed = email.trim();
    if (!trimmed) {
      notify('Enter your email first', 'Type the email address on the account, then tap this again.');
      return;
    }
    setSending(true);
    const { error } = await sendPasswordReset(trimmed);
    setSending(false);
    if (error) {
      notify('Could not send the email', error);
      return;
    }
    // Deliberately the same message whether or not the address is registered:
    // confirming which emails have accounts hands over a free user list.
    notify(
      'Check your email',
      `If there is an account for ${trimmed}, a reset link is on its way. Open it on this phone and it will bring you back here to set a new password.`
    );
  }

  return (
    <Pressable onPress={handlePress} disabled={sending} hitSlop={10}>
      <Text style={styles.link}>{sending ? 'Sending…' : 'Forgot your password?'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
