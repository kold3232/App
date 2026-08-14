import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui';
import { useApp } from '../context/AppContext';
import { debugEnvInfo } from '../lib/supabase';
import { colors, spacing } from '../theme';

export default function ModeSelectScreen() {
  const { setMode } = useApp();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoGlow}>
          <LinearGradient colors={['#F4F5F8', '#DDE1EA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoCard}>
            <Image source={require('../../assets/logo-transparent.png')} style={styles.logo} resizeMode="contain" />
          </LinearGradient>
        </View>
        <Text style={styles.subtitle}>Find trusted local tradespeople in Gibraltar, fast.</Text>
      </View>

      <View style={styles.actions}>
        <Button title="I need a service" onPress={() => setMode('customer')} />
        <View style={{ height: spacing.sm }} />
        <Button title="I run a business" onPress={() => setMode('company')} variant="accent" />
        <Text style={styles.hint}>You can switch between these anytime from your profile.</Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.footerDot} />
        <Text style={styles.footer}>Currently serving Gibraltar only</Text>
      </View>
      <Pressable onPress={() => setMode('admin')} hitSlop={12}>
        <Text style={styles.adminLink}>RockServ team? Admin sign-in</Text>
      </Pressable>
      <Text style={styles.debug}>
        URL: {debugEnvInfo.urlPresent ? debugEnvInfo.urlPreview : 'MISSING'} · Key:{' '}
        {debugEnvInfo.anonKeyPresent ? `present (${debugEnvInfo.anonKeyLength} chars)` : 'MISSING'}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between', padding: spacing.lg },
  hero: { alignItems: 'center', marginTop: spacing.xl * 2 },
  logoGlow: {
    borderRadius: 32,
    shadowColor: '#DDE1EA',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 8,
  },
  logoCard: {
    borderRadius: 32,
    paddingHorizontal: spacing.xl * 1.4,
    paddingVertical: spacing.xl,
  },
  logo: { width: 230, height: 61 },
  subtitle: {
    fontSize: 15,
    color: '#A9B8D6',
    marginTop: spacing.lg,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 21,
  },
  actions: { paddingBottom: spacing.lg, alignSelf: 'center', width: '100%', maxWidth: 340 },
  hint: { color: '#7C8BAE', fontSize: 12, textAlign: 'center', marginTop: spacing.md },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm, gap: 6 },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  footer: { textAlign: 'center', color: '#64749B', fontSize: 12, fontWeight: '600' },
  adminLink: { textAlign: 'center', color: '#4A5A85', fontSize: 11.5, marginTop: spacing.md, textDecorationLine: 'underline' },
  debug: { textAlign: 'center', color: '#5B6B94', fontSize: 10, marginTop: spacing.lg },
});
