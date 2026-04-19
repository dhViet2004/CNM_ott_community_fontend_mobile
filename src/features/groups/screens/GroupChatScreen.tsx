import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import {
  setMessages,
  addMessage,
  setLoadingMessages,
  confirmPendingMessage,
  failPendingMessage,
} from '@store/slices/chatSlice';
import { messageApi } from '@api/endpoints';
import { socketActions } from '@api/socket';
import { colors, spacing, typography } from '@theme';
import { Avatar } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'GroupChat'>;

interface MessageItem {
  id: string | number;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  time: string;
  isMe: boolean;
  type: 'text' | 'image' | 'file' | 'sticker' | 'emoji';
  file_url?: string | null;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

const GroupChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, title } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const messages = useAppSelector(
    (state) => state.chat.messages[`group_${groupId}`] || []
  );
  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
  const isLoadingMessages = useAppSelector((state) => state.chat.isLoadingMessages);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationId = `group_${groupId}`;

  // ─── Load Messages ────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    dispatch(setLoadingMessages(true));
    try {
      // Groups don't have channels by default, so we use the group's default channel
      // For now, use a placeholder - in production this would be a dedicated group channel
      const result = await messageApi.getConversationMessages(conversationId);
      const mapped: MessageItem[] = result.messages.map((m) => ({
        id: String(m.id ?? m.messageId ?? ''),
        senderId: String(m.senderId),
        senderName: m.sender_name || 'Unknown',
        content: m.content ?? '',
        time: new Date(m.createdAt ?? m.created_at ?? Date.now()).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isMe: String(m.senderId) === String(currentUserId),
        type: (m.contentType ?? m.type ?? 'text') as MessageItem['type'],
        file_url: m.file_url ?? m.attachments?.[0]?.url ?? null,
        status: 'sent',
      }));
      dispatch(setMessages({ conversationId, messages: mapped as any }));
    } catch (err) {
      console.error('Failed to load group messages:', err);
    } finally {
      dispatch(setLoadingMessages(false));
    }
  }, [conversationId, currentUserId, dispatch]);

  useEffect(() => {
    loadMessages();
    socketActions.joinConversation(conversationId);
    return () => {
      socketActions.leaveConversation(conversationId);
    };
  }, [conversationId, loadMessages]);

  // ─── Typing ───────────────────────────────────────────────────────────────
  const handleTextChange = (text: string) => {
    setInputText(text);
    if (!isTyping) {
      socketActions.sendTyping(conversationId);
      setIsTyping(true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socketActions.sendStopTyping(conversationId);
      setIsTyping(false);
    }, 2000);
  };

  useEffect(() => () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  }, []);

  // ─── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim()) return;

    const tempId = `temp_${Date.now()}`;
    const text = inputText.trim();
    setInputText('');
    socketActions.sendStopTyping(conversationId);
    setIsTyping(false);

    const optimisticMsg: MessageItem = {
      id: tempId,
      senderId: currentUserId || '',
      senderName: 'Tôi',
      content: text,
      time: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isMe: true,
      type: 'text',
      status: 'sending',
    };
    dispatch(addMessage({ ...optimisticMsg, conversationId } as any));
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const result = await messageApi.sendMessage(conversationId, text, currentUserId || '');
      const realId = String(result.id ?? result.messageId ?? tempId);

      dispatch(
        confirmPendingMessage({
          tempId,
          realId,
          conversationId,
          senderId: String(result.senderId),
          senderName: result.sender_name || 'Tôi',
          senderAvatar: result.sender_avatar ?? null,
          content: result.content ?? '',
          type: (result.contentType ?? result.type ?? 'text') as MessageItem['type'],
          file_url: result.file_url ?? result.attachments?.[0]?.url ?? null,
        })
      );
    } catch {
      dispatch(failPendingMessage(tempId));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: MessageItem }) => (
    <View
      style={[
        styles.messageRow,
        item.isMe ? styles.messageRowMe : styles.messageRowOther,
      ]}
    >
      {!item.isMe && (
        <Avatar name={item.senderName} uri={item.senderAvatar} size="xs" />
      )}
      <View
        style={[
          styles.messageBubble,
          item.isMe ? styles.bubbleMe : styles.bubbleOther,
        ]}
      >
        {!item.isMe && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <Text
          style={[
            styles.messageText,
            item.isMe ? styles.textMe : styles.textOther,
          ]}
        >
          {item.content}
        </Text>
        <Text
          style={[
            styles.messageTime,
            item.isMe ? styles.timeMe : styles.timeOther,
          ]}
        >
          {item.time}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages as any}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage as any}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          isLoadingMessages ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
            </View>
          )
        }
      />
      <View
        style={[
          styles.inputBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm },
        ]}
      >
        <TouchableOpacity style={styles.attachBtn}>
          <Text style={styles.attachIcon}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor={colors.text.placeholder}
          value={inputText}
          onChangeText={handleTextChange}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.chatBg },
  messagesList: { padding: spacing.md, paddingBottom: spacing.xl },
  loadingContainer: { alignItems: 'center', paddingTop: 100 },
  loadingText: { ...typography.body, color: colors.text.tertiary },
  emptyContainer: { alignItems: 'center', paddingTop: 100 },
  emptyText: { ...typography.subtitle, color: colors.text.secondary },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.sm },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  messageBubble: { maxWidth: '72%', borderRadius: spacing.borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginHorizontal: spacing.sm },
  bubbleMe: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.background.primary, borderBottomLeftRadius: 4 },
  senderName: { ...typography.caption, color: colors.primary, fontWeight: '600', marginBottom: 2 },
  messageText: { ...typography.body },
  textMe: { color: colors.text.inverse },
  textOther: { color: colors.text.primary },
  messageTime: { ...typography.caption, marginTop: spacing.xs },
  timeMe: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  timeOther: { color: colors.text.tertiary },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: spacing.md, paddingTop: spacing.sm,
    backgroundColor: colors.background.primary, borderTopWidth: 0.5, borderTopColor: colors.border.light,
  },
  attachBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  attachIcon: { fontSize: 22 },
  input: {
    flex: 1, backgroundColor: colors.background.secondary, borderRadius: 20,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, maxHeight: 100,
    ...typography.body, color: colors.text.primary,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm,
  },
  sendBtnDisabled: { backgroundColor: colors.background.tertiary },
  sendIcon: { fontSize: 18, color: colors.text.inverse },
});

export default GroupChatScreen;
