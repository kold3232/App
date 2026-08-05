import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui';
import { useApp } from '../context/AppContext';
import { colors, radius, shadow, spacing } from '../theme';

export default function ModeSelectScreen() {
  const { setMode } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.boltBadge}>
          <Ionicons name="flash" size={34} color={colors.textInverse} />
        </View>
        <Text style={styles.title}>Sortedforyou</Text>
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
      <Pressable onPress={() => setMode('admin')} hitSlop={12}>
        <Text style={styles.adminLink}>Sortedforyou team? Admin sign-in</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between', padding: spacing.lg },
  hero: { alignItems: 'center', marginTop: spacing.xl * 2 },
  boltBadge: {
    width: 76,
    height: 76,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
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
  adminLink: { textAlign: 'center', color: '#4A5A85', fontSize: 11.5, marginTop: spacing.md, textDecorationLine: 'underline' },
});
