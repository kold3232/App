import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  readOnly = false,
}: {
  visible: boolean;
  onClose: () => void;
  request: ServiceRequest;
  perspective: ChatMessageSender;
  readOnly?: boolean;
}) {
  const {
    messages,
    sendMessage,
    sendQuote,
    sendImageMessage,
    acceptQuote,
    refreshMessages,
    refreshRequests,
    subscribeToThread,
    subscribeToRequest,
  } = useApp();
  const [text, setText] = useState('');
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [sendingImage, setSendingImage] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      refreshMessages(request.id);
      refreshRequests();
    }
  }, [visible, request.id, refreshMessages, refreshRequests]);

  // Live while the thread is open, and torn down when it closes so a device
  // isn't holding a socket open for a conversation nobody is looking at.
  useEffect(() => {
    if (!visible) return;
    const stopMessages = subscribeToThread(request.id, () => refreshMessages(request.id));
    const stopRequest = subscribeToRequest(request.id, () => refreshRequests());
    return () => {
      stopMessages();
      stopRequest();
    };
  }, [visible, request.id, subscribeToThread, subscribeToRequest, refreshMessages, refreshRequests]);

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
      // Uploading a photo takes a moment, and without this the tap looked
      // like it had done nothing at all.
      setSendingImage(true);
      await sendImageMessage(request.id, perspective, result.assets[0].uri);
      setSendingImage(false);
    }
  }

  const customerLabel = request.contact?.name ?? request.customerName;
  const otherPartyName = readOnly
    ? `${customerLabel} · ${request.companyName}`
    : perspective === 'customer'
    ? request.companyName
    : customerLabel;

  // The business is looking at a masked request. Nothing stops it asking for a
  // phone number in here, but say plainly what the deal is on both sides.
  const showMaskNotice = !readOnly && request.type === 'quote' && !request.quoteAccepted;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{otherPartyName}</Text>
            <Text style={styles.subtitle}>
              Case #{request.caseNumber} · {request.categoryName} · {request.jobDetails || 'Job enquiry'}
            </Text>
            {readOnly && <Text style={styles.readOnlyBadge}>Admin view — read only</Text>}
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        {showMaskNotice && (
          <View style={styles.maskNotice}>
            <Ionicons name="lock-closed-outline" size={14} color={colors.textMuted} />
            <Text style={styles.maskNoticeText}>
              {perspective === 'business'
                ? `Area: ${request.area || 'not given'}. Full contact details unlock when the customer accepts your quote.`
                : 'Keep the job in the app — your phone number and address stay private until you accept a quote, and only jobs booked here are covered by RockServ.'}
            </Text>
          </View>
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {thread.length === 0 && (
              <Text style={styles.emptyText}>No messages yet. Say hello and discuss the job specs.</Text>
            )}
            {thread.map((m) => {
              const isMine = m.sender === perspective;
              const senderLabel = m.sender === 'customer' ? 'Customer' : 'Business';
              if (m.kind === 'quote') {
                const isAccepted = request.quoteAccepted && request.quotedAmount === m.amount;
                const isLatest = latestQuote?.id === m.id;
                return (
                  <View key={m.id} style={isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs}>
                    {readOnly && <Text style={styles.senderLabel}>{senderLabel}</Text>}
                    <View style={[styles.quoteCard, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      <Text style={[styles.quoteLabel, isMine && styles.quoteLabelMine]}>Quote</Text>
                      <Text style={[styles.quoteAmount, isMine && styles.quoteAmountMine]}>
                        £{m.amount?.toFixed(2)}
                      </Text>
                      {isAccepted ? (
                        <View style={styles.acceptedPill}>
                          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                          <Text style={styles.acceptedText}>Accepted</Text>
                        </View>
                      ) : !readOnly && perspective === 'customer' && isLatest && !request.quoteAccepted ? (
                        <View style={{ marginTop: spacing.sm }}>
                          <Button title="Accept quote" onPress={() => handleAcceptQuote(m.amount ?? 0)} />
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              }
              if (m.kind === 'image') {
                return (
                  <View key={m.id} style={isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs}>
                    {readOnly && <Text style={styles.senderLabel}>{senderLabel}</Text>}
                    <View style={[styles.imageBubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      <Image source={{ uri: m.imageUri }} style={styles.chatImage} resizeMode="cover" />
                    </View>
                  </View>
                );
              }
              return (
                <View key={m.id} style={isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs}>
                  {readOnly && <Text style={styles.senderLabel}>{senderLabel}</Text>}
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>{m.text}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {!readOnly && perspective === 'business' &&
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

          {!readOnly && (
            <View style={styles.inputRow}>
              <Pressable style={styles.attachButton} onPress={handlePickImage} disabled={sendingImage}>
                {sendingImage ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="image-outline" size={20} color={colors.primary} />
                )}
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
          )}
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
  readOnlyBadge: { fontSize: 11, fontWeight: '700', color: colors.primary, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  bubbleWrapMine: { alignItems: 'flex-end' },
  bubbleWrapTheirs: { alignItems: 'flex-start' },
  senderLabel: { fontSize: 10.5, fontWeight: '700', color: colors.textMuted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
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
  // Own-side bubbles are navy, so the default near-black text made the amount
  // unreadable for whoever sent the quote — always the business.
  quoteAmount: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: 2 },
  quoteAmountMine: { color: colors.textInverse },
  quoteLabelMine: { color: 'rgba(255,255,255,0.7)' },
  maskNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  maskNoticeText: { flex: 1, fontSize: 11.5, color: colors.textMuted, lineHeight: 16 },
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
