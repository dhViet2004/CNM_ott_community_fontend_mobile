import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import {
  addMessage,
  confirmPendingMessage,
  failPendingMessage,
  setMessageFailed,
} from '@store/slices/chatSlice';
import { messageApi } from '@api/endpoints';
import type { MessageItem } from './useMessages';

interface UseOptimisticMessageOptions {
  conversationId: string;
  onMessageSent?: (message: MessageItem) => void;
  onMessageFailed?: (tempId: string) => void;
}

interface UseOptimisticMessageReturn {
  sendMessage: (text: string) => Promise<void>;
  revokeMessage: (messageId: string) => Promise<void>;
}

export const useOptimisticMessage = ({
  conversationId,
  onMessageSent,
  onMessageFailed,
}: UseOptimisticMessageOptions): UseOptimisticMessageReturn => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
  const currentUser = useAppSelector((state) => state.auth.user);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const tempId = `temp_${Date.now()}`;
      const trimmedText = text.trim();

      const optimisticMsg: MessageItem = {
        id: tempId,
        conversationId,
        senderId: currentUserId || '',
        senderName: currentUser?.display_name,
        senderAvatar: currentUser?.avatar_url ?? null,
        content: trimmedText,
        time: new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        isMe: true,
        type: 'text',
        status: 'sending',
      };
      dispatch(addMessage({ ...optimisticMsg } as any));

      try {
        const result = await messageApi.sendMessage(conversationId, trimmedText, currentUserId || '');
        const realId = String(result.id ?? result.messageId ?? tempId);

        dispatch(
          confirmPendingMessage({
            tempId,
            realId,
            conversationId,
            senderId: String(result.senderId),
            senderName: result.sender_name,
            senderAvatar: result.sender_avatar ?? null,
            content: result.content ?? trimmedText,
            type: (result.contentType ?? result.type ?? 'text') as MessageItem['type'],
            file_url: result.file_url ?? result.attachments?.[0]?.url ?? null,
          })
        );

        if (onMessageSent) {
          onMessageSent({ ...optimisticMsg, id: realId, status: 'sent' });
        }
      } catch (err) {
        dispatch(failPendingMessage(tempId));
        dispatch(setMessageFailed({ conversationId, messageId: tempId }));
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
        if (onMessageFailed) {
          onMessageFailed(tempId);
        }
      }
    },
    [conversationId, currentUserId, currentUser, dispatch, onMessageSent, onMessageFailed]
  );

  const revokeMessage = useCallback(
    async (messageId: string) => {
      try {
        await messageApi.revokeMessage(String(messageId), conversationId);
        dispatch(
          setMessageFailed({ conversationId, messageId }) as any
        );
      } catch {
        Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
      }
    },
    [conversationId, dispatch]
  );

  return {
    sendMessage,
    revokeMessage,
  };
};
