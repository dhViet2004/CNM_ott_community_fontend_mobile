import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Text, RefreshControl, Keyboard, StatusBar, ImageBackground, TouchableOpacity } from 'react-native';
import { shallowEqual } from 'react-redux';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useMessages, MessageItem } from '@features/chat/hooks/useMessages';
import { useTypingIndicator } from '@features/chat/hooks/useTypingIndicator';
import { MessageBubble, TypingIndicator, ChatInput, PinnedHeader } from '@features/chat/components';
import { Icons, IconSize } from '@components/common';
import { socketActions } from '@api/socket';
import { messageApi, friendsApi } from '@api/endpoints';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { confirmPendingMessage, failPendingMessage, setMessageFailed } from '@store/slices/chatSlice';
import { colors, spacing, typography } from '@theme';
import { Alert } from 'react-native';
import type { RootStackScreenProps, RootStackParamList } from '@navigation/types';

type Props = RootStackScreenProps<'Chat'>;
const EMPTY_ARRAY: any[] = [];

const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, title } = route.params;
  const focusedMessageIdFromParams = (route.params as any).focusedMessageId;
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  
  const pinnedMessages = useAppSelector((state) => state.chat.pinnedMessages[conversationId] || EMPTY_ARRAY, shallowEqual);
  const friends = useAppSelector((state) => state.chat.friends, shallowEqual);
  const [chatBgUrl, setChatBgUrl] = useState<string | null>(null);

  useEffect(() => {
    const friend = friends.find(f => (f.friend_id || f.userId) === route.params.userId);
    const fId = friend?.friendshipId;
    
    if (fId) {
      friendsApi.getChatBackground(fId).then(res => {
        setChatBgUrl(res.chatBgUrl);
      }).catch(console.error);

      // Listen for real-time background updates
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

  const handleNavigateToMessage = useCallback((messageId: string) => {
    const index = messagesRef.current.findIndex(m => String(m.id) === String(messageId));
    if (index !== -1) {
      setFocusedMessageId(String(messageId));
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });

      setTimeout(() => {
        setFocusedMessageId(null);
      }, 3000);
    } else {
      // Nếu không tìm thấy, thử cuộn tới vị trí gần đúng hoặc thông báo
      console.warn(`Message ${messageId} not found in current list of ${messagesRef.current.length} messages`);
      Alert.alert('Thông báo', 'Tin nhắn này hiện chưa được tải về, vui lòng cuộn lên để tìm lại');
    }
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState('');

  // Track if user is near bottom (within 100px)
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isNearBottomRef = useRef(true);
  const messagesRef = useRef<MessageItem[]>([]);

  // Track initial load state
  const isInitializedRef = useRef(false);

  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth?.user?.userId);
  const currentUser = useAppSelector((state) => state.auth?.user);

  // Bottom padding cho input - đảm bảo không bị che bởi navigation bar
  const bottomPadding = Platform.OS === 'ios'
    ? insets.bottom
    : Math.max(insets.bottom, spacing.md);

  // Top padding - đảm bảo không bị che bởi status bar hoặc notch
  const topPadding = Platform.OS === 'android' ? 0 : Math.max(insets.top, spacing.sm);

  const handleNewMessage = useCallback(() => {
    // Chỉ auto-scroll nếu user đang ở gần cuối
    if (isNearBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, []);

  const { messages, isLoading, loadMessages, addOptimisticMessage } = useMessages({
    conversationId,
    autoLoad: false,
    onNewMessage: handleNewMessage,
  });

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const { typingLabel, handleTextChange } = useTypingIndicator({
    conversationId,
  });

  // Keyboard show - scroll to bottom if near bottom
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      if (isNearBottomRef.current) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    });
    return () => showSub.remove();
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadMessages();
    setIsRefreshing(false);
  }, [loadMessages]);

  useEffect(() => {
    // Load messages khi conversationId thay đổi
    // useMessages (autoLoad: false) đã join room qua socketActions.joinConversation bên trong
    loadMessages();
    isInitializedRef.current = false;

    // Không gọi lại socketActions.joinConversation đ ở đây vì useMessages hook đã gọi rồi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (focusedMessageIdFromParams && messages.length > 0) {
      const index = messages.findIndex(m => String(m.id) === String(focusedMessageIdFromParams));
      if (index !== -1) {
        setFocusedMessageId(String(focusedMessageIdFromParams));
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }, 500);

        // Clear highlight after 3 seconds
        const timer = setTimeout(() => {
          setFocusedMessageId(null);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [focusedMessageIdFromParams, messages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setInputText('');
      Keyboard.dismiss();
      socketActions.sendStopTyping(conversationId);

      const tempId = addOptimisticMessage({
        conversationId,
        senderId: currentUserId || '',
        senderName: currentUser?.display_name,
        senderAvatar: currentUser?.avatar_url ?? null,
        content: text,
        type: 'text',
        file_url: null,
      });

      try {
        const result = await messageApi.sendMessage(conversationId, text, currentUserId || '');
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
        }));

        // Auto-scroll khi gửi tin nhắn thành công
        if (isNearBottomRef.current) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        }
      } catch (err) {
        dispatch(failPendingMessage(tempId));
        dispatch(setMessageFailed({ conversationId, messageId: tempId }));
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      }
    },
    [conversationId, currentUserId, currentUser, dispatch, addOptimisticMessage]
  );

  const onTextChange = useCallback(
    (text: string) => {
      setInputText(text);
      handleTextChange(text);
    },
    [handleTextChange]
  );

  const renderMessage = useCallback(
    ({ item }: { item: MessageItem }) => (
      <MessageBubble
        id={item.id}
        senderId={item.senderId}
        senderName={item.senderName}
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
        onLongPress={() => {
          Alert.alert(
            'Tùy chọn tin nhắn',
            '',
            [
              { text: 'Trả lời', onPress: () => {} },
              { text: 'Chuyển tiếp', onPress: () => {} },
              { 
                text: pinnedMessages.some((p: any) => String(p.id) === String(item.id)) ? 'Bỏ ghim' : 'Ghim tin nhắn', 
                onPress: () => {
                  if (pinnedMessages.some((p: any) => String(p.id) === String(item.id))) {
                    handleUnpinMessage(String(item.id));
                  } else {
                    handlePinMessage(item);
                  }
                } 
              },
              { text: 'Thu hồi', onPress: () => {}, style: 'destructive' },
              { text: 'Xóa', onPress: () => {}, style: 'destructive' },
              { text: 'Hủy', style: 'cancel' },
            ]
          );
        }}
      />
    ),
    [title, focusedMessageId, pinnedMessages, handleUnpinMessage, handlePinMessage]
  );

  const keyExtractor = useCallback((item: MessageItem) => String(item.id), []);

  // Handle scroll to detect if user is near bottom
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    const isNear = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

    isNearBottomRef.current = isNear;
    setIsNearBottom(isNear);
  }, []);

  // Initial scroll to bottom after messages load
  const handleContentSizeChange = useCallback(() => {
    if (!isInitializedRef.current && messages.length > 0) {
      isInitializedRef.current = true;
      // Small delay to ensure content is rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages.length]);

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
              onPress={() => Alert.alert('Thông báo', 'Tính năng gọi video đang phát triển')}
              style={styles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {Icons.videocam(IconSize.lg, colors.text.inverse)}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const params: RootStackParamList['MessageSearch'] = {
                  conversationId,
                  title,
                };
                navigation.navigate('MessageSearch', params);
              }}
              style={styles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {Icons.search(IconSize.lg, colors.text.inverse)}
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
              style={styles.headerIcon}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {Icons.menu(IconSize.lg, colors.text.inverse)}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ImageBackground
        source={chatBgUrl ? { uri: chatBgUrl } : undefined}
        style={styles.backgroundImage}
        imageStyle={{ opacity: 0.8 }}
      >
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
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderMessage}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: bottomPadding + spacing.md }
            ]}
            onContentSizeChange={handleContentSizeChange}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onTouchStart={() => Keyboard.dismiss()}
            ListHeaderComponent={
              typingLabel ? (
                <View style={styles.typingWrapper}>
                  <TypingIndicator label={typingLabel} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View key="list-empty">
                {isLoading ? (
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
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />

          <View style={[
            styles.inputWrapper,
            { paddingBottom: bottomPadding }
          ]}>
            <ChatInput
              value={inputText}
              onChangeText={onTextChange}
              onSend={handleSend}
            />
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.chatBg,
  },
  customHeader: {
    backgroundColor: colors.primary,
  },
  headerContent: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
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
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  typingWrapper: {
    paddingVertical: spacing.xs,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  inputWrapper: {
    backgroundColor: colors.background.primary,
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
});

export default ChatDetailScreen;
