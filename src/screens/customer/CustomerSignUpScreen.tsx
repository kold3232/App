import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, SectionLabel } from '../../components/ui';
import { useApp } from '../../context/AppContext';
import { colors, radius, shadow, spacing } from '../../theme';

export default function CustomerSignUpScreen() {
  const { saveCustomerProfile, setMode } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const canSubmit =
    name.trim().length > 0 && email.trim().length > 0 && phone.trim().length > 0 && address.trim().length > 0;

  function handleCreate() {
    saveCustomerProfile({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim(),
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        <View style={styles.hero}>
          <View style={styles.iconBadge}>
            <Ionicons name="person-add" size={28} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            Sign up with your details so businesses can get back to you about your requests.
          </Text>
        </View>

        <Card>
          <View style={styles.field}>
            <SectionLabel>Name</SectionLabel>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Maria Chipolina"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Email</SectionLabel>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Phone number</SectionLabel>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+350 5400 0000"
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              keyboardType="phone-pad"
            />
          </View>
          <View style={[styles.field, styles.fieldBorder]}>
            <SectionLabel>Address</SectionLabel>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Street, block, floor, flat number..."
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
            />
          </View>
        </Card>

        <View style={{ height: spacing.lg }} />
        <Button title="Create account" onPress={handleCreate} disabled={!canSubmit} />

        <Pressable onPress={() => setMode(null)} hitSlop={12} style={styles.cancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md, textAlign: 'center' },
  subtitle: {
    fontSize: 13.5,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.sm,
  },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 15, color: colors.text, marginTop: 6, padding: 0 },
  cancel: { marginTop: spacing.lg, alignSelf: 'center' },
  cancelText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
});
