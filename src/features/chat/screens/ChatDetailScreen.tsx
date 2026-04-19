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
} from '@store/slices/chatSlice';
import { messageApi } from '@api/endpoints';
import { socketActions, connectSocket } from '@api/socket';
import { colors, spacing, typography } from '@theme';
import { Avatar } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'Chat'>;

interface MessageItem {
  id: string;
  senderId: string;
  content: string;
  time: string;
  isMe: boolean;
  type: 'text' | 'image' | 'file' | 'sticker' | 'emoji';
  file_url?: string | null;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isDeleted?: boolean;
  isRevoked?: boolean;
}

const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, title, userId } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const messages = useAppSelector(
    (state) => state.chat.messages[conversationId] || []
  );
  const typingUsers = useAppSelector(
    (state) => state.chat.typingUsers[conversationId] || []
  );
  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
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
        id: m.messageId,
        senderId: m.senderId,
        content: m.content,
        time: new Date(m.created_at).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isMe: m.senderId === currentUserId,
        type: m.type as MessageItem['type'],
        file_url: m.file_url,
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

    // Optimistic update
    const optimisticMsg: MessageItem = {
      id: tempId,
      senderId: currentUserId || '',
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
      const result = await messageApi.sendMessage(conversationId, text);
      // Replace optimistic message with real one
      dispatch(
        addMessage({
          id: result.messageId,
          conversationId,
          senderId: result.senderId,
          content: result.content,
          time: new Date(result.created_at).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isMe: result.senderId === currentUserId,
          type: result.type as any,
          file_url: result.file_url,
          status: 'sent',
        } as any)
      );
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
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
            await messageApi.revokeMessage(msg.id, conversationId);
            dispatch(
              setMessageRevoked({ messageId: msg.id, conversationId })
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
  const typingLabel =
    typingUsers.length > 0
      ? typingUsers
          .filter((u) => u.userId !== currentUserId)
          .map((u) => u.user_name || 'Ai đó')
          .join(', ') + ' đang nhập...'
      : '';

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
        {!item.isMe && <Avatar name={title} size="xs" />}
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
          isLoadingMessages ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
              <Text style={styles.emptySubtext}>Gửi lời chào đầu tiên!</Text>
            </View>
          )
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
