import { io, Socket } from 'socket.io-client';
import { store } from '@store/store';
import {
  addMessage,
  setTypingUser,
  removeTypingUser,
  setUserOnline,
  setUserOffline,
  setMessageRevoked,
  updateMessageStatus,
  addFriend as addFriendToChat,
} from '@store/slices/chatSlice';
import {
  addPendingRequest,
  addContact,
} from '@store/slices/contactSlice';
import {
  setIncomingCall,
  setCallStatus,
  setActiveCall,
  clearIncomingCall,
} from '@store/slices/callSlice';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

let socket: Socket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Track registered event names so we can clean up before re-registering
const REGISTERED_EVENTS = [
  'connect', 'disconnect', 'connect_error',
  'receive_message', 'message_sent', 'message:revoked',
  'user_typing', 'user_stopped_typing',
  'online_users', 'user_online', 'user_offline',
  'new_friend_request', 'friend_request_accepted',
  'call_incoming', 'call_accepted', 'call_rejected', 'call_ended',
];

function removeAllListeners() {
  if (!socket) return;
  REGISTERED_EVENTS.forEach((event) => socket!.removeAllListeners(event));
}

export interface SocketMessage {
  id: string;
  conversationId: string;
  senderId: string;
  sender_name?: string;
  sender_avatar?: string | null;
  contentType?: string;
  content?: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  createdAt?: string;
}

// ─── Connect ─────────────────────────────────────────────────────────────────

export const connectSocket = (token: string) => {
  if (socket?.connected) {
    removeAllListeners();
  } else if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected:', reason);
    if (reason === 'io server disconnect') {
      scheduleReconnect(token);
    }
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
    scheduleReconnect(token);
  });

  // ─── Message Events ───────────────────────────────────────────────────────

  socket.on('receive_message', (message: SocketMessage) => {
    const currentUserId = store.getState().auth.user?.userId;
    const senderId = message.senderId ? String(message.senderId) : '';
    if (currentUserId && senderId && senderId === String(currentUserId)) {
      return;
    }

    store.dispatch(addMessage({
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender_name: message.sender_name,
      sender_avatar: message.sender_avatar ?? null,
      type: (message.contentType ?? 'text') as 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'emoji',
      content: message.content ?? '',
      file_url: message.file_url ?? null,
      file_name: message.file_name ?? null,
      file_size: message.file_size ?? null,
      timestamp: message.createdAt ?? '',
      status: 'delivered',
    }));
  });

  // Backend sends { id, conversationId, senderId, content } after persisting
  socket.on('message_sent', (message: SocketMessage) => {
    const msgId = message.id || (message as any).messageId;
    if (!msgId) return;
    store.dispatch(
      updateMessageStatus({
        conversationId: message.conversationId,
        messageId: String(msgId),
        status: 'sent',
      })
    );
  });

  // Backend emits "message:revoked" (with colon) after message is revoked
  socket.on('message:revoked', ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
    store.dispatch(setMessageRevoked({ messageId, conversationId }));
  });

  // ─── Typing Events ────────────────────────────────────────────────────────

  socket.on('user_typing', ({ roomId, userId, userName }: {
    roomId: string;
    userId: string;
    userName: string;
  }) => {
    store.dispatch(setTypingUser({ conversationId: roomId, userId, user_name: userName }));
  });

  socket.on('user_stopped_typing', ({ roomId, userId }: {
    roomId: string;
    userId: string;
  }) => {
    store.dispatch(removeTypingUser({ conversationId: roomId, userId }));
  });

  // ─── Presence Events ──────────────────────────────────────────────────────

  socket.on('online_users', ({ users }: { users: string[] }) => {
    users.forEach((userId) => store.dispatch(setUserOnline(userId)));
  });

  socket.on('user_online', ({ userId }: { userId: string }) => {
    store.dispatch(setUserOnline(userId));
  });

  socket.on('user_offline', ({ userId }: { userId: string }) => {
    store.dispatch(setUserOffline(userId));
  });

  // ─── Friend Events ───────────────────────────────────────────────────────

  // Backend emits "new_friend_request" with payload:
  // { type: "new_friend_request", sender: { id, display_name, username, avatar_url } }
  socket.on('new_friend_request', ({ sender }: {
    sender: { id: string; display_name: string; username: string; avatar_url: string | null }
  }) => {
    store.dispatch(addPendingRequest({
      userId: sender.id,
      username: sender.username,
      display_name: sender.display_name,
      avatar_url: sender.avatar_url ?? null,
    }));
  });

  // Backend emits "friend_request_accepted" with payload:
  // { type: "friend_request_accepted", receiver: { id, display_name, username, avatar_url } }
  socket.on('friend_request_accepted', ({ receiver }: {
    receiver: { id: string; display_name: string; username: string; avatar_url: string | null }
  }) => {
    store.dispatch(addContact({
      id: receiver.id,
      name: receiver.display_name,
      avatar: receiver.avatar_url ?? undefined,
      userId: receiver.id,
      username: receiver.username,
      display_name: receiver.display_name,
      avatar_url: receiver.avatar_url ?? null,
    }));
    // Update chatSlice friends so ChatScreen conversation list updates in real-time
    store.dispatch(addFriendToChat({
      userId: receiver.id,
      display_name: receiver.display_name,
      username: receiver.username,
      avatar_url: receiver.avatar_url ?? null,
      friends_since: new Date().toISOString(),
      friend_id: receiver.id,
      friendshipId: `pending_${Date.now()}`,
      status: 'accepted',
      friendship_status: 'accepted',
    }));
  });

  // ─── Call Events ──────────────────────────────────────────────────────────

  socket.on('call_incoming', (data: {
    roomId: string;
    callerId: string;
    caller_name: string;
    type: 'video' | 'voice';
  }) => {
    store.dispatch(setIncomingCall(data));
    store.dispatch(setCallStatus('ringing'));
  });

  socket.on('call_accepted', ({ roomId }: { roomId: string }) => {
    store.dispatch(setCallStatus('connected'));
  });

  socket.on('call_rejected', () => {
    store.dispatch(setCallStatus('ended'));
    store.dispatch(clearIncomingCall());
  });

  socket.on('call_ended', () => {
    store.dispatch(setCallStatus('ended'));
    store.dispatch(clearIncomingCall());
    store.dispatch(setActiveCall(null));
  });
};

