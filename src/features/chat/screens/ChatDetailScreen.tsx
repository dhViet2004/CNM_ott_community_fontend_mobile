import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  RefreshControl,
  Keyboard,
  StatusBar,
  TouchableOpacity,
  Alert,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shallowEqual } from 'react-redux';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useMessages, MessageItem } from '@features/chat/hooks/useMessages';
import { useTypingIndicator } from '@features/chat/hooks/useTypingIndicator';
import { MessageBubble, TypingIndicator, ChatInput, PinnedHeader, MessageContextMenu, ForwardMessageModal } from '@features/chat/components';
import MessageSearchPanel from '@features/chat/components/MessageSearchPanel';
import { Icons, IconSize } from '@components/common';
import { socketActions } from '@api/socket';
import { messageApi, friendsApi } from '@api/endpoints';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { confirmPendingMessage, failPendingMessage, setActiveConversation, setMessageFailed, setMessageRevoked, updateMessage, addMessage, deleteMessage, addDeletedForMeId } from '@store/slices/chatSlice';
import type { ReplyToMessage } from '@store/slices/chatSlice';
import { colors, spacing } from '@theme';
import type { RootStackScreenProps, RootStackParamList } from '@navigation/types';
import type { PollData } from '@/types';

type Props = RootStackScreenProps<'Chat'>;
const EMPTY_ARRAY: any[] = [];

const HEADER_BLUE = '#008AF3';
const CHAT_BG = '#F4F6F8';

type SelectedMessage = {
  id: string | number;
  content: string;
  type: string;
  isMe: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  senderId: string;
} | null;

