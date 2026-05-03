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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shallowEqual } from 'react-redux';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useMessages, MessageItem } from '@features/chat/hooks/useMessages';
import { useTypingIndicator } from '@features/chat/hooks/useTypingIndicator';
import { MessageBubble, TypingIndicator, ChatInput, PinnedHeader, MessageContextMenu } from '@features/chat/components';
import { Icons, IconSize } from '@components/common';
import { socketActions } from '@api/socket';
import { messageApi, friendsApi } from '@api/endpoints';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { confirmPendingMessage, failPendingMessage, setMessageFailed, setMessageRevoked } from '@store/slices/chatSlice';
import { colors, spacing } from '@theme';
import type { RootStackScreenProps, RootStackParamList } from '@navigation/types';

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

  // Bottom padding — account for home indicator on iOS
  const bottomPadding = Platform.OS === 'ios'
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

  const handleNavigateToMessage = useCallback((messageId: string) => {
    const index = messagesRef.current.findIndex((m) => String(m.id) === String(messageId));
    if (index !== -1) {
      setFocusedMessageId(String(messageId));
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      setTimeout(() => setFocusedMessageId(null), 3000);
    } else {
      Alert.alert('Thông báo', 'Tin nhắn này hiện chưa được tải về, vui lòng cuộn lên để tìm lại');
    }
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isNearBottom, setIsNearBottom] = useState(true);
  const isNearBottomRef = useRef(true);
  const messagesRef = useRef<MessageItem[]>([]);
  const isInitializedRef = useRef(false);

  const handleNewMessage = useCallback(() => {
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

  const { typingLabel, handleTextChange } = useTypingIndicator({ conversationId });

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
    loadMessages();
    isInitializedRef.current = false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

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

        if (isNearBottomRef.current) {
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
        }
      } catch {
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
        onLongPress={(msg) => {
          setSelectedMessage(msg);
        }}
      />
    ),
    [title, focusedMessageId]
  );

  const keyExtractor = useCallback((item: MessageItem) => String(item.id), []);

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 100;
    const isNear = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
    isNearBottomRef.current = isNear;
    setIsNearBottom(isNear);
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!isInitializedRef.current && messages.length > 0) {
      isInitializedRef.current = true;
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages.length]);

  // ── Zalo-style Header ─────────────────────────────────────────────────────
  const renderHeader = () => (
    <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
      <StatusBar barStyle="light-content" backgroundColor={HEADER_BLUE} />

      <View style={styles.headerBar}>
        {/* Left: Back chevron */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
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
        <View style={styles.chatContent}>
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
              { paddingBottom: bottomPadding + spacing.md },
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

        {/* Footer / Chat Input */}
        <View style={[styles.inputWrapper, { paddingBottom: bottomPadding }]}>
          <ChatInput
            value={inputText}
            onChangeText={onTextChange}
            onSend={handleSend}
            conversationId={conversationId}
            senderId={currentUserId || undefined}
            receiverId={route.params.userId}
            onUploadSuccess={async (url, name, size) => {
              // FilePickerButton đã upload và tạo message qua backend rồi
              // Backend broadcast qua socket, nên không cần gọi lại API
              // Chỉ cần scroll xuống nếu ở cuối
              if (isNearBottomRef.current) {
                setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
        onReply={() => {
          Alert.alert('Trả lời', 'Tính năng đang phát triển');
        }}
        onForward={() => {
          Alert.alert('Chuyển tiếp', 'Tính năng đang phát triển');
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
                  dispatch(setMessageRevoked({ messageId: msgId, conversationId }));
                  try {
                    await messageApi.revokeMessage(msgId, conversationId);
                  } catch (err: any) {
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
          Alert.alert(
            pinnedMessages.some((p: any) => String(p.id) === String(selectedMessage.id))
              ? 'Bỏ ghim tin nhắn'
              : 'Ghim tin nhắn',
            '',
            [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'OK',
                onPress: () => {
                  if (pinnedMessages.some((p: any) => String(p.id) === String(selectedMessage.id))) {
                    handleUnpinMessage(String(selectedMessage.id));
                  } else {
                    handlePinMessage(selectedMessage as any);
                  }
                },
              },
            ]
          );
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
        onDetails={() => {
          if (!selectedMessage) return;
          Alert.alert(
            'Chi tiết tin nhắn',
            `Nội dung: ${selectedMessage.content}\nLoại: ${selectedMessage.type}\nNgười gửi: ${selectedMessage.senderName || 'Bạn'}`
          );
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
                onPress: () => {
                  Alert.alert('Thành công', 'Tin nhắn đã được xóa');
                },
              },
            ]
          );
        }}
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
