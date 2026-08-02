import React from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';

export default function ModeSelectScreen() {
  const { setMode } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.boltBadge}>
          <Text style={styles.bolt}>⚡</Text>
        </View>
        <Text style={styles.title}>LightningService</Text>
        <Text style={styles.subtitle}>Find trusted local tradespeople in Gibraltar, fast.</Text>
      </View>

      <View style={styles.actions}>
        <Button title="I need a service" onPress={() => setMode('customer')} />
        <View style={{ height: spacing.sm }} />
        <Button title="I run a business" onPress={() => setMode('company')} variant="outline" />
        <Text style={styles.hint}>You can switch between these anytime from your profile.</Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerDot} />
        <Text style={styles.footer}>Currently serving Gibraltar only</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between', padding: spacing.lg },
  hero: { alignItems: 'center', marginTop: spacing.xl * 2 },
  boltBadge: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(79, 163, 247, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79, 163, 247, 0.35)',
  },
  bolt: { fontSize: 40 },
  title: { fontSize: 30, fontWeight: '800', color: colors.textInverse, marginTop: spacing.lg, letterSpacing: 0.2 },
  subtitle: {
    fontSize: 15,
    color: '#A9B8D6',
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 21,
  },
  actions: { paddingBottom: spacing.lg },
  hint: { color: '#7C8BAE', fontSize: 12, textAlign: 'center', marginTop: spacing.md },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, gap: 6 },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  footer: { textAlign: 'center', color: '#64749B', fontSize: 12, fontWeight: '600' },
});
