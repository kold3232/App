import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, spacing } from '../theme';

export default function ModeSelectScreen() {
  const { setMode } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.bolt}>⚡</Text>
        <Text style={styles.title}>LightningService</Text>
        <Text style={styles.subtitle}>Find trusted local tradespeople in Gibraltar, fast.</Text>
      </View>

      <View style={styles.actions}>
        <Button title="I need a service" onPress={() => setMode('customer')} />
        <View style={{ height: spacing.md }} />
        <Button title="I run a business" onPress={() => setMode('company')} variant="outline" />
        <Text style={styles.hint}>You can switch between these anytime from your profile.</Text>
      </View>

      <Text style={styles.footer}>Currently serving Gibraltar only</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between', padding: spacing.lg },
  hero: { alignItems: 'center', marginTop: spacing.xl * 2 },
  bolt: { fontSize: 64 },
  title: { fontSize: 32, fontWeight: '800', color: colors.textInverse, marginTop: spacing.sm },
  subtitle: { fontSize: 15, color: '#B7C0E0', marginTop: spacing.sm, textAlign: 'center', paddingHorizontal: spacing.lg },
  actions: { paddingBottom: spacing.lg },
  hint: { color: '#8891B5', fontSize: 12, textAlign: 'center', marginTop: spacing.md },
  footer: { textAlign: 'center', color: '#5B6489', fontSize: 12, marginBottom: spacing.sm },
});
