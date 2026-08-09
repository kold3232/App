import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors, radius, spacing } from '../theme';
import { notify } from '../utils/alert';
import { Button, SectionLabel } from './ui';

export function CustomerSignUpModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { customerProfile, saveCustomerProfile } = useApp();
  const [name, setName] = useState(customerProfile?.name ?? '');
  const [phone, setPhone] = useState(customerProfile?.phone ?? '');
  const [address, setAddress] = useState(customerProfile?.address ?? '');
  const [loading, setLoading] = useState(false);

  const canSave = name.trim().length > 0 && phone.trim().length > 0 && address.trim().length > 0;

  async function handleSave() {
    if (!customerProfile) return;
    setLoading(true);
    const { error } = await saveCustomerProfile({
      email: customerProfile.email,
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
    });
    setLoading(false);
    if (error) {
      notify('Could not save changes', error);
      return;
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit your account</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
            <Text style={styles.subtitle}>
              Update your details. Your email is tied to your login and can't be changed here.
            </Text>

            <View style={styles.card}>
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
                <Text style={styles.readOnlyText}>{customerProfile?.email}</Text>
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
            </View>

            <View style={{ height: spacing.lg }} />
            <Button title="Save changes" onPress={handleSave} disabled={!canSave} loading={loading} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surfaceAlt },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, flex: 1 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 19 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  field: { paddingVertical: spacing.sm },
  fieldBorder: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 2 },
  input: { fontSize: 15, color: colors.text, marginTop: 6, padding: 0 },
  readOnlyText: { fontSize: 15, color: colors.textMuted, marginTop: 6 },
});
