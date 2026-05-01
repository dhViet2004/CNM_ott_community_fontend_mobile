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
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { store } from '@store/store';
import {
  setMessages,
  addMessage,
  setLoadingMessages,
  confirmPendingMessage,
  failPendingMessage,
  Message,
} from '@store/slices/chatSlice';
import { setGroupMembers } from '@store/slices/groupsSlice';
import { messageApi, channelApi, groupsApi } from '@api/endpoints';
import { socketActions } from '@api/socket';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import MessageBubble from '@features/chat/components/MessageBubble';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'GroupChat'>;

const GroupChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, title } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // Bottom padding cho input
  const bottomPadding = Platform.OS === 'ios'
    ? insets.bottom
    : Math.max(insets.bottom, spacing.md);

  // Dùng groupId trực tiếp như web để tương thích với backend
  // Backend lưu messages dưới key = groupId (ví dụ: "group_1777567390968")
  const conversationId = String(groupId);

  // ✅ FIX: Đọc messages trực tiếp từ Redux store
  const messages = useAppSelector((state) => state.chat.messages[conversationId] ?? []);

  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
  const currentUser = useAppSelector((state) => state.auth.user);
  const isLoadingMessages = useAppSelector((state) => state.chat.isLoadingMessages);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [defaultChannelId, setDefaultChannelId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track if user is near bottom
  const isNearBottomRef = useRef(true);
  const isInitializedRef = useRef(false);

  // ─── Load Messages ────────────────────────────────────────────────────────
  // ✅ FIX: Tách loadMessages khỏi dependency defaultChannelId để tránh loop
  const loadMessages = useCallback(async () => {
    dispatch(setLoadingMessages(true));
    try {
      const result = await messageApi.getConversationMessages(conversationId);
      const rawMessages = result.messages || [];

      const mapped = rawMessages.map((m: any) => {
        const senderDisplayName = m.senderDisplayName || m.sender_name || m.Sender?.display_name || 'Unknown';
        const senderAvatarUrl = m.senderAvatarUrl || m.sender_avatar || (m.Sender?.avatar_url ?? null);
        return {
          id: String(m.id ?? m.messageId ?? ''),
          conversationId,
          senderId: String(m.senderId),
          senderName: senderDisplayName,
          senderAvatar: senderAvatarUrl,
          sender_name: senderDisplayName,
          sender_avatar: senderAvatarUrl,
          content: m.content ?? '',
          timestamp: m.createdAt ?? m.created_at ?? new Date().toISOString(),
          createdAt: m.createdAt ?? m.created_at,
          type: (m.contentType ?? m.type ?? 'text') as Message['type'],
          file_url: m.file_url ?? m.attachments?.[0]?.url ?? null,
          status: 'sent' as const,
        };
      });
      dispatch(setMessages({ conversationId, messages: mapped as Message[] }));
    } catch (err) {
      console.error('[GroupChatScreen] Failed to load group messages:', err);
      dispatch(setMessages({ conversationId, messages: [] }));
    } finally {
      dispatch(setLoadingMessages(false));
    }
  }, [conversationId, dispatch]);

  // ─── Get default channel ──────────────────────────────────────────────────
  const loadDefaultChannel = useCallback(async () => {
    try {
      const channels = await channelApi.getChannels(groupId);
      if (channels && channels.length > 0) {
        // Use first channel or "general" channel
        const generalChannel = channels.find((c: any) =>
          c.name?.toLowerCase() === 'general' || c.name?.toLowerCase() === 'chung'
        );
        setDefaultChannelId(generalChannel?.channelId || channels[0].channelId);
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
    }
  }, [groupId]);

  useEffect(() => {
    loadDefaultChannel();
  }, [loadDefaultChannel]);

  useEffect(() => {
    // Reset state khi vào screen
    isInitializedRef.current = false;
    isNearBottomRef.current = true;
    loadMessages();
    socketActions.joinConversation(conversationId);

    // Load group members if not already in store (for sender name lookup in realtime messages)
    const existingMembers = store.getState().groups?.groupMembers?.[conversationId];
    if (!existingMembers || existingMembers.length === 0) {
      groupsApi.getMembers(groupId).then((members) => {
        dispatch(setGroupMembers({ groupId, members }));
      }).catch((err) => {
        console.error('[GroupChatScreen] Failed to load group members:', err);
      });
    }

    return () => {
      socketActions.leaveConversation(conversationId);
    };
  }, [conversationId]);

  // ─── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMessages();
    setIsRefreshing(false);
  }, [loadMessages]);

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

    const optimisticMsg: Message = {
      id: tempId,
      conversationId,
      senderId: currentUserId || '',
      senderName: currentUser?.display_name || 'Tôi',
      senderAvatar: currentUser?.avatar_url ?? null,
      sender_name: currentUser?.display_name || 'Tôi',
      sender_avatar: currentUser?.avatar_url ?? null,
      content: text,
      timestamp: new Date().toISOString(),
      type: 'text',
      status: 'sending',
    };
    dispatch(addMessage(optimisticMsg));

    // Chỉ auto-scroll nếu user đang ở gần cuối
    if (isNearBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }

    try {
      const result = await messageApi.sendMessage(conversationId, text, currentUserId || '');
      const realId = String(result.id ?? result.messageId ?? tempId);

      dispatch(
        confirmPendingMessage({
          tempId,
          realId,
          conversationId,
          senderId: String(result.senderId),
          senderName: (result as any).senderDisplayName || (result as any).sender_name || currentUser?.display_name || 'Tôi',
          senderAvatar: (result as any).senderAvatarUrl ?? (result as any).sender_avatar ?? null,
          content: result.content ?? '',
          type: (result.contentType ?? (result as any).type ?? 'text') as Message['type'],
          file_url: result.file_url ?? (result as any).attachments?.[0]?.url ?? null,
        })
      );
    } catch {
      dispatch(failPendingMessage(tempId));
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = String(item.senderId) === String(currentUserId);
      const time = new Date(item.createdAt ?? item.timestamp ?? Date.now()).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const senderName = item.senderName || item.sender_name || 'Unknown';
      const senderAvatar = item.senderAvatar || item.sender_avatar || null;
      // Chỉ dùng các type được MessageBubble hỗ trợ
      const messageType = item.type === 'video' || item.type === 'audio' ? 'file' : item.type;

      return (
        <MessageBubble
          id={item.id}
          senderId={item.senderId}
          senderName={senderName}
          senderAvatar={senderAvatar}
          content={item.content}
          time={time}
          isMe={isMe}
          type={messageType}
          file_url={item.file_url}
          status={item.status}
          isDeleted={item.isDeleted}
          isRevoked={item.isRevoked}
          defaultName={title}
          onLongPress={() => {}}
        />
      );
    },
    [title, currentUserId]
  );

  const keyExtractor = useCallback((item: Message) => String(item.id), []);

  // Handle scroll to detect if user is near bottom
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    const isNear = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    isNearBottomRef.current = isNear;
  }, []);

  // Initial scroll to bottom after messages load
  const handleContentSizeChange = useCallback(() => {
    if (!isInitializedRef.current && messages.length > 0) {
      isInitializedRef.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages.length]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages as Message[]}
          keyExtractor={keyExtractor}
          renderItem={renderMessage as any}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: bottomPadding + spacing.md }
          ]}
          onContentSizeChange={handleContentSizeChange}
          onScroll={handleScroll}
          scrollEventThrottle={16}
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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        />
        <View style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}>
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.attachBtn}>
              <View style={styles.attachIconContainer}>
                {Icons.attach(IconSize.lg)}
              </View>
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
              <View style={styles.sendIconContainer}>
                {Icons.send(IconSize.lg, inputText.trim() ? colors.text.inverse : colors.text.tertiary)}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.chatBg,
  },
  keyboardView: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    alignItems: 'center',
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
  inputWrapper: {
    backgroundColor: colors.background.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
  sendIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default GroupChatScreen;
