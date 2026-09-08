import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { confirmAction, notify } from '../utils/alert';

/**
 * Apple requires any app with account creation to offer account deletion from
 * inside the app, and does not accept "contact support to delete" — which is
 * all the privacy policy offers. Shared by the customer, business and staff
 * settings screens so all three routes behave identically.
 *
 * Two taps, not one: deletion is irreversible and the row sits next to
 * ordinary settings, so a stray tap should not end someone's account.
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
    <Pressable onPress={handlePress} disabled={busy} style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Delete my account</Text>
        <Text style={styles.hint}>Permanently erases your login and personal details.</Text>
      </View>
      {busy && <ActivityIndicator size="small" color={colors.danger} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  label: { fontSize: 14, fontWeight: '700', color: colors.danger },
  hint: { fontSize: 11.5, color: colors.textMuted, marginTop: 3 },
});
