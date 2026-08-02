import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';
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

        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="business-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <SectionLabel>Account type</SectionLabel>
              <Text style={styles.text}>You're using Sortedforyou as a business.</Text>
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <SectionLabel>Location</SectionLabel>
              <Text style={styles.text}>Gibraltar 🇬🇮 — the only region currently supported.</Text>
            </View>
          </View>
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
  title: { fontSize: 25, fontWeight: '800', color: colors.text, letterSpacing: 0.1 },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 14, color: colors.text, marginTop: 6, lineHeight: 20 },
});
