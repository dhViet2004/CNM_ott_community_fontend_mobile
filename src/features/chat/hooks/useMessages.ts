import { useEffect, useCallback, useRef, useMemo } from 'react';
import { shallowEqual } from 'react-redux';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setMessages, setLoadingMessages, addMessage } from '@store/slices/chatSlice';
import { messageApi } from '@api/endpoints';
import { socketActions } from '@api/socket';

interface MessageItem {
  id: string | number;
  conversationId: string;
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
  readBy?: Array<{
    userId: string;
    readerName?: string;
    readerAvatar?: string | null;
    readAt?: string;
  }>;
}

interface UseMessagesOptions {
  conversationId: string;
  autoLoad?: boolean;
}

interface UseMessagesReturn {
  messages: MessageItem[];
  isLoading: boolean;
  loadMessages: () => Promise<void>;
  addOptimisticMessage: (message: Omit<MessageItem, 'id' | 'time' | 'isMe' | 'status'>) => string;
}

const EMPTY_ARRAY: any[] = [];

export const useMessages = ({
  conversationId,
  autoLoad = true,
}: UseMessagesOptions): UseMessagesReturn => {
  const dispatch = useAppDispatch();
  const tempIdCounter = useRef(0);

  // Memoized selectors
  const currentUserId = useAppSelector((state) => state.auth?.user?.userId);
  const rawMessages = useAppSelector(
    (state) => state.chat?.messages?.[conversationId] || EMPTY_ARRAY,
    shallowEqual
  );
  const isLoading = useAppSelector(
    (state) => state.chat?.isLoadingMessages ?? false
  );

  // Map messages - chỉ chạy khi rawMessages thay đổi
  // .reverse() đưa tin nhắn mới nhất về index 0 — phù hợp với inverted={true} của FlatList
  const messages: MessageItem[] = useMemo(() => {
    return [...rawMessages].reverse().map((m: any) => {
      const isMe = String(m.senderId) === String(currentUserId);
      return {
        id: String(m.id ?? m.messageId ?? ''),
        conversationId: m.conversationId || conversationId,
        senderId: String(m.senderId),
        // Backend getMessagesForConversation trả về senderDisplayName + senderAvatarUrl
        // Còn socket/addMessage lưu sender_name + sender_avatar
        // Cần handle cả hai trường hợp
        senderName: m.senderDisplayName || m.sender_name || m.senderName || undefined,
        senderAvatar: m.senderAvatarUrl ?? m.sender_avatar ?? m.senderAvatar ?? null,
        content: m.content ?? '',
        time: new Date(m.createdAt ?? m.created_at ?? m.timestamp ?? Date.now()).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isMe,
        type: (m.contentType ?? m.type ?? 'text') as MessageItem['type'],
        file_url: m.file_url ?? m.attachments?.[0]?.url ?? null,
        status: m.status || 'sent',
        isDeleted: m.is_revoked || m.isDeleted,
        isRevoked: m.is_revoked || m.isRevoked,
        readBy: m.readBy,
      };
    });
  }, [rawMessages, currentUserId, conversationId]);

  // Socket listener for receive_message is handled globally in socket.ts
  // (socket.ts dispatches addMessage directly). This hook only needs to load messages.

  // Join conversation room
  useEffect(() => {
    socketActions.joinConversation(conversationId);
    console.log('[useMessages] Joined conversation:', conversationId);

    return () => {
      socketActions.leaveConversation(conversationId);
    };
  }, [conversationId]);

  // Load messages from API
  const loadMessages = useCallback(async () => {
    dispatch(setLoadingMessages(true));
    try {
      const result = await messageApi.getConversationMessages(conversationId);
      const mapped = result.messages.map((m: any) => ({
        id: String(m.id ?? m.messageId ?? ''),
        conversationId: m.conversationId || conversationId,
        senderId: String(m.senderId),
        // Backend getMessagesForConversation trả về senderDisplayName + senderAvatarUrl (đã enrich)
        // Lưu cả 2 field để useMemo mapping bên trên có thể đọc được
        sender_name: m.senderDisplayName || m.sender_name || undefined,
        senderDisplayName: m.senderDisplayName || undefined,
        sender_avatar: m.senderAvatarUrl ?? m.sender_avatar ?? null,
        senderAvatarUrl: m.senderAvatarUrl ?? null,
        type: (m.contentType ?? m.type ?? 'text') as any,
        content: m.content ?? '',
        // Lấy file_url từ attachments nếu không có field trực tiếp
        file_url: m.file_url ?? m.attachments?.[0]?.url ?? null,
        file_name: m.file_name ?? null,
        file_size: m.file_size ?? null,
        timestamp: m.createdAt ?? m.created_at ?? new Date().toISOString(),
        createdAt: m.createdAt ?? m.created_at ?? new Date().toISOString(),
        status: 'sent' as const,
        is_revoked: m.contentType === 'revoked' || (m.isRevoked ?? false),
      }));
      dispatch(setMessages({ conversationId, messages: mapped }));
      console.log('[useMessages] Loaded', mapped.length, 'messages for', conversationId);
    } catch (err) {
      console.error('[useMessages] Load failed:', err);
    } finally {
      dispatch(setLoadingMessages(false));
    }
  }, [conversationId, dispatch]);

  useEffect(() => {
    if (autoLoad) {
      loadMessages();
    }
  }, [autoLoad, loadMessages]);

  const addOptimisticMessage = useCallback(
    (message: Omit<MessageItem, 'id' | 'time' | 'isMe' | 'status'>): string => {
      tempIdCounter.current += 1;
      const tempId = `temp_${Date.now()}_${tempIdCounter.current}`;
      
      dispatch(addMessage({
        id: tempId,
        conversationId,
        senderId: message.senderId || currentUserId || '',
        sender_name: message.senderName,
        sender_avatar: message.senderAvatar ?? null,
        type: (message.type ?? 'text') as any,
        content: message.content,
        file_url: message.file_url ?? null,
        file_name: null,
        file_size: null,
        timestamp: new Date().toISOString(),
        status: 'sending',
      }));
      
      return tempId;
    },
    [conversationId, currentUserId, dispatch]
  );

  return {
    messages,
    isLoading,
    loadMessages,
    addOptimisticMessage,
  };
};

export type { MessageItem };
