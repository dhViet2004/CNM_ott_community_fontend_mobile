import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppSelector } from '@store/hooks';
import { socketActions } from '@api/socket';

interface UseTypingIndicatorOptions {
  conversationId: string;
  debounceMs?: number;
}

interface UseTypingIndicatorReturn {
  isTyping: boolean;
  typingUsers: Array<{ userId: string; user_name?: string }>;
  typingLabel: string;
  handleTextChange: (text: string) => void;
}

export const useTypingIndicator = ({
  conversationId,
  debounceMs = 2000,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn => {
  const [isTyping, setIsTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Simple equality check by comparing length
  const typingUsers = useAppSelector((state) => {
    const users = state.chat?.typingUsers?.[conversationId] || [];
    return users;
  });
  const currentUserId = useAppSelector((state) => state.auth?.user?.userId);

  const handleTextChange = useCallback(
    (text: string) => {
      if (!isTyping) {
        socketActions.sendTyping(conversationId);
        setIsTyping(true);
      }

      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = setTimeout(() => {
        socketActions.sendStopTyping(conversationId);
        setIsTyping(false);
      }, debounceMs);
    },
    [conversationId, isTyping, debounceMs]
  );

  const typingLabel = useMemo(() => {
    const users = Array.isArray(typingUsers) ? typingUsers : [];
    const others = users.filter((u: any) => u.userId !== currentUserId);
    if (others.length === 0) return '';
    const names = others.map((u: any) => u.user_name || 'Ai đó').join(', ');
    return `${names} đang nhập...`;
  }, [typingUsers, currentUserId]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  return {
    isTyping,
    typingUsers: Array.isArray(typingUsers) ? typingUsers : [],
    typingLabel,
    handleTextChange,
  };
};
