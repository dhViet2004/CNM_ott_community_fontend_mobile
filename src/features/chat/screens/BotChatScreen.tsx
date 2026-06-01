import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { botApi } from '@api/endpoints';
import { useAppSelector } from '@store/hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'BotChat'>;

const HEADER_BLUE = '#008AF3';
const CHAT_BG = '#F4F6F8';
const AI_GLOBAL_CONVERSATION_PREFIX = 'ai-global:';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const BotChatScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const currentUserId = useAppSelector((state) => state.auth?.user?.userId);
  const aiConversationId = currentUserId
    ? `${AI_GLOBAL_CONVERSATION_PREFIX}${currentUserId}`
    : undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  // Load history from AsyncStorage
  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUserId) return;
      try {
        const stored = await AsyncStorage.getItem(`bot_chat_history_${currentUserId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          const formatted = parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
          setMessages(formatted);
        }
      } catch (err) {
        console.error('Failed to load bot chat history', err);
      } finally {
        setIsHistoryLoaded(true);
      }
    };
    loadHistory();
  }, [currentUserId]);

  // Save history to AsyncStorage
  useEffect(() => {
    if (!isHistoryLoaded || !currentUserId) return;
    const saveHistory = async () => {
      try {
        // Only save the last 50 messages to avoid blowing up storage
        const messagesToSave = messages.slice(0, 50);
        await AsyncStorage.setItem(
          `bot_chat_history_${currentUserId}`,
          JSON.stringify(messagesToSave)
        );
      } catch (err) {
        console.error('Failed to save bot chat history', err);
      }
    };
    saveHistory();
  }, [messages, isHistoryLoaded, currentUserId]);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    if (!currentUserId) {
      setError('Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    // Clear input and dismiss keyboard
    setInputText('');
    Keyboard.dismiss();
    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [userMessage, ...prev]);

    try {
      setIsLoading(true);

      // Call bot API
      const response = await botApi.chat({
        userId: String(currentUserId),
        message: text,
        conversationId: aiConversationId,
      });

      // Add bot response
      const botMessage: ChatMessage = {
        id: `${Date.now()}-bot`,
        role: 'assistant',
        content:
          response.reply ||
          response.content ||
          'Xin lỗi, tôi chưa có phản hồi.',
        timestamp: new Date(),
      };
      setMessages((prev) => [botMessage, ...prev]);
    } catch (err: any) {
      console.error('[BotChat] Error:', err);
      const errorMessage =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể kết nối AI Bot. Vui lòng thử lại.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [aiConversationId, currentUserId, inputText, isLoading]);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isUser = item.role === 'user';

      return (
        <View
          style={[
            styles.messageRow,
            isUser ? styles.messageRowUser : styles.messageRowBot,
          ]}
        >
          {/* Bot avatar for bot messages */}
          {!isUser && (
            <View style={styles.botAvatar}>
              <Ionicons name="sparkles" size={16} color={colors.primary} />
            </View>
          )}

          {/* Message bubble */}
          <View
            style={[
              styles.messageBubble,
              isUser ? styles.messageBubbleUser : styles.messageBubbleBot,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isUser ? styles.messageTextUser : styles.messageTextBot,
              ]}
            >
              {item.content}
            </Text>
            <Text
              style={[
                styles.messageTime,
                isUser ? styles.messageTimeUser : styles.messageTimeBot,
              ]}
            >
              {formatTime(item.timestamp)}
            </Text>
          </View>

          {/* User avatar placeholder for user messages */}
          {isUser && (
            <View style={styles.userAvatar}>
              <Ionicons name="person" size={16} color={colors.text.inverse} />
            </View>
          )}
        </View>
      );
    },
    []
  );

  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <View style={styles.emptyIconInner}>
          <Ionicons name="sparkles" size={32} color={colors.primary} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>BotAI</Text>
      <Text style={styles.emptySubtitle}>
        Bắt đầu cuộc trò chuyện với AI
      </Text>
      <Text style={styles.emptyHint}>
        Bạn có thể hỏi bất cứ điều gì về ứng dụng này
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <StatusBar barStyle="light-content" backgroundColor={HEADER_BLUE} />
        <View style={styles.headerBar}>
          {/* Back button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerBackBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Title */}
          <View style={styles.headerCenter}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              <Text style={styles.headerTitle}> BotAI</Text>
            </View>
          </View>

          {/* Placeholder for balance */}
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      {/* Chat body */}
      <KeyboardAvoidingView
        style={styles.chatBody}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessage}
          inverted
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.messagesListEmpty,
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={renderEmpty}
        />

        {/* Error message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close-circle" size={18} color={colors.status.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input area */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom || spacing.md }]}>
          <View style={styles.inputBar}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Nhập câu hỏi cho AI..."
              placeholderTextColor={colors.text.placeholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isLoading}
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              activeOpacity={0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Ionicons name="send" size={18} color={colors.text.inverse} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: HEADER_BLUE,
  },

  // Header
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
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerRight: {
    width: 40,
  },

  // Chat body
  chatBody: {
    flex: 1,
    backgroundColor: CHAT_BG,
  },
  messagesList: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  messagesListEmpty: {
    flexGrow: 1,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    transform: [{ scaleY: -1 }],
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyIconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 138, 243, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 20,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
  },

  // Message row
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },

  // Avatars
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 138, 243, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },

  // Message bubble
  messageBubble: {
    maxWidth: '75%',
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageBubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  messageBubbleBot: {
    backgroundColor: colors.background.chatBubbleOther,
    borderBottomLeftRadius: 4,
  },

  // Message text
  messageText: {
    ...typography.body,
    fontSize: 15,
  },
  messageTextUser: {
    color: colors.text.inverse,
  },
  messageTextBot: {
    color: colors.text.primary,
  },

  // Message time
  messageTime: {
    ...typography.caption,
    fontSize: 10,
    marginTop: 3,
  },
  messageTimeUser: {
    color: 'rgba(255, 255, 255, 0.65)',
    textAlign: 'right',
  },
  messageTimeBot: {
    color: colors.text.tertiary,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.status.error,
    flex: 1,
  },

  // Input
  inputContainer: {
    backgroundColor: colors.background.primary,
    paddingTop: spacing.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    fontSize: 15,
    color: colors.text.primary,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});

export default BotChatScreen;
