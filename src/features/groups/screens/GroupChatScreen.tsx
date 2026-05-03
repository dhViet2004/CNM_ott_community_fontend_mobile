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
  Alert,
} from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { store } from '@store/store';
import {
  setMessages,
  addMessage,
  setLoadingMessages,
  confirmPendingMessage,
  failPendingMessage,
  setMessageRevoked,
  updateMessage,
  deleteMessage,
  addDeletedForMeId,
  Message,
} from '@store/slices/chatSlice';
import { setGroupMembers } from '@store/slices/groupsSlice';
import { messageApi, channelApi } from '@api/endpoints';
import { socketActions } from '@api/socket';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import MessageBubble from '@features/chat/components/MessageBubble';
import PinnedHeader from '@features/chat/components/PinnedHeader';
import MessageSearchPanel from '@features/chat/components/MessageSearchPanel';
import { MessageContextMenu, ChatInput } from '@features/chat/components';
import type { RootStackScreenProps, RootStackParamList } from '@navigation/types';
import { getGroupMembers } from '../api';

type Props = RootStackScreenProps<'GroupChat'>;
const EMPTY_MESSAGES: Message[] = [];
const EMPTY_ARRAY: any[] = [];

type SelectedMessage = {
  id: string | number;
  content: string;
  type: string;
  isMe: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  senderId: string;
} | null;

const ZALO_BLUE = '#008AF3';

const GroupChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, title } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const conversationId = String(groupId);
  const pinnedMessages = useAppSelector((state) => state.chat.pinnedMessages[conversationId] || EMPTY_ARRAY);

  const handlePinMessage = useCallback((msg: Message) => {
    const pinData = {
      id: msg.id,
      content: msg.content,
      contentType: msg.type,
      senderId: msg.senderId,
      senderName: msg.senderName || 'Người dùng',
      createdAt: new Date().toISOString(),
    };

    socketActions.pinMessage(conversationId, pinData, (res: any) => {
      if (res.ok) {
        Alert.alert('Thành công', 'Đã ghim tin nhắn');
      } else {
        Alert.alert('Lỗi', res.error || 'Không thể ghim tin nhắn');
      }
    });
  }, [conversationId]);

  const handleUnpinMessage = useCallback((messageId: string) => {
    socketActions.unpinMessage(conversationId, messageId, (res: any) => {
      if (res.ok) {
        Alert.alert('Thành công', 'Đã bỏ ghim tin nhắn');
      } else {
        Alert.alert('Lỗi', res.error || 'Không thể bỏ ghim tin nhắn');
      }
    });
  }, [conversationId]);

  const handleNavigateToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex(m => String(m.id) === String(messageId));
    if (index !== -1) {
      navigation.setParams({ focusedMessageId: String(messageId) } as any);
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      
      setTimeout(() => {
        navigation.setParams({ focusedMessageId: undefined } as any);
      }, 3000);
    }
  }, [messages, navigation]);

  // Bottom padding cho input
  const bottomPadding = Platform.OS === 'ios'
    ? insets.bottom
    : Math.max(insets.bottom, spacing.md);

  // ✅ FIX: Đọc messages trực tiếp từ Redux store
  const messages = useAppSelector(
    (state) => state.chat.messages[conversationId] ?? EMPTY_MESSAGES
  );

  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
  const currentUser = useAppSelector((state) => state.auth.user);
  const isLoadingMessages = useAppSelector((state) => state.chat.isLoadingMessages);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [defaultChannelId, setDefaultChannelId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SelectedMessage>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const selectedMessageRef = useRef<SelectedMessage>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keep ref in sync with state — so callbacks always read latest value
  useEffect(() => {
    selectedMessageRef.current = selectedMessage;
  }, [selectedMessage]);

  // Track if user is near bottom
  const isNearBottomRef = useRef(true);
  const isInitializedRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;

  const lastMarkedReadRef = useRef<{ messageId: string; timestamp: number } | null>(null);

  // ─── Mark as Read ────────────────────────────────────────────────────────────
  const markAsRead = useCallback(() => {
    const msgs = messagesRef.current;
    if (!conversationId || msgs.length === 0) return;

    // Find all unread messages from OTHER users (group chat: recipient may not have sent any messages)
    const now = Date.now();
    const THREE_SECONDS = 3000;
    const lastMarked = lastMarkedReadRef.current;
    const isRecent = lastMarked && now - lastMarked.timestamp < THREE_SECONDS;

    const unreadMessages = msgs.filter((m) => {
      const isFromOther = String(m.senderId) !== String(currentUserId);
      const alreadyReadByMe = m.readBy?.some(
        (r) => String(r.userId) === String(currentUserId)
      );
      return isFromOther && !alreadyReadByMe && m.status !== 'read';
    });

    if (unreadMessages.length === 0) return;

    // Use the LATEST unread message as the throttle anchor
    const latestUnread = unreadMessages[unreadMessages.length - 1];
    const latestUnreadId = String(latestUnread.id);

    if (isRecent && lastMarked.messageId === latestUnreadId) {
      return; // Already emitted for this latest unread within 3 seconds
    }

    lastMarkedReadRef.current = { messageId: latestUnreadId, timestamp: now };

    // Emit mark_read for EACH unread message so the sender sees ALL of them as read
    unreadMessages.forEach((msg) => {
      const msgId = String(msg.id);
      console.log('[GroupChatScreen] markAsRead → emitting mark_read:', { conversationId, messageId: msgId });
      socketActions.markRead(conversationId, msgId);
    });
  }, [conversationId, currentUserId]);

  const markAsReadRef = useRef(markAsRead);
  markAsReadRef.current = markAsRead;

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
          isRevoked: m.contentType === 'revoked' || m.is_revoked || m.isRevoked || false,
          is_revoked: m.contentType === 'revoked' || m.is_revoked || m.isRevoked || false,
          isDeleted: m.isDeleted || false,
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
      getGroupMembers(groupId).then((members) => {
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


  // ─── Context Menu callbacks (hoisted to top level — Rules of Hooks) ──────────
  const handleRecall = useCallback(() => {
    const msg = selectedMessageRef.current;
    if (!msg) return;
    Alert.alert(
      'Thu hồi tin nhắn',
      'Bạn có chắc muốn thu hồi tin nhắn này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu hồi',
          style: 'destructive',
          onPress: async () => {
            const msgId = String(msg.id);
            const originalContent = msg.content;
            dispatch(setMessageRevoked({ messageId: msgId, conversationId }));
            try {
              await messageApi.revokeMessage(msgId, conversationId);
            } catch (err: any) {
              dispatch(updateMessage({
                messageId: msgId,
                conversationId,
                updates: { isRevoked: false, is_revoked: false, content: originalContent },
              }));
              const errMsg = err?.response?.data?.error
                || err?.response?.data?.message
                || 'Không thể thu hồi tin nhắn';
              Alert.alert('Lỗi', errMsg);
            }
          },
        },
      ]
    );
  }, [dispatch, conversationId]);

  const handleCopy = useCallback(() => {
    const msg = selectedMessageRef.current;
    if (msg) Alert.alert('Sao chép', msg.content);
  }, []);

  const handlePin = useCallback(() => {
    const msg = selectedMessageRef.current;
    if (!msg) return;
    const isPinned = pinnedMessages.some((p: any) => String(p.id) === String(msg.id));
    Alert.alert(
      isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn',
      '',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            if (isPinned) {
              handleUnpinMessage(String(msg.id));
            } else {
              handlePinMessage({ ...msg, senderId: msg.senderId } as any);
            }
          },
        },
      ]
    );
  }, [pinnedMessages, handlePinMessage, handleUnpinMessage]);

  const handleDetails = useCallback(() => {
    const msg = selectedMessageRef.current;
    if (msg) {
      Alert.alert(
        'Chi tiết tin nhắn',
        `Nội dung: ${msg.content}\nLoại: ${msg.type}\nNgười gửi: ${msg.senderName || 'Bạn'}`
      );
    }
  }, []);

  const handleDelete = useCallback(() => {
    const msg = selectedMessageRef.current;
    if (!msg) return;
    Alert.alert(
      'Xóa tin nhắn',
      'Bạn có chắc muốn xóa tin nhắn này? (Chỉ bạn thấy)',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const msgId = String(msg.id);
            const originalContent = msg.content;
            setDeletingMessageId(msgId);
            setSelectedMessage(null);

            // Optimistic: xóa ngay khỏi UI trước khi API trả về
            dispatch(deleteMessage({ conversationId, messageId: msgId }));
            // Track để socket không re-add tin nhắn đã xóa
            dispatch(addDeletedForMeId(msgId));

            try {
              await messageApi.deleteForMe(conversationId, msgId);
            } catch (err: any) {
              // Rollback: khôi phục lại tin nhắn nếu API lỗi
              dispatch(updateMessage({
                messageId: msgId,
                conversationId,
                updates: { isDeleted: false, content: originalContent },
              }));
              const errMsg = err?.response?.data?.error
                || err?.response?.data?.message
                || 'Không thể xóa tin nhắn';
              Alert.alert('Lỗi', errMsg);
            } finally {
              setDeletingMessageId(null);
            }
          },
        },
      ]
    );
  }, [dispatch, conversationId]);

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
      const messageType = item.type;
      const isFocused = (route.params as any).focusedMessageId === String(item.id);

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
          isFocused={isFocused}
          onLongPress={setSelectedMessage}
          readBy={item.readBy}
        />
      );
    },
    [title, currentUserId, route.params]
  );

  const keyExtractor = useCallback((item: Message) => String(item.id), []);

  // Handle scroll to detect if user is near bottom and emit mark_read
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    const isNear = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    isNearBottomRef.current = isNear;

    if (isNear) {
      markAsReadRef.current();
    }
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

  // Auto-scroll + markAsRead when new messages arrive while at bottom
  useEffect(() => {
    if (!isInitializedRef.current || messages.length === 0) return;

    if (messages.length > prevMessagesLengthRef.current) {
      if (isNearBottomRef.current) {
        flatListRef.current?.scrollToEnd({ animated: true });

        setTimeout(() => {
          markAsReadRef.current();
        }, 500);
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Emit mark_read when screen becomes focused
  useFocusEffect(
    useCallback(() => {
      if (isNearBottomRef.current && isInitializedRef.current) {
        markAsRead();
      }
    }, [markAsRead]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.customHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {Icons.back(IconSize.lg, colors.text.inverse)}
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('GroupDetail', { groupId })
              }
              style={styles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {Icons.videocam(IconSize.lg, colors.text.inverse)}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsSearchOpen(true)}
              style={styles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {Icons.search(IconSize.lg, colors.text.inverse)}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('GroupDetail', { groupId })
              }
              style={styles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {Icons.menu(IconSize.lg, colors.text.inverse)}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <PinnedHeader
          pinnedMessages={pinnedMessages}
          onUnpin={handleUnpinMessage}
          onNavigateToMessage={handleNavigateToMessage}
        />
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
          <ChatInput
            value={inputText}
            onChangeText={handleTextChange}
            onSend={handleSend}
            conversationId={conversationId}
            senderId={currentUserId ? String(currentUserId) : undefined}
            onUploadSuccess={async (url, name, size, msgData) => {
              if (msgData) {
                dispatch(addMessage({
                  id: String(msgData.id || msgData.messageId || Date.now()),
                  conversationId: msgData.conversationId || conversationId,
                  senderId: String(msgData.senderId || currentUserId),
                  senderName: currentUser?.display_name || currentUser?.username || 'Bạn',
                  sender_name: currentUser?.display_name || currentUser?.username || 'Bạn',
                  sender_avatar: currentUser?.avatar_url || (currentUser as any)?.avatar || null,
                  type: (msgData.contentType || 'file') as any,
                  content: msgData.content || name || url,
                  file_url: msgData.file_url || msgData.attachments?.[0]?.url || url,
                  file_name: msgData.file_name || name || null,
                  file_size: msgData.file_size || size || null,
                  timestamp: msgData.createdAt || msgData.created_at || new Date().toISOString(),
                  status: 'sent',
                }));
              }

              if (isNearBottomRef.current) {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
              }
            }}
            onVoiceRecord={async (audioUri) => {
              try {
                const formData = new FormData();
                const fileUri = audioUri;
                const fileName = `voice_${Date.now()}.m4a`;

                formData.append('file', {
                  uri: fileUri,
                  name: fileName,
                  type: 'audio/m4a',
                } as unknown as Blob);

                if (currentUserId) {
                  formData.append('sender_id', String(currentUserId));
                }
                
                formData.append('group_id', String(groupId));
                formData.append('conversationId', conversationId);

                const sentMsg = await messageApi.sendFileMessage(conversationId, formData);
                console.log('[GroupChat] Voice message sent successfully');

                dispatch(addMessage({
                  id: String(sentMsg.id || Date.now()),
                  conversationId: sentMsg.conversationId || conversationId,
                  senderId: String(sentMsg.senderId || currentUserId),
                  senderName: currentUser?.display_name || currentUser?.username || 'Bạn',
                  sender_name: currentUser?.display_name || currentUser?.username || 'Bạn',
                  sender_avatar: currentUser?.avatar_url || (currentUser as any)?.avatar || null,
                  type: (sentMsg.contentType || 'voice') as any,
                  content: sentMsg.content || '',
                  file_url: sentMsg.file_url || sentMsg.attachments?.[0]?.url || null,
                  file_name: sentMsg.file_name || null,
                  file_size: sentMsg.file_size || null,
                  timestamp: sentMsg.createdAt || sentMsg.created_at || new Date().toISOString(),
                  status: 'sent',
                }));

                if (isNearBottomRef.current) {
                  setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
                }
              } catch (err) {
                console.error('[GroupChat] Error sending voice message:', err);
                Alert.alert('Lỗi', 'Không thể gửi tin nhắn thoại. Vui lòng thử lại.');
              }
            }}
          />
        </View>
      </KeyboardAvoidingView>

      {/* ── Context Menu ── */}
      <MessageContextMenu
        message={selectedMessage}
        visible={selectedMessage !== null}
        onClose={() => setSelectedMessage(null)}
        isOwn={selectedMessage?.isMe ?? false}
        isDeleting={deletingMessageId === String(selectedMessage?.id)}
        onReply={() => Alert.alert('Trả lời', 'Tính năng đang phát triển')}
        onForward={() => Alert.alert('Chuyển tiếp', 'Tính năng đang phát triển')}
        onSave={() => Alert.alert('Lưu', 'Tính năng đang phát triển')}
        onRecall={handleRecall}
        onCopy={handleCopy}
        onPin={handlePin}
        onReminder={() => Alert.alert('Nhắc hẹn', 'Tính năng đang phát triển')}
        onSelectMultiple={() => Alert.alert('Chọn nhiều', 'Tính năng đang phát triển')}
        onQuickMessage={() => Alert.alert('Tạo tin nhắn nhanh', 'Tính năng đang phát triển')}
        onTranslate={() => Alert.alert('Dịch', 'Tính năng đang phát triển')}
        onReadText={() => Alert.alert('Đọc văn bản', 'Tính năng đang phát triển')}
        onDetails={handleDetails}
        onDelete={handleDelete}
      />

      {/* ── Search Panel ── */}
      <MessageSearchPanel
        visible={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        conversationId={conversationId}
        currentUserId={currentUserId || ''}
        onResultClick={(item) => {
          setIsSearchOpen(false);
          if (String(item.conversationId) === String(conversationId)) {
            handleNavigateToMessage(String(item.id));
          } else {
            // Navigate to the other conversation (DM or Group)
            // If it's a DM, conversationId starts with "dm:"
            if (item.conversationId.startsWith('dm:')) {
              navigation.replace('Chat', {
                conversationId: item.conversationId,
                title: item.senderDisplayName || 'Cuộc trò chuyện',
                focusedMessageId: String(item.id),
              });
            } else {
              navigation.replace('GroupChat', {
                groupId: item.conversationId,
                title: 'Nhóm', // fallback
                focusedMessageId: String(item.id),
              });
            }
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.chatBg,
  },
  customHeader: {
    backgroundColor: ZALO_BLUE,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  backButton: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    color: colors.text.inverse,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
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
