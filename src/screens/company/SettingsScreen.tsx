import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LegalTextModal } from '../../components/LegalTextModal';
import { Button, Card, SectionLabel } from '../../components/ui';
import { getTierInfo } from '../../data/tiers';
import { LEGAL_LAST_UPDATED, PRIVACY_SECTIONS, TERMS_SECTIONS } from '../../data/legalContent';
import { useApp } from '../../context/AppContext';
import { colors, radius, spacing } from '../../theme';
import { confirmAction } from '../../utils/alert';

export default function SettingsScreen() {
  const { setMode, businessTier, businessAccount, signOutBusiness } = useApp();
  const navigation = useNavigation<any>();
  const tierInfo = businessTier ? getTierInfo(businessTier) : null;
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  function handleSwitchToCustomer() {
    confirmAction(
      'Switch to customer mode',
      'You will see the customer app instead of your business dashboard.',
      'Switch',
      () => setMode('customer')
    );
  }

  function handleLogOut() {
    confirmAction('Log out', 'You will need to log in again to manage your business.', 'Log out', signOutBusiness);
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: spacing.lg }}>
        <Text style={styles.title}>Settings</Text>

        <Card style={{ marginTop: spacing.lg }}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="ribbon-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <SectionLabel>Subscription</SectionLabel>
              <Text style={styles.text}>
                {tierInfo ? `${tierInfo.name} plan · ${tierInfo.price} ${tierInfo.priceNote}` : 'No plan selected'}
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                <Button
                  title={tierInfo ? 'Change plan' : 'Choose a plan'}
                  variant="outline"
                  onPress={() => navigation.navigate('TierSelection')}
                />
              </View>
            </View>
          </View>
        </Card>

        <Card style={{ marginTop: spacing.md }}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="business-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <SectionLabel>Account</SectionLabel>
              <Text style={styles.text}>
                {businessAccount ? `${businessAccount.name} · ${businessAccount.email}` : "You're using RockServ as a business."}
              </Text>
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

        <Card style={{ marginTop: spacing.md }}>
          <Pressable style={styles.legalRow} onPress={() => setShowTerms(true)}>
            <Text style={styles.legalText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
          <View style={styles.legalDivider} />
          <Pressable style={styles.legalRow} onPress={() => setShowPrivacy(true)}>
            <Text style={styles.legalText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        </Card>

        <View style={styles.accountActions}>
          <View style={{ flex: 1 }}>
            <Button title="Switch to customer mode" onPress={handleSwitchToCustomer} variant="outline" />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Log out" onPress={handleLogOut} variant="secondary" />
          </View>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <Button title="Back to start" onPress={() => setMode(null)} variant="secondary" />
        </View>
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
  accountActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  legalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  legalText: { fontSize: 14, fontWeight: '600', color: colors.text },
  legalDivider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
});
