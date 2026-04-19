import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createSelector } from '@reduxjs/toolkit';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import {
  setMessages,
  addMessage,
  setLoadingMessages,
  setTypingUser,
  removeTypingUser,
  setMessageRevoked,
  confirmPendingMessage,
  failPendingMessage,
  setMessageFailed,
} from '@store/slices/chatSlice';
import { messageApi } from '@api/endpoints';
import { socketActions, connectSocket } from '@api/socket';
import { colors, spacing, typography } from '@theme';
import { Avatar } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';
import type { RootState } from '@store/store';

type Props = RootStackScreenProps<'Chat'>;

interface MessageItem {
  id: string | number;
  senderId: string;
  senderName?: string;
  senderAvatar?: string | null;
  content: string;
  time: string;
  isMe: boolean;
  type: 'text' | 'image' | 'file' | 'sticker' | 'emoji';
  file_url?: string | null;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isDeleted?: boolean;
  isRevoked?: boolean;
}

const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, title, userId } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // ─── Memoized Selectors ─────────────────────────────────────────────────────
  const messagesSelector = useMemo(
    () =>
      createSelector(
        (state: RootState) => state.chat.messages,
        (messages) => messages[conversationId] || []
      ),
    [conversationId]
  );
  const typingUsersSelector = useMemo(
    () =>
      createSelector(
        (state: RootState) => state.chat.typingUsers,
        (typingUsers) => typingUsers[conversationId] || []
      ),
    [conversationId]
  );

  const messages = useAppSelector(messagesSelector);
  const typingUsers = useAppSelector(typingUsersSelector);
  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
  const currentUser = useAppSelector((state) => state.auth.user);
  const isLoadingMessages = useAppSelector((state) => state.chat.isLoadingMessages);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load Messages ────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    dispatch(setLoadingMessages(true));
    try {
      const result = await messageApi.getConversationMessages(conversationId);
      const mapped: MessageItem[] = result.messages.map((m) => ({
        id: String(m.id ?? m.messageId ?? ''),
        senderId: String(m.senderId),
        senderName: m.sender_name,
        senderAvatar: m.sender_avatar ?? null,
        content: m.content ?? '',
        time: new Date(m.createdAt ?? m.created_at ?? Date.now()).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isMe: String(m.senderId) === String(currentUserId),
        type: (m.contentType ?? m.type ?? 'text') as MessageItem['type'],
        file_url: m.file_url ?? m.attachments?.[0]?.url ?? null,
        status: 'sent',
        isDeleted: m.is_revoked,
        isRevoked: m.is_revoked,
      }));
      dispatch(setMessages({ conversationId, messages: mapped as any }));
    } catch (err) {
      console.error('Failed to load messages:', err);
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

  // ─── Typing Indicator ─────────────────────────────────────────────────────
  const handleTextChange = (text: string) => {
    setInputText(text);

    if (!isTyping) {
      socketActions.sendTyping(conversationId);
      setIsTyping(true);
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      socketActions.sendStopTyping(conversationId);
      setIsTyping(false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  // ─── Send Message ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim()) return;

    const tempId = `temp_${Date.now()}`;
    const text = inputText.trim();
    setInputText('');
    socketActions.sendStopTyping(conversationId);
    setIsTyping(false);

    // Optimistic update — tracked as pending so it can be confirmed or removed
    const optimisticMsg: MessageItem = {
      id: tempId,
      senderId: currentUserId || '',
      senderName: currentUser?.display_name,
      senderAvatar: currentUser?.avatar_url ?? null,
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

      // Replace optimistic message with confirmed real message
      dispatch(
        confirmPendingMessage({
          tempId,
          realId,
          conversationId,
          senderId: String(result.senderId),
          senderName: result.sender_name,
          senderAvatar: result.sender_avatar ?? null,
          content: result.content ?? '',
          type: (result.contentType ?? result.type ?? 'text') as MessageItem['type'],
          file_url: result.file_url ?? result.attachments?.[0]?.url ?? null,
        })
      );
    } catch (err) {
      // Mark optimistic message as failed instead of removing it immediately
      dispatch(
        failPendingMessage(tempId)
      );
      // Replace the "sending" status message with a visible error indicator
      dispatch(
        setMessageFailed({ conversationId, messageId: tempId })
      );
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    }
  };

  // ─── Handle Long Press ────────────────────────────────────────────────────
  const handleMessageLongPress = (msg: MessageItem) => {
    if (!msg.isMe) return;

    Alert.alert('Tin nhắn', msg.content, [
      {
        text: 'Thu hồi',
        style: 'destructive',
        onPress: async () => {
          try {
            await messageApi.revokeMessage(String(msg.id), conversationId);
            dispatch(
              setMessageRevoked({ messageId: String(msg.id), conversationId })
            );
          } catch {
            Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
          }
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  // ─── Typing Label ─────────────────────────────────────────────────────────
  const typingLabel = useMemo(() => {
    const others = typingUsers.filter((u) => u.userId !== currentUserId);
    if (others.length === 0) return '';
    const names = others.map((u) => u.user_name || 'Ai đó').join(', ');
    return `${names} đang nhập...`;
  }, [typingUsers, currentUserId]);

  // ─── Render Message ────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: MessageItem }) => {
    if (item.isDeleted || item.isRevoked) {
      return (
        <View
          style={[
            styles.messageRow,
            item.isMe ? styles.messageRowMe : styles.messageRowOther,
          ]}
        >
          {!item.isMe && (
            <Avatar
              uri={item.senderAvatar ?? (item as any).sender_avatar ?? undefined}
              name={item.senderName || (item as any).sender_name || title}
              size="xs"
            />
          )}
          <View style={styles.messageContentWrapper}>
            {!item.isMe && (item.senderName || (item as any).sender_name) && (
              <Text style={styles.senderName}>
                {item.senderName || (item as any).sender_name}
              </Text>
            )}
            <View
              style={[
                styles.messageBubble,
                item.isMe ? styles.bubbleMe : styles.bubbleOther,
              ]}
            >
              <Text style={[styles.revokedText, item.isMe && styles.revokedTextMe]}>
                Tin nhắn đã bị thu hồi
              </Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => handleMessageLongPress(item)}
        delayLongPress={500}
        style={[
          styles.messageRow,
          item.isMe ? styles.messageRowMe : styles.messageRowOther,
        ]}
      >
        {!item.isMe && (
          <Avatar
            uri={item.senderAvatar ?? (item as any).sender_avatar ?? undefined}
            name={item.senderName || (item as any).sender_name || title}
            size="xs"
          />
        )}
        <View style={styles.messageContentWrapper}>
          {!item.isMe && (item.senderName || (item as any).sender_name) && (
            <Text style={styles.senderName}>
              {item.senderName || (item as any).sender_name}
            </Text>
          )}
          <View
            style={[
              styles.messageBubble,
              item.isMe ? styles.bubbleMe : styles.bubbleOther,
            ]}
          >
          {item.type === 'image' && item.file_url && (
            <Image
              source={{ uri: item.file_url }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          {item.type !== 'image' && (
            <Text
              style={[
                styles.messageText,
                item.isMe ? styles.textMe : styles.textOther,
              ]}
            >
              {item.content}
            </Text>
          )}
          <View
            style={[
              styles.messageFooter,
              item.isMe && styles.messageFooterMe,
            ]}
          >
            <Text
              style={[
                styles.messageTime,
                item.isMe ? styles.timeMe : styles.timeOther,
              ]}
            >
              {item.time}
            </Text>
            {item.isMe && (
              <Text style={styles.messageStatus}>
                {item.status === 'sending'
                  ? '◷'
                  : item.status === 'sent'
                  ? '✓'
                  : item.status === 'delivered'
                  ? '✓✓'
                  : ''}
              </Text>
            )}
          </View>
        </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {typingLabel ? (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{typingLabel}</Text>
        </View>
      ) : null}

      <FlatList
        ref={flatListRef}
        data={messages as any}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage as any}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View key="list-empty">
            {isLoadingMessages ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
                <Text style={styles.emptySubtext}>Gửi lời chào đầu tiên!</Text>
              </View>
            )}
          </View>
        }
      />

      <View style={[styles.inputBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.sm }]}>
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
  container: {
    flex: 1,
    backgroundColor: colors.background.chatBg,
  },
  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background.secondary,
  },
  typingText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    ...typography.subtitle,
    color: colors.text.secondary,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageContentWrapper: {
    maxWidth: '72%',
  },
  senderName: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
    marginHorizontal: spacing.sm,
  },
  messageBubble: {
    maxWidth: '72%',
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.sm,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.background.primary,
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: spacing.borderRadius.md,
  },
  messageText: {
    ...typography.body,
  },
  textMe: {
    color: colors.text.inverse,
  },
  textOther: {
    color: colors.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  messageFooterMe: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    ...typography.caption,
  },
  timeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeOther: {
    color: colors.text.tertiary,
  },
  messageStatus: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },
  revokedText: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  revokedTextMe: {
    color: 'rgba(255,255,255,0.5)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background.primary,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.light,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIcon: {
    fontSize: 22,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    color: colors.text.primary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendBtnDisabled: {
    backgroundColor: colors.background.tertiary,
  },
  sendIcon: {
    fontSize: 18,
    color: colors.text.inverse,
  },
});

export default ChatDetailScreen;
