import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, spacing } from '../theme';
import { confirmAction, notify } from '../utils/alert';

/**
 * Apple requires any app with account creation to offer account deletion from
 * inside the app, and does not accept "contact support to delete" — which is
 * all the privacy policy offers. Shared by the customer, business and staff
 * settings screens so all three routes behave identically.
 *
 * A small plain link rather than a full-width red button: it sits below
 * ordinary settings where a thumb lands, and a target that size was getting
 * hit by accident. The confirm step is the real safeguard, but the best
 * outcome is the tap never happening.
 */
export function DeleteAccountRow() {
  const { deleteMyAccount } = useApp();
  const [busy, setBusy] = useState(false);

  function handlePress() {
    confirmAction(
      'Delete your account?',
      'This is permanent. Your login, profile and contact details are erased and cannot be restored. ' +
        'Completed jobs stay on record without your name attached, because they are the other party’s invoice. ' +
        'If you run a business and still owe commission, settle that first.',
      'Delete permanently',
      async () => {
        setBusy(true);
        const { error } = await deleteMyAccount();
        setBusy(false);
        // The most likely refusal by far is unpaid commission, and the message
        // from the database already says exactly what is owed.
        if (error) notify('Could not delete your account', error);
      }
    );
  }

  return (
    <Pressable onPress={handlePress} disabled={busy} hitSlop={8} style={styles.row}>
      <Text style={styles.label}>{busy ? 'Deleting…' : 'Delete my account'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Clear of whatever sits above without being so far down that it falls off a
  // small screen — the profile and settings screens do not scroll.
  row: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.xl },
  label: { fontSize: 12, color: colors.textFaint, textDecorationLine: 'underline' },
});
