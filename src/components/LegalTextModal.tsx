import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LegalSection } from '../data/legalContent';
import { colors, radius, spacing } from '../theme';

export function LegalTextModal({
  visible,
  onClose,
  title,
  lastUpdated,
  sections,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.lastUpdated}>Last updated {lastUpdated}</Text>
          {sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
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
  content: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  lastUpdated: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },
  section: { marginBottom: spacing.lg },
  sectionHeading: { fontSize: 14.5, fontWeight: '700', color: colors.text, marginBottom: 6 },
  sectionBody: { fontSize: 13.5, color: colors.textMuted, lineHeight: 20 },
});
