import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, spacing } from '../../theme';
import { confirmAction } from '../../utils/alert';

export default function SettingsScreen() {
  const { setMode } = useApp();

  function handleSwitchToCustomer() {
    confirmAction(
      'Switch to customer mode',
      'You will see the customer app instead of your business dashboard.',
      'Switch',
      () => setMode('customer')
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: spacing.lg }}>
        <Text style={styles.title}>Settings</Text>

        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>Account type</SectionLabel>
          <Text style={styles.text}>You're using LightningService as a business.</Text>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <SectionLabel>Location</SectionLabel>
          <Text style={styles.text}>Gibraltar 🇬🇮 — the only region currently supported.</Text>
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <Button title="Switch to customer mode" onPress={handleSwitchToCustomer} variant="outline" />
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
