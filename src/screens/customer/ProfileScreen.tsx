import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';
import { confirmAction } from '../../utils/alert';

export default function ProfileScreen() {
  const { setMode } = useApp();

  function handleSwitchToBusiness() {
    confirmAction(
      'Switch to business mode',
      'You will see the business dashboard instead of the customer app.',
      'Switch',
      () => setMode('company')
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: spacing.lg }}>
        <Text style={styles.title}>Profile</Text>

        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>Account</SectionLabel>
          <Text style={styles.text}>You're browsing LightningService as a customer.</Text>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>Location</SectionLabel>
          <Text style={styles.text}>Gibraltar 🇬🇮 — the only region currently supported.</Text>
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <Button title="Switch to business mode" onPress={handleSwitchToBusiness} variant="outline" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  text: { fontSize: 14, color: colors.text, marginTop: spacing.sm, lineHeight: 20 },
});
