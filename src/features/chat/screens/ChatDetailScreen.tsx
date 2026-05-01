import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Text, RefreshControl, Keyboard, StatusBar } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useMessages, MessageItem } from '@features/chat/hooks/useMessages';
import { useTypingIndicator } from '@features/chat/hooks/useTypingIndicator';
import { MessageBubble, TypingIndicator, ChatInput } from '@features/chat/components';
import { socketActions } from '@api/socket';
import { messageApi } from '@api/endpoints';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { confirmPendingMessage, failPendingMessage, setMessageFailed } from '@store/slices/chatSlice';
import { colors, spacing, typography } from '@theme';
import { Alert } from 'react-native';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'Chat'>;

const ChatDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, title } = route.params;
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState('');

  // Track if user is near bottom (within 100px)
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isNearBottomRef = useRef(true);

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
        onLongPress={() => {}}
      />
    ),
    [title]
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages list */}
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

        {/* Input area - đảm bảo không bị che */}
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
