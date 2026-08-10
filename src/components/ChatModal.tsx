import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
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
import { ChatMessageSender, ServiceRequest } from '../types';
import { colors, radius, spacing } from '../theme';
import { notify } from '../utils/alert';
import { Button } from './ui';

export function ChatModal({
  visible,
  onClose,
  request,
  perspective,
}: {
  visible: boolean;
  onClose: () => void;
  request: ServiceRequest;
  perspective: ChatMessageSender;
}) {
  const { messages, sendMessage, sendQuote, sendImageMessage, acceptQuote, refreshMessages, refreshRequests } = useApp();
  const [text, setText] = useState('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');

  useEffect(() => {
    if (visible) {
      refreshMessages();
      refreshRequests();
    }
  }, [visible, refreshMessages, refreshRequests]);

  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.requestId === request.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages, request.id]
  );

  const latestQuote = useMemo(() => [...thread].reverse().find((m) => m.kind === 'quote'), [thread]);

  function handleSend() {
    if (!text.trim()) return;
    sendMessage(request.id, perspective, text.trim());
    setText('');
  }

  function handleSendQuote() {
    const value = parseFloat(quoteAmount);
    if (!value || value <= 0) {
      notify('Enter an amount', 'Please enter a quote amount to send.');
      return;
    }
    sendQuote(request.id, value);
    setQuoteAmount('');
    setShowQuoteForm(false);
  }

  function handleAcceptQuote(amount: number) {
    acceptQuote(request.id, amount);
  }

  async function handlePickImage() {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        notify('Photo access needed', 'Please allow photo library access to attach a picture.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      sendImageMessage(request.id, perspective, result.assets[0].uri);
    }
  }

  const otherPartyName = perspective === 'customer' ? request.companyName : request.customerName;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{otherPartyName}</Text>
            <Text style={styles.subtitle}>{request.categoryName} · {request.jobDetails || 'Job enquiry'}</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.thread} contentContainerStyle={styles.threadContent}>
            {thread.length === 0 && (
              <Text style={styles.emptyText}>No messages yet. Say hello and discuss the job specs.</Text>
            )}
            {thread.map((m) => {
              const isMine = m.sender === perspective;
              if (m.kind === 'quote') {
                const isAccepted = request.quoteAccepted && request.quotedAmount === m.amount;
                const isLatest = latestQuote?.id === m.id;
                return (
                  <View key={m.id} style={[styles.quoteCard, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={styles.quoteLabel}>Quote</Text>
                    <Text style={styles.quoteAmount}>£{m.amount?.toFixed(2)}</Text>
                    {isAccepted ? (
                      <View style={styles.acceptedPill}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={styles.acceptedText}>Accepted</Text>
                      </View>
                    ) : perspective === 'customer' && isLatest && !request.quoteAccepted ? (
                      <View style={{ marginTop: spacing.sm }}>
                        <Button title="Accept quote" onPress={() => handleAcceptQuote(m.amount ?? 0)} />
                      </View>
                    ) : null}
                  </View>
                );
              }
              if (m.kind === 'image') {
                return (
                  <View key={m.id} style={[styles.imageBubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Image source={{ uri: m.imageUri }} style={styles.chatImage} resizeMode="cover" />
                  </View>
                );
              }
              return (
                <View key={m.id} style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{m.text}</Text>
                </View>
              );
            })}
          </ScrollView>

          {perspective === 'business' &&
            (showQuoteForm ? (
              <View style={styles.quoteForm}>
                <TextInput
                  style={styles.quoteInput}
                  value={quoteAmount}
                  onChangeText={setQuoteAmount}
                  placeholder="Quote amount (£)"
                  placeholderTextColor={colors.textFaint}
                  selectionColor={colors.primary}
                  keyboardType="decimal-pad"
                />
                <View style={styles.quoteFormActions}>
                  <View style={{ flex: 1 }}>
                    <Button title="Send quote" onPress={handleSendQuote} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button title="Cancel" variant="secondary" onPress={() => setShowQuoteForm(false)} />
                  </View>
                </View>
              </View>
            ) : (
              <Pressable style={styles.quoteToggle} onPress={() => setShowQuoteForm(true)}>
                <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                <Text style={styles.quoteToggleText}>Send a quote</Text>
              </Pressable>
            ))}

          <View style={styles.inputRow}>
            <Pressable style={styles.attachButton} onPress={handlePickImage}>
              <Ionicons name="image-outline" size={20} color={colors.primary} />
            </Pressable>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
              placeholderTextColor={colors.textFaint}
              selectionColor={colors.primary}
              multiline
            />
            <Pressable style={styles.sendButton} onPress={handleSend} disabled={!text.trim()}>
              <Ionicons name="send" size={18} color={colors.textInverse} />
            </Pressable>
          </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thread: { flex: 1 },
  threadContent: { padding: spacing.lg, gap: spacing.sm },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  bubble: { maxWidth: '80%', borderRadius: radius.md, paddingVertical: 9, paddingHorizontal: 13, marginBottom: 4 },
  bubbleMine: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: colors.surface, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 14, color: colors.text, lineHeight: 19 },
  bubbleTextMine: { color: colors.textInverse },
  imageBubble: { maxWidth: '70%', borderRadius: radius.md, padding: 4, marginBottom: 4 },
  chatImage: { width: 200, height: 200, borderRadius: radius.sm, backgroundColor: colors.surfaceAlt },
  quoteCard: { maxWidth: '80%', borderRadius: radius.md, padding: spacing.md, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  quoteLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  quoteAmount: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 2 },
  acceptedPill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
  acceptedText: { fontSize: 12.5, fontWeight: '700', color: colors.success },
  quoteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quoteToggleText: { fontSize: 12.5, fontWeight: '700', color: colors.primary },
  quoteForm: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quoteInput: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 14,
    color: colors.text,
  },
  quoteFormActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
