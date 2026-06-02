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
import * as Location from 'expo-location';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { store } from '@store/store';
import {
  setMessages,
  addMessage,
  setActiveConversation,
  setLoadingMessages,
  confirmPendingMessage,
  failPendingMessage,
  setMessageRevoked,
  updateMessage,
  deleteMessage,
  addDeletedForMeId,
} from '@store/slices/chatSlice';
import type { Message, ReplyToMessage } from '@store/slices/chatSlice';
import { setGroupMembers } from '@store/slices/groupsSlice';
import { messageApi, channelApi, callApi, botApi } from '@api/endpoints';
import { socketActions } from '@api/socket';
import { setGroupCallCredentials, setGroupStatus } from '@store/slices/groupCallSlice';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import MessageBubble from '@features/chat/components/MessageBubble';
import PinnedHeader from '@features/chat/components/PinnedHeader';
import MessageSearchPanel from '@features/chat/components/MessageSearchPanel';
import { MessageContextMenu, ChatInput, ForwardMessageModal } from '@features/chat/components';
import type { RootStackScreenProps, RootStackParamList } from '@navigation/types';
import type { PollData } from '@/types';
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
const BOT_PROMPT_REGEX = /^@(Trợ lý AI|BotAI|Bot)(?=\s|$|[,.!?:;-])[\s,:-]*(.+)$/iu;

const GroupChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, title } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const conversationId = String(groupId);
  const pinnedMessages = useAppSelector((state) => state.chat.pinnedMessages[conversationId] || EMPTY_ARRAY);

  useEffect(() => {
    dispatch(setActiveConversation(conversationId));
    return () => {
      dispatch(setActiveConversation(null));
    };
  }, [conversationId, dispatch]);

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

  // Bottom padding cho input
  const bottomPadding = Platform.OS === 'ios'
    ? insets.bottom
    : Math.max(insets.bottom, spacing.md);

  // ✅ FIX: Đọc messages trực tiếp từ Redux store
  const messages = useAppSelector(
    (state) => state.chat.messages[conversationId] ?? EMPTY_MESSAGES
  );

  // Dedup: hide group_call_active (ended) when call_log exists for same callId
  // This prevents duplicate "Cuộc gọi nhóm đã kết thúc" bubbles
  const filteredMessages = React.useMemo(() => {
    if (!messages || messages.length === 0) return messages;
    
    // Build set of callIds that have a call_log (group)
    const endedCallIds = new Set<string>();
    for (const m of messages) {
      if (
        (m.type === 'call_log' || (m as any).contentType === 'call_log') &&
        ((m as any).callData?.callMode === 'group' || (m as any).callData?.callMode === undefined) &&
        (m as any).callData?.callId
      ) {
        endedCallIds.add(String((m as any).callData.callId));
      }
    }
    
    if (endedCallIds.size === 0) return messages;
    
    // Filter out group_call_active whose callId has a call_log
    return messages.filter((m) => {
      if ((m as any).contentType === 'group_call_active' && (m as any).callData?.callId) {
        return !endedCallIds.has(String((m as any).callData.callId));
      }
      return true;
    });
  }, [messages]);

  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
  const currentUser = useAppSelector((state) => state.auth.user);
  const isLoadingMessages = useAppSelector((state) => state.chat.isLoadingMessages);

  const [inputText, setInputText] = useState('');
  const [replyingMessage, setReplyingMessage] = useState<ReplyToMessage | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [defaultChannelId, setDefaultChannelId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<SelectedMessage>(null);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [forwardMessageState, setForwardMessageState] = useState<{
    messageId: string;
    content: string;
  } | null>(null);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(false);
  const selectedMessageRef = useRef<SelectedMessage>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleStartGroupCall = useCallback(async (callType: 'audio' | 'video') => {
    console.log('[mobile:startGroupCall]', { groupId, conversationId, callType });
    try {
      try {
        const activeCallResponse = await callApi.getActiveCall();
        const activeCall = (activeCallResponse as any)?.call;
        if (
          activeCall &&
          activeCall.callMode === 'group' &&
          String(activeCall.conversationId) === String(conversationId)
        ) {
          console.log('[mobile:startGroupCall] found existing group call, rejoining', {
            callId: activeCall.callId,
            conversationId: activeCall.conversationId,
          });
          await rejoinGroupCall(activeCall.callId, conversationId, 'video');
          return;
        }
      } catch (precheckErr: any) {
        console.warn(
          '[mobile:startGroupCall] active-call precheck failed, continuing fresh start',
          precheckErr?.response?.data || precheckErr?.message,
        );
      }

      const result = await callApi.startGroupCall(conversationId, callType);
      console.log('[mobile:startGroupCall] success', {
        sessionId: result.sessionId,
        channelName: result.channelName,
        agoraUid: result.agoraUid,
      });

      dispatch(setGroupCallCredentials({
        channelName: result.channelName,
        uid: result.agoraUid,
        callId: result.sessionId,
        sessionId: result.sessionId,
        groupId: groupId,
        groupName: title,
        callType,
        token: result.token,
        isHost: true,
      }));
      dispatch(setGroupStatus('joining'));










    } catch (err: any) {
      console.error('[mobile:startGroupCall] error', err?.response?.data || err?.message);
      const msg = err?.response?.data?.message || err?.message || 'Không thể bắt đầu cuộc gọi nhóm';
      Alert.alert('Lỗi', msg);
    }
  }, [groupId, conversationId, title, dispatch, navigation]);

  const rejoinGroupCall = useCallback(async (
    sessionId: string,
    conversationId: string,
    callType: 'audio' | 'video' = 'video',
  ) => {
    try {
      console.log('[mobile:rejoinGroupCall] joining existing call', { sessionId });
      const result = await socketActions.joinGroupCall(sessionId);

      if (!result.ok) {
        Alert.alert('Lỗi', result.error || 'Không thể tham gia cuộc gọi');
        return;
      }

      dispatch(setGroupCallCredentials({
        channelName: result.channelName!,
        uid: result.uid!,
        callId: sessionId,
        sessionId: sessionId,
        groupId: conversationId,
        callType,
        isHost: false,
      }));
      dispatch(setGroupStatus('joining'));

      navigation.navigate('GroupCall', {
        callId: sessionId,
        channelName: result.channelName!,
        token: result.token!,
        uid: result.uid!,
        callType,
        groupId: conversationId,
        groupName: title,
        mode: 'rejoin',
      });
    } catch (err: any) {
      console.error('[mobile:rejoinGroupCall] error', err?.message);
      Alert.alert('Lỗi', err?.message || 'Không thể tham gia lại cuộc gọi');
    }
  }, [dispatch, navigation, title]);
  const extractBotPrompt = useCallback((text: string) => {
    const trimmed = String(text || '').trim();
    const match = trimmed.match(BOT_PROMPT_REGEX);
    return match ? String(match[2] || '').trim() : '';
  }, []);

  const requestBotReply = useCallback(
    async (prompt: string) => {
      if (!currentUserId || !prompt) return;

      try {
        const result = await botApi.chat({
          userId: String(currentUserId),
          message: prompt,
          conversationId,
        });

        const reminderMessage = result.toolCalls
          ?.find((toolCall) => toolCall?.tool === 'createReminder' && toolCall?.ok && toolCall?.message)
          ?.message;

        if (reminderMessage) {
          const reminderMessageId = String(reminderMessage.id ?? reminderMessage.messageId ?? '');
          if (!reminderMessageId) return;

          dispatch(addMessage({
            id: reminderMessageId,
            conversationId: reminderMessage.conversationId || conversationId,
            senderId: String(reminderMessage.senderId || currentUserId),
            senderName:
              reminderMessage.senderDisplayName ||
              reminderMessage.sender_name ||
              currentUser?.display_name ||
              currentUser?.username ||
              'Bạn',
            sender_name:
              reminderMessage.senderDisplayName ||
              reminderMessage.sender_name ||
              currentUser?.display_name ||
              currentUser?.username ||
              'Bạn',
            sender_avatar:
              reminderMessage.senderAvatarUrl ??
              reminderMessage.sender_avatar ??
              currentUser?.avatar_url ??
              null,
            type: (reminderMessage.contentType ?? reminderMessage.type ?? 'reminder') as Message['type'],
            content: reminderMessage.content || '',
            timestamp: reminderMessage.createdAt || reminderMessage.created_at || new Date().toISOString(),
            createdAt: reminderMessage.createdAt || reminderMessage.created_at,
            status: 'sent',
          }));
        }
      } catch (err) {
        console.error('[GroupChat] BotAI request failed:', err);
      }
    },
    [conversationId, currentUser, currentUserId, dispatch]
  );

  const handleSendLocation = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Quyền vị trí', 'Bạn cần cấp quyền vị trí để gửi vị trí hiện tại.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const latitude = currentLocation.coords.latitude;
      const longitude = currentLocation.coords.longitude;
      const label = `📍 ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

      const result: any = await messageApi.sendLocation(
        conversationId,
        { lat: latitude, lng: longitude, label },
        replyingMessage?.id ?? null,
      );

      dispatch(addMessage({
        id: String(result.id ?? result.messageId ?? Date.now()),
        conversationId: result.conversationId || conversationId,
        senderId: String(result.senderId || currentUserId || ''),
        senderName: currentUser?.display_name || currentUser?.username || 'Bạn',
        sender_name: currentUser?.display_name || currentUser?.username || 'Bạn',
        sender_avatar: currentUser?.avatar_url || (currentUser as any)?.avatar || null,
        type: (result.contentType || 'location') as any,
        content: result.content || label,
        file_url: null,
        locationData: result.locationData ?? { lat: latitude, lng: longitude, label },
        timestamp: result.createdAt || result.created_at || new Date().toISOString(),
        createdAt: result.createdAt || result.created_at,
        status: 'sent',
        replyTo: result.replyTo ?? replyingMessage?.id ?? null,
        replyToMessage: result.replyToMessage ?? replyingMessage ?? null,
      }));

      setReplyingMessage(null);

      if (isNearBottomRef.current) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Không thể gửi vị trí hiện tại. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    }
  }, [conversationId, currentUser, currentUserId, dispatch, replyingMessage]);

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
          pollData: m.pollData ?? null,
          locationData: m.locationData ?? null,
          timestamp: m.createdAt ?? m.created_at ?? new Date().toISOString(),
          createdAt: m.createdAt ?? m.created_at,
          type: (m.contentType ?? m.type ?? 'text') as Message['type'],
          file_url: m.file_url ?? m.attachments?.[0]?.url ?? null,
          status: 'sent' as const,
          isRevoked: m.contentType === 'revoked' || m.is_revoked || m.isRevoked || false,
          is_revoked: m.contentType === 'revoked' || m.is_revoked || m.isRevoked || false,
          isDeleted: m.isDeleted || false,
          replyTo: m.replyTo ?? null,
          replyToMessage: m.replyToMessage ?? null,
          callData: m.callData ?? null,
          contentType: m.contentType ?? null,
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
    const botPrompt = extractBotPrompt(text);
    const replySnapshot = replyingMessage;
    setInputText('');
    setReplyingMessage(null);
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
      replyTo: replySnapshot?.id ?? null,
      replyToMessage: replySnapshot,
    };
    dispatch(addMessage(optimisticMsg));

    // Chỉ auto-scroll nếu user đang ở gần cuối
    if (isNearBottomRef.current) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }

    try {
      const result = await messageApi.sendMessage(conversationId, text, currentUserId || '', 'text', replySnapshot?.id ?? null);
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
          replyTo: result.replyTo ?? replySnapshot?.id ?? null,
          replyToMessage: result.replyToMessage ?? replySnapshot ?? null,
        })
      );

      if (botPrompt) {
        requestBotReply(botPrompt);
      }
    } catch {
      dispatch(failPendingMessage(tempId));
    }
  };

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
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      } catch (err) {
        console.error('[GroupChat] Error creating poll:', err);
        Alert.alert('Lỗi', 'Không thể tạo bình chọn. Vui lòng thử lại.');
        throw err;
      }
    },
    [conversationId, currentUserId, currentUser, dispatch]
  );


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

  const handleReplyToMessage = useCallback(() => {
    const msg = selectedMessageRef.current;
    if (!msg) return;
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
    ({ item, index }: { item: Message, index: number }) => {
      const isMe = String(item.senderId) === String(currentUserId);
      const time = new Date(item.createdAt ?? item.timestamp ?? Date.now()).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const senderName = item.senderName || item.sender_name || 'Unknown';
      const senderAvatar = item.senderAvatar || item.sender_avatar || null;
      const messageType = item.type;
      const isFocused = (route.params as any).focusedMessageId === String(item.id);

      const prevMessage = index > 0 ? filteredMessages[index - 1] : null;
      const showAvatarAndName = !prevMessage || String((prevMessage as any).senderId) !== String(item.senderId) || prevMessage.type === 'system';

      return (
        <MessageBubble
          id={item.id}
          conversationId={conversationId}
          senderId={item.senderId}
          senderName={senderName}
          senderAvatar={senderAvatar}
          content={item.content}
          time={time}
          isMe={isMe}
          type={messageType}
          file_url={item.file_url}
          locationData={item.locationData}
          status={item.status}
          isDeleted={item.isDeleted}
          isRevoked={item.isRevoked}
          defaultName={title}
          isFocused={isFocused}
          replyToMessage={item.replyToMessage}
          pollData={item.pollData}
          currentUserId={currentUserId}
          showAvatar={showAvatarAndName}
          showName={showAvatarAndName}
          onCall={(type) => handleStartGroupCall(type)}
          onJumpToMessage={(messageId) => handleNavigateToMessage(String(messageId))}
          onLongPress={setSelectedMessage}
          readBy={item.readBy}
        />
      );
    },
    [title, currentUserId, route.params, handleNavigateToMessage, filteredMessages]
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
              onPress={() => handleStartGroupCall('video')}
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
          isExpanded={isPinnedExpanded}
          onToggle={setIsPinnedExpanded}
          onUnpin={handleUnpinMessage}
          onNavigateToMessage={handleNavigateToMessage}
        />
        <FlatList
          ref={flatListRef}
          data={filteredMessages as Message[]}
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
            onCreatePoll={handleCreatePoll}
            onCreateReminder={() => navigation.navigate('CreateReminder', { conversationId, title })}
            onCreateNote={() => navigation.navigate('CreateNote', { conversationId, title })}
            onSendLocation={handleSendLocation}
            replyingMessage={replyingMessage}
            onCancelReply={() => setReplyingMessage(null)}
            onJumpToReply={(messageId) => handleNavigateToMessage(String(messageId))}
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
        onReply={handleReplyToMessage}
        onForward={() => {
          const msg = selectedMessageRef.current;
          if (!msg) return;
          setSelectedMessage(null);
          setForwardMessageState({
            messageId: String(msg.id),
            content: msg.content,
          });
        }}
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