// ─── Reconnect Logic ──────────────────────────────────────────────────────────

const scheduleReconnect = (token: string) => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[Socket] Max reconnect attempts reached');
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);

  reconnectTimer = setTimeout(() => {
    console.log(`[Socket] Reconnecting... attempt ${reconnectAttempts}`);
    connectSocket(token);
  }, delay);
};

// ─── Disconnect ───────────────────────────────────────────────────────────────

export const disconnectSocket = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  socket?.disconnect();
  socket = null;
};

// ─── Get Socket Instance ──────────────────────────────────────────────────────

export const getSocket = () => socket;

// ─── Emit Actions ────────────────────────────────────────────────────────────

export const socketActions = {
  joinConversation: (conversationId: string) => {
    socket?.emit('join_conversation', { conversationId });
  },

  leaveConversation: (conversationId: string) => {
    socket?.emit('leave_conversation', { conversationId });
  },

  sendTyping: (conversationId: string) => {
    socket?.emit('typing_start', { roomId: conversationId });
  },

  sendStopTyping: (conversationId: string) => {
    socket?.emit('typing_stop', { roomId: conversationId });
  },

  sendMessage: (conversationId: string, content: string, type: string = 'text') => {
    socket?.emit('send_message', { conversationId, content, type });
  },

  initiateCall: (targetUserId: string, type: 'video' | 'voice' = 'video') => {
    socket?.emit('initiate_call', { target_user_id: targetUserId, type });
    store.dispatch(setCallStatus('calling'));
  },

  acceptCall: (roomId: string) => {
    socket?.emit('accept_call', { roomId });
    store.dispatch(setCallStatus('connected'));
  },

  rejectCall: (roomId: string) => {
    socket?.emit('reject_call', { roomId });
    store.dispatch(clearIncomingCall());
  },

  endCall: (roomId: string) => {
    socket?.emit('end_call', { roomId });
  },

  markRead: (conversationId: string, messageId: string) => {
    socket?.emit('mark_read', { conversationId, messageId });
  },
};