const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, title } = route.params;
  const focusedMessageIdFromParams = (route.params as any).focusedMessageId;
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SelectedMessage>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [forwardMessageState, setForwardMessageState] = useState<{
    messageId: string;
    content: string;
  } | null>(null);

  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const pinnedMessages = useAppSelector(
    (state) => state.chat.pinnedMessages[conversationId] || EMPTY_ARRAY,
    shallowEqual
  );
  const friends = useAppSelector((state) => state.chat.friends, shallowEqual);
  const [chatBgUrl, setChatBgUrl] = useState<string | null>(null);

  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth?.user?.userId);
  const currentUser = useAppSelector((state) => state.auth?.user);

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleChatTouch = () => {
    if (isPinnedExpanded) {
      setIsPinnedExpanded(false);
    }
  };

  const handleBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate('MainTabs');
  }, [navigation]);

  useEffect(() => {
    dispatch(setActiveConversation(conversationId));
    return () => {
      dispatch(setActiveConversation(null));
    };
  }, [conversationId, dispatch]);

  // Bottom padding — account for home indicator on iOS
  // When keyboard is visible, we don't need the bottom inset
  const bottomPadding = isKeyboardVisible
    ? 0
    : Platform.OS === 'ios'
    ? insets.bottom
    : Math.max(insets.bottom, spacing.md);

  // Load chat background
  useEffect(() => {
    const friend = friends.find((f) => (f.friend_id || f.userId) === route.params.userId);
    const fId = friend?.friendshipId;

    if (fId) {
      friendsApi.getChatBackground(fId).then((res) => {
        setChatBgUrl(res.chatBgUrl);
      }).catch(() => {});

      const listener = (data: { friendshipId: string; bgUrl: string | null }) => {
        if (data.friendshipId === fId) {
          setChatBgUrl(data.bgUrl);
        }
      };

      const socket = require('@api/socket').socket;
      socket?.on('chat_background_updated', listener);

      return () => {
        socket?.off('chat_background_updated', listener);
      };
    }
  }, [conversationId, friends, route.params.userId]);

  const handlePinMessage = useCallback((msg: MessageItem) => {
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [replyingMessage, setReplyingMessage] = useState<ReplyToMessage | null>(null);
  const isNearBottomRef = useRef(true);
  const isInitializedRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);

  const { messages, isLoading, loadMessages, addOptimisticMessage } = useMessages({
    conversationId,
    autoLoad: false,
  });

  const { typingLabel, handleTextChange } = useTypingIndicator({ conversationId });

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        if (isNearBottomRef.current) {
          setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
        }
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMessages();
    setIsRefreshing(false);
  }, [loadMessages]);

  useEffect(() => {
    loadMessages();
    isInitializedRef.current = false;
  }, [conversationId]);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const lastMarkedReadRef = useRef<{ messageId: string; timestamp: number } | null>(null);

  const markAsRead = useCallback(() => {
    const msgs = messagesRef.current;
    if (!conversationId || msgs.length === 0) return;

    const lastReceivedMessage = msgs.find((m) => !m.isMe);
    if (!lastReceivedMessage) return;

    const messageId = String(lastReceivedMessage.id);
    const now = Date.now();
    const THREE_SECONDS = 3000;
    if (
      lastMarkedReadRef.current &&
      lastMarkedReadRef.current.messageId === messageId &&
      now - lastMarkedReadRef.current.timestamp < THREE_SECONDS
    ) {
      return;
    }

    // Bỏ qua nếu tin nhắn này vốn đã được đánh dấu là "read" bởi mình
    const isAlreadyReadByMe = lastReceivedMessage.readBy?.some(
      (reader) => String(reader.userId) === String(currentUserId)
    );
    if (isAlreadyReadByMe || lastReceivedMessage.status === 'read') return;

    lastMarkedReadRef.current = { messageId, timestamp: now };
    console.log('[ChatDetailScreen] markAsRead → emitting mark_read:', { conversationId, messageId });
    socketActions.markRead(conversationId, messageId);
  }, [conversationId, currentUserId]);

  const markAsReadRef = useRef(markAsRead);
  markAsReadRef.current = markAsRead;

  // Merged scroll handler: updates isNearBottomRef AND emits mark_read when at bottom
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset } = event.nativeEvent;
    const paddingFromTop = 100;
    // With inverted=true: scrollOffset 0 = newest content visible at top of screen.
    // User is at bottom when contentOffset.y <= paddingFromTop.
    const isNear = contentOffset.y <= paddingFromTop;
    isNearBottomRef.current = isNear;

    if (isNear) {
      markAsReadRef.current();
    }
  }, []);

  // Merged effect: auto-scroll AND emit mark_read with 500ms debounce when new message arrives while at bottom
  useEffect(() => {
    if (!isInitializedRef.current || messages.length === 0) return;

    // Chỉ chạy khi có tin nhắn mới thêm vào
    if (messages.length > prevMessagesLengthRef.current) {
      if (isNearBottomRef.current) {
        // 1. Tự động cuộn xuống tin nhắn mới nhất
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

        // 2. Thêm một khoảng trễ nhỏ (500ms) để đợi UI cập nhật và Backend lưu xong tin nhắn
        // Dùng markAsReadRef.current() thay vì markAsRead() để không bị lỗi Stale Closure
        setTimeout(() => {
          markAsReadRef.current();
        }, 500);
      }
    }

    // Cập nhật lại độ dài mảng tin nhắn
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Emit mark_read when screen becomes focused and user is at bottom
  useFocusEffect(
    useCallback(() => {
      // Đảm bảo màn hình đã load xong list thì mới báo đã xem
      if (isNearBottomRef.current && isInitializedRef.current) {
        markAsRead();
      }
    }, [markAsRead]) // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (focusedMessageIdFromParams && messages.length > 0) {
      const index = messages.findIndex((m) => String(m.id) === String(focusedMessageIdFromParams));
      if (index !== -1) {
        setFocusedMessageId(String(focusedMessageIdFromParams));
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }, 500);
        setTimeout(() => setFocusedMessageId(null), 3000);
      }
    }
  }, [focusedMessageIdFromParams, messages]);

  // Scroll to a pinned message — uses messages from useMessages (defined above)
  const handleNavigateToMessage = useCallback((messageId: string) => {
    const index = messages.findIndex((m) => String(m.id) === String(messageId));
    if (index !== -1) {
      setFocusedMessageId(String(messageId));
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setTimeout(() => setFocusedMessageId(null), 3000);
    } else {
      Alert.alert('Thông báo', 'Tin nhắn này hiện chưa được tải về, vui lòng cuộn lên để tìm lại');
    }
  }, [messages]);

  const handleReplyToMessage = useCallback((msg: NonNullable<SelectedMessage>) => {
    setReplyingMessage({
      id: msg.id,
      content: msg.content || '',
      contentType: msg.type,
      senderId: msg.senderId,
      senderDisplayName: msg.senderName || null,
      senderAvatarUrl: msg.senderAvatar || null,
    });
    setSelectedMessage(null);
  }, []);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setInputText('');
      Keyboard.dismiss();
      socketActions.sendStopTyping(conversationId);

      const replySnapshot = replyingMessage;
      const tempId = addOptimisticMessage({
        conversationId,
        senderId: currentUserId || '',
        senderName: currentUser?.display_name,
        senderAvatar: currentUser?.avatar_url ?? null,
        content: text,
        type: 'text',
        file_url: null,
        replyTo: replySnapshot?.id ?? null,
        replyToMessage: replySnapshot,
      });
      setReplyingMessage(null);

      try {
        const result = await messageApi.sendMessage(conversationId, text, currentUserId || '', 'text', replySnapshot?.id ?? null);
        const realId = String(result.id ?? result.messageId ?? tempId);

        dispatch(confirmPendingMessage({
          tempId,
          realId,
          conversationId,
          senderId: String(result.senderId),
          senderName: result.sender_name,
          senderAvatar: result.sender_avatar ?? null,
          content: result.content ?? text,
          type: (result.contentType ?? result.type ?? 'text') as MessageItem['type'],
          file_url: result.file_url ?? result.attachments?.[0]?.url ?? null,
          replyTo: result.replyTo ?? replySnapshot?.id ?? null,
          replyToMessage: result.replyToMessage ?? replySnapshot ?? null,
        }));

        if (isNearBottomRef.current) {
          setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
        }
      } catch {
        dispatch(failPendingMessage(tempId));
        dispatch(setMessageFailed({ conversationId, messageId: tempId }));
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      }
    },
    [conversationId, currentUserId, currentUser, dispatch, addOptimisticMessage, replyingMessage]
  );

  const handleCreatePoll = useCallback(
    async (pollPayload: { content: string; pollData: PollData }) => {
      try {
        const result: any = await new Promise((resolve) => {
          socketActions.sendMessage(
            conversationId,
            pollPayload.content,
            'poll',
            pollPayload.pollData,
            resolve
          );
        });

        if (result?.ok === false) {
          throw new Error(result.error || 'Không thể tạo bình chọn');
        }

        const sentMessage = result?.message || result;

        dispatch(addMessage({
          id: String(sentMessage.id || sentMessage.messageId || Date.now()),
          conversationId: sentMessage.conversationId || conversationId,
          senderId: String(sentMessage.senderId || currentUserId),
          senderName: currentUser?.display_name || currentUser?.username || 'Bạn',
          sender_name: currentUser?.display_name || currentUser?.username || 'Bạn',
          sender_avatar: currentUser?.avatar_url || (currentUser as any)?.avatar || null,
          type: 'poll',
          content: sentMessage.content || pollPayload.content,
          pollData: sentMessage.pollData || pollPayload.pollData,
          file_url: null,
          file_name: null,
          file_size: null,
          timestamp: sentMessage.createdAt || sentMessage.created_at || new Date().toISOString(),
          status: 'sent',
        }));

        if (isNearBottomRef.current) {
          setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
        }
      } catch (err) {
        console.error('[ChatDetail] Error creating poll:', err);
        Alert.alert('Lỗi', 'Không thể tạo bình chọn. Vui lòng thử lại.');
        throw err;
      }
    },
    [conversationId, currentUserId, currentUser, dispatch]
  );

  const onTextChange = useCallback(
    (text: string) => {
      setInputText(text);
      handleTextChange(text);
      // Gọi markAsRead khi người dùng đang gõ phím
      markAsReadRef.current();
    },
    [handleTextChange]
  );

  const renderMessage = useCallback(
    ({ item }: { item: MessageItem }) => {
      const senderName =
        !item.isMe && (!item.senderName || item.senderName === 'Unknown')
          ? title
          : item.senderName;

      return (
        <MessageBubble
          id={item.id}
          conversationId={item.conversationId}
          senderId={item.senderId}
          senderName={senderName}
          senderAvatar={item.senderAvatar}
          content={item.content}
          time={item.time}
          isMe={item.isMe}
          type={item.type}
          file_url={item.file_url}
          status={item.status}
          isDeleted={item.isDeleted}
          isRevoked={item.isRevoked}
          defaultName={title}
          isFocused={String(item.id) === focusedMessageId}
          readBy={item.readBy}
          replyToMessage={item.replyToMessage}
          pollData={item.pollData}
          currentUserId={currentUserId}
          onJumpToMessage={(messageId) => handleNavigateToMessage(String(messageId))}
          onLongPress={(msg) => {
            setSelectedMessage(msg);
          }}
        />
      );
    },
    [title, focusedMessageId, handleNavigateToMessage, currentUserId]
  );

  const keyExtractor = useCallback((item: MessageItem) => String(item.id), []);

  // Initial scroll to bottom (inverted: offset 0 = bottom of content)
  const handleContentSizeChange = useCallback(() => {
    if (!isInitializedRef.current && messages.length > 0) {
      isInitializedRef.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
        // Gửi sự kiện "đã xem" ngay khi load xong tin nhắn
        markAsReadRef.current();
      }, 100);
    }
  }, [messages.length]);

  // Helper to resolve relative background URLs
  const getFullBgUrl = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.2.66:4000/api';
      try {
        const urlObj = new URL(apiUrl);
        // Replace port 4000 with 3000 (Next.js frontend port)
        const frontendHost = `${urlObj.protocol}//${urlObj.hostname}:3000`;
        return `${frontendHost}${url}`;
      } catch {
        return `http://192.168.2.66:3000${url}`;
      }
    }
    return url;
  };

  // ── Zalo-style Header ─────────────────────────────────────────────────────
  const renderHeader = () => (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_BLUE} />

      <View style={styles.headerBar}>
        {/* Left: Back chevron */}
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerBackBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Center: Contact name */}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        </View>

        {/* Right: Phone, Video, Menu icons */}
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setIsSearchOpen(true)}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Ionicons name="search" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Thông báo', 'Tính năng gọi thoại đang phát triển')}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            <Ionicons name="call" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Thông báo', 'Tính năng gọi video đang phát triển')}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            {Icons.videocam(22, '#FFFFFF')}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const params: RootStackParamList['ChatSettings'] = {
                conversationId,
                title,
                originalName: (route.params as any).originalName,
                friendId: (route.params as any).userId,
              };
              navigation.navigate('ChatSettings', params);
            }}
            style={styles.headerIconBtn}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          >
            {Icons.menu(22, '#FFFFFF')}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}

      {/* Chat body with light grayish-blue background */}
      <KeyboardAvoidingView
        style={styles.chatBody}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {chatBgUrl ? (
          <ImageBackground source={{ uri: getFullBgUrl(chatBgUrl) || '' }} style={styles.chatContent} resizeMode="cover">
            <PinnedHeader
              pinnedMessages={pinnedMessages}
              currentUserId={currentUserId}
              isExpanded={isPinnedExpanded}
              onToggle={setIsPinnedExpanded}
              onUnpin={handleUnpinMessage}
              onNavigateToMessage={handleNavigateToMessage}
            />
            <View style={{ flex: 1 }} onTouchStart={handleChatTouch}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={keyExtractor}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={[
                  styles.messagesList,
                  { paddingBottom: bottomPadding + spacing.md },
                ]}
                onContentSizeChange={handleContentSizeChange}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View key="list-empty">
                    {isLoading ? (
                      <View style={styles.stateContainer}>
                        <Text style={styles.stateText}>Đang tải tin nhắn...</Text>
                      </View>
                    ) : (
                      <View style={styles.stateContainer}>
                        <Text style={styles.stateText}>Chưa có tin nhắn nào</Text>
                        <Text style={styles.stateSubtext}>Gửi lời chào đầu tiên!</Text>
                      </View>
                    )}
                  </View>
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
            </View>

            {/* Typing indicator — placed outside FlatList to appear above input (not at top of list) */}
            {typingLabel ? (
              <View style={styles.typingWrapper}>
                <TypingIndicator label={typingLabel} />
              </View>
            ) : null}
          </ImageBackground>
        ) : (
          <View style={styles.chatContent}>
            <PinnedHeader
              pinnedMessages={pinnedMessages}
              currentUserId={currentUserId}
              isExpanded={isPinnedExpanded}
              onToggle={setIsPinnedExpanded}
              onUnpin={handleUnpinMessage}
              onNavigateToMessage={handleNavigateToMessage}
            />
            <View style={{ flex: 1 }} onTouchStart={handleChatTouch}>
              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={keyExtractor}
                renderItem={renderMessage}
                inverted
                contentContainerStyle={[
                  styles.messagesList,
                  { paddingBottom: bottomPadding + spacing.md },
                ]}
                onContentSizeChange={handleContentSizeChange}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  <View key="list-empty">
                    {isLoading ? (
                      <View style={styles.stateContainer}>
                        <Text style={styles.stateText}>Đang tải tin nhắn...</Text>
                      </View>
                    ) : (
                      <View style={styles.stateContainer}>
                        <Text style={styles.stateText}>Chưa có tin nhắn nào</Text>
                        <Text style={styles.stateSubtext}>Gửi lời chào đầu tiên!</Text>
                      </View>
                    )}
                  </View>
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
            </View>

            {/* Typing indicator — placed outside FlatList to appear above input (not at top of list) */}
            {typingLabel ? (
              <View style={styles.typingWrapper}>
                <TypingIndicator label={typingLabel} />
              </View>
            ) : null}
          </View>
        )}

        {/* Footer / Chat Input */}
        <View style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}>
          <ChatInput
            value={inputText}
            onChangeText={onTextChange}
            onFocus={() => markAsReadRef.current()}
            onSend={handleSend}
            onCreatePoll={handleCreatePoll}
            onCreateReminder={() => navigation.navigate('CreateReminder', { conversationId, title })}
            onCreateNote={() => navigation.navigate('CreateNote', { conversationId, title })}
            replyingMessage={replyingMessage}
            onCancelReply={() => setReplyingMessage(null)}
            onJumpToReply={(messageId) => handleNavigateToMessage(String(messageId))}
            conversationId={conversationId}
            senderId={currentUserId || undefined}
            receiverId={route.params.userId}
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
                setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
              }
            }}
            onVoiceRecord={async (audioUri) => {
              // Upload voice file lên backend - giống web
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
                
                let actualReceiverId = route.params.userId;
                if (!actualReceiverId && conversationId?.startsWith('dm:')) {
                  const parts = conversationId.replace('dm:', '').split(':');
                  actualReceiverId = parts.find(id => String(id) !== String(currentUserId));
                }
                
                if (actualReceiverId) {
                  formData.append('receiver_id', String(actualReceiverId));
                }
                if (conversationId) {
                  formData.append('conversationId', conversationId);
                }

                const sentMsg = await messageApi.sendFileMessage(conversationId, formData);
                console.log('[ChatDetail] Voice message sent successfully');

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

                // Scroll xuống nếu ở cuối (offset 0 cho list inverted)
                if (isNearBottomRef.current) {
                  setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
                }
              } catch (err) {
                console.error('[ChatDetail] Error sending voice message:', err);
                Alert.alert('Lỗi', 'Không thể gửi tin nhắn thoại. Vui lòng thử lại.');
              }
            }}
          />
        </View>
      </KeyboardAvoidingView>

      {/* ── Context Menu (single Modal instance) ── */}
      <MessageContextMenu
        message={selectedMessage}
        visible={selectedMessage !== null}
        onClose={() => setSelectedMessage(null)}
        isOwn={selectedMessage?.isMe ?? false}
        isDeleting={deletingMessageId === String(selectedMessage?.id)}
        onReply={() => {
          if (selectedMessage) handleReplyToMessage(selectedMessage);
        }}
        onForward={() => {
          if (!selectedMessage) return;
          setSelectedMessage(null);
          setForwardMessageState({
            messageId: String(selectedMessage.id),
            content: selectedMessage.content,
          });
        }}
        onSave={() => {
          Alert.alert('Lưu', 'Tính năng đang phát triển');
        }}
        onRecall={() => {
          if (!selectedMessage) return;
          Alert.alert(
            'Thu hồi tin nhắn',
            'Bạn có chắc muốn thu hồi tin nhắn này?',
            [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Thu hồi',
                style: 'destructive',
                onPress: async () => {
                  const msgId = String(selectedMessage.id);
                  const originalContent = selectedMessage.content;
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
        }}
        onCopy={() => {
          if (selectedMessage) {
            const { Clipboard } = require('react-native');
            // fallback using Alert for Expo
            Alert.alert('Sao chép', selectedMessage.content);
          }
        }}
        onPin={() => {
          if (!selectedMessage) return;
          const isPinned = pinnedMessages.some((p: any) => String(p.id) === String(selectedMessage.id));
          const pinnedItem = pinnedMessages.find((p: any) => String(p.id) === String(selectedMessage.id));

          if (isPinned) {
            // Check permission to unpin
            if (pinnedItem && pinnedItem.pinnedBy && String(pinnedItem.pinnedBy) !== String(currentUserId)) {
              Alert.alert('Thông báo', 'Bạn chỉ có quyền xem tin nhắn này. Chỉ người ghim mới có thể bỏ ghim.');
              return;
            }

            Alert.alert(
              'Bỏ ghim tin nhắn',
              'Bạn có chắc muốn bỏ ghim tin nhắn này?',
              [
                { text: 'Hủy', style: 'cancel' },
                {
                  text: 'OK',
                  onPress: () => handleUnpinMessage(String(selectedMessage.id)),
                },
              ]
            );
          } else {
            handlePinMessage(selectedMessage as any);
          }
        }}
        onReminder={() => {
          Alert.alert('Nhắc hẹn', 'Tính năng đang phát triển');
        }}
        onSelectMultiple={() => {
          Alert.alert('Chọn nhiều', 'Tính năng đang phát triển');
        }}
        onQuickMessage={() => {
          Alert.alert('Tạo tin nhắn nhanh', 'Tính năng đang phát triển');
        }}
        onTranslate={() => {
          Alert.alert('Dịch', 'Tính năng đang phát triển');
        }}
        onReadText={() => {
          Alert.alert('Đọc văn bản', 'Tính năng đang phát triển');
        }}
        onDelete={() => {
          if (!selectedMessage) return;
          Alert.alert(
            'Xóa tin nhắn',
            'Bạn có chắc muốn xóa tin nhắn này? (Chỉ bạn thấy)',
            [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Xóa',
                style: 'destructive',
                onPress: async () => {
                  const msgId = String(selectedMessage.id);
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
                      updates: { isDeleted: false, content: selectedMessage.content },
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
        }}
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
            // Navigate to the other conversation
            navigation.replace('Chat', {
              conversationId: item.conversationId,
              title: item.senderDisplayName || 'Cuộc trò chuyện',
              focusedMessageId: String(item.id),
            });
          }
        }}
      />
      {/* ── Forward Modal ── */}
      <ForwardMessageModal
        isOpen={forwardMessageState !== null}
        onClose={() => setForwardMessageState(null)}
        messageId={forwardMessageState?.messageId ?? ''}
        messageContent={forwardMessageState?.content ?? ''}
        sourceConversationId={conversationId}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HEADER_BLUE,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  headerSafeArea: {
    backgroundColor: HEADER_BLUE,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing.sm,
  },
  headerBackBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },

  // ── Chat Body ──────────────────────────────────────────────────────────
  chatBody: {
    flex: 1,
    backgroundColor: CHAT_BG,
  },
  chatContent: {
    flex: 1,
  },
  messagesList: {
    paddingTop: spacing.sm,
    flexGrow: 1,
  },
  typingWrapper: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
  },
  stateText: {
    fontSize: 15,
    color: '#999',
    marginBottom: 4,
  },
  stateSubtext: {
    fontSize: 13,
    color: '#BBB',
  },

  // ── Input Footer ──────────────────────────────────────────────────────
  inputWrapper: {
    backgroundColor: colors.background.primary,
  },
});

export default ChatDetailScreen;
