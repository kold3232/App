import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LegalTextModal } from '../../components/LegalTextModal';
import { Button } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { LEGAL_LAST_UPDATED, PRIVACY_SECTIONS, TERMS_SECTIONS } from '../../data/legalContent';
import { colors, radius, shadow, spacing } from '../../theme';

export default function LegalConsentScreen() {
  const { acceptLegal } = useApp();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.iconBadge}>
          <Ionicons name="shield-checkmark" size={30} color={colors.textInverse} />
        </View>
        <Text style={styles.title}>Before you continue</Text>
        <Text style={styles.subtitle}>
          RockServ needs your agreement to our Terms of Service and Privacy Policy to connect you with local
          businesses in Gibraltar.
        </Text>
      </View>

      <View style={styles.linkGroup}>
        <Pressable style={styles.linkRow} onPress={() => setShowTerms(true)}>
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={styles.linkText}>Read the Terms of Service</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
        <Pressable style={styles.linkRow} onPress={() => setShowPrivacy(true)}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
          <Text style={styles.linkText}>Read the Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Button title="I agree, continue" onPress={acceptLegal} />
        <Text style={styles.hint}>You can review these again anytime from your profile or settings.</Text>
      </View>

      <LegalTextModal
        visible={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terms of Service"
        lastUpdated={LEGAL_LAST_UPDATED}
        sections={TERMS_SECTIONS}
      />
      <LegalTextModal
        visible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Privacy Policy"
        lastUpdated={LEGAL_LAST_UPDATED}
        sections={PRIVACY_SECTIONS}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt, justifyContent: 'space-between', padding: spacing.lg },
  hero: { alignItems: 'center', marginTop: spacing.xl },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  linkGroup: { marginTop: spacing.xl },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadow.card,
  },
  linkText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  actions: { paddingBottom: spacing.lg },
  hint: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: spacing.md },
});
