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
  'incoming-call', 'call-accepted', 'call-ended', 'call-timeout', 'group-call-request',
  'user_joined', 'user_left', 'room_joined', 'message_read',
  'live_location_started', 'live_location_updated', 'live_location_stopped',
];

function removeAllListeners() {
  if (!socket) return;
  REGISTERED_EVENTS.forEach((event) => socket!.removeAllListeners(event));
}

export interface SocketMessage {
  id: string;
  conversationId?: string;
  senderId: string;
  sender_name?: string;
  sender_avatar?: string | null;
  contentType?: string;
  content?: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  createdAt?: string;
  roomId?: string;
  senderDisplayName?: string;
  senderAvatarUrl?: string;
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
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
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

  // Global debug listener - log ALL incoming events
  const debugEvents = ['receive_message', 'message_sent', 'room_joined', 'user_joined', 'user_left', 'typing', 'notification:new_message'];
  debugEvents.forEach(event => {
    socket?.on(event, (data) => {
      console.log(`[Socket] Event "${event}":`, JSON.stringify(data).substring(0, 100));
    });
  });

  // ─── Message Events ───────────────────────────────────────────────────────

  socket.on('receive_message', (message: SocketMessage) => {
    console.log('[Socket] receive_message received:', JSON.stringify(message).substring(0, 100));
    
    const currentUserId = store.getState().auth?.user?.userId;
    const senderId = message.senderId ? String(message.senderId) : '';
    
    console.log('[Socket] currentUserId:', currentUserId, 'senderId:', senderId, 'match:', currentUserId === senderId);
    
    if (currentUserId && senderId && senderId === String(currentUserId)) {
      console.log('[Socket] Skipping own message');
      return;
    }

    const convId = message.conversationId || (message as any).roomId;
    console.log('[Socket] Adding message to conversation:', convId);

    // Get senderDisplayName - prefer from message, then try group members
    let senderDisplayName = message.senderDisplayName || message.sender_name;
    let senderAvatar = message.sender_avatar ?? message.senderAvatarUrl ?? null;

    // If no senderDisplayName, try to get from group members in store
    if (!senderDisplayName) {
      const groupMembers = store.getState().groups?.groupMembers?.[convId] || [];
      const senderMember = groupMembers.find((m: any) => 
        String(m.userId) === String(senderId) || String(m.id) === String(senderId)
      );
      if (senderMember) {
        senderDisplayName = senderMember.display_name || senderMember.username;
        senderAvatar = senderMember.avatar_url ?? senderAvatar;
      }
    }

    store.dispatch(addMessage({
      id: message.id,
      conversationId: convId,
      senderId: message.senderId,
      senderName: senderDisplayName || 'Unknown',
      sender_name: senderDisplayName || 'Unknown',
      sender_avatar: senderAvatar,
      type: (message.contentType ?? 'text') as 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'emoji',
      content: message.content ?? '',
      file_url: message.file_url ?? null,
      file_name: message.file_name ?? null,
      file_size: message.file_size ?? null,
      timestamp: message.createdAt ?? (message as any).created_at ?? '',
      status: 'delivered',
    }));
  });

  // Backend sends { id, conversationId, senderId, content } after persisting
  socket.on('message_sent', (message: SocketMessage) => {
    const msgId = message.id || (message as any).messageId;
    if (!msgId) return;
    store.dispatch(
      updateMessageStatus({
        conversationId: message.conversationId || '',
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

  // Backend emits "incoming-call" (with hyphen) for incoming call requests
  socket.on('incoming-call', (data: {
    roomId: string;
    callerId: string;
    callerName?: string;
    caller_name?: string;
    type: 'video' | 'voice';
  }) => {
    store.dispatch(setIncomingCall({
      roomId: data.roomId,
      callerId: data.callerId,
      caller_name: data.callerName || data.caller_name || '',
      type: data.type,
    }));
    store.dispatch(setCallStatus('ringing'));
  });

  // Backend emits "call-accepted" (with hyphen) when call is accepted
  socket.on('call-accepted', ({ roomId }: { roomId: string }) => {
    store.dispatch(setCallStatus('connected'));
  });

  // Backend emits "call-ended" (with hyphen) when call ends
  socket.on('call-ended', () => {
    store.dispatch(setCallStatus('ended'));
    store.dispatch(clearIncomingCall());
    store.dispatch(setActiveCall(null));
  });

  // Backend emits "call-timeout" when call times out
  socket.on('call-timeout', ({ roomId, reason }: { roomId: string; reason: string }) => {
    store.dispatch(setCallStatus('ended'));
    store.dispatch(clearIncomingCall());
    store.dispatch(setActiveCall(null));
  });

  // Backend emits "group-call-request" for group calls
  socket.on('group-call-request', (data: {
    groupId: string;
    roomId: string;
    callerId: string;
    callerName?: string;
    caller_name?: string;
    isGroupCall: boolean;
  }) => {
    store.dispatch(setIncomingCall({
      roomId: data.roomId,
      callerId: data.callerId,
      caller_name: data.callerName || data.caller_name || '',
      type: 'video',
    }));
    store.dispatch(setCallStatus('ringing'));
  });

  // ─── Message Read Receipt Events ─────────────────────────────────────────

  // Backend emits "message_read" when a message is marked as read
  socket.on('message_read', ({ conversationId, messageId, readerId, readerName, readerAvatar, readAt }: {
    conversationId: string;
    messageId: string;
    readerId: string;
    readerName?: string;
    readerAvatar?: string | null;
    readAt?: string;
  }) => {
    const currentUserId = store.getState().auth?.user?.userId;
    // Only update if this is a message sent by current user
    const messages = store.getState().chat?.messages?.[conversationId] || [];
    const message = messages.find((m: any) => m.id === messageId);
    if (message && String(message.senderId) === String(currentUserId)) {
      store.dispatch(updateMessageStatus({
        conversationId,
        messageId: String(messageId),
        status: 'read',
      }));
    }
  });

  // ─── Live Location Events ───────────────────────────────────────────────

  socket.on('live_location_started', (data: {
    roomId: string;
    senderId: string;
    senderDisplayName?: string;
    startedAt?: string;
  }) => {
    console.log('[Socket] Live location started:', data);
    // Could dispatch to a locationSlice if needed
  });

  socket.on('live_location_updated', (data: {
    roomId: string;
    senderId: string;
    lat: number;
    lng: number;
    updatedAt?: string;
  }) => {
    console.log('[Socket] Live location updated:', data);
    // Could dispatch to a locationSlice if needed
  });

  socket.on('live_location_stopped', (data: {
    roomId: string;
    senderId: string;
    stoppedAt?: string;
  }) => {
    console.log('[Socket] Live location stopped:', data);
    // Could dispatch to a locationSlice if needed
  });

  // ─── User Presence in Rooms ─────────────────────────────────────────────

  socket.on('user_joined', ({ roomId, userId }: {
    roomId: string;
    userId: string;
  }) => {
    console.log('[Socket] User joined room:', roomId, userId);
  });

  socket.on('user_left', ({ roomId, userId }: {
    roomId: string;
    userId: string;
  }) => {
    console.log('[Socket] User left room:', roomId, userId);
  });

  socket.on('room_joined', ({ roomId }: {
    roomId: string;
  }) => {
    console.log('[Socket] Successfully joined room:', roomId);
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
  // Join/Leave conversation rooms
  joinConversation: (conversationId: string) => {
    socket?.emit('join_room', { roomId: conversationId });
  },

  leaveConversation: (conversationId: string) => {
    socket?.emit('leave_room', { roomId: conversationId });
  },

  // Typing indicators - backend uses typing_start/typing_stop
  sendTyping: (conversationId: string) => {
    socket?.emit('typing_start', { roomId: conversationId });
  },

  sendStopTyping: (conversationId: string) => {
    socket?.emit('typing_stop', { roomId: conversationId });
  },

  // Send message via socket - backend uses send_message
  sendMessage: (conversationId: string, content: string, type: string = 'text') => {
    socket?.emit('send_message', { roomId: conversationId, content, contentType: type });
  },

  // Call actions - backend uses call-request, call-accept, call-reject, end-call
  initiateCall: (roomId: string, callerId: string, receiverId: string, type: 'video' | 'voice' = 'video') => {
    socket?.emit('call-request', { roomId, callerId, receiverId, type });
    store.dispatch(setCallStatus('calling'));
  },

  initiateGroupCall: (roomId: string, groupId: string, callerName: string) => {
    socket?.emit('group-call-request', { roomId, groupId, callerName });
    store.dispatch(setCallStatus('calling'));
  },

  acceptCall: (roomId: string, callerId: string) => {
    socket?.emit('call-accept', { roomId, callerId });
    store.dispatch(setCallStatus('connected'));
  },

  rejectCall: (roomId: string) => {
    socket?.emit('call-reject', { roomId });
    store.dispatch(clearIncomingCall());
    store.dispatch(setCallStatus('ended'));
  },

  cancelCall: (roomId: string) => {
    socket?.emit('call-cancel', { roomId });
    store.dispatch(setCallStatus('ended'));
  },

  endCall: (roomId: string) => {
    socket?.emit('end-call', { roomId });
    store.dispatch(setCallStatus('ended'));
    store.dispatch(setActiveCall(null));
  },

  // Read receipts - backend uses mark_read
  markRead: (conversationId: string, messageId: string) => {
    socket?.emit('mark_read', { conversationId, messageId });
  },

  // Live location - backend uses start_live_location, update_live_location, stop_live_location
  startLiveLocation: (roomId: string) => {
    socket?.emit('start_live_location', { roomId });
  },

  updateLiveLocation: (roomId: string, lat: number, lng: number) => {
    socket?.emit('update_live_location', { roomId, lat, lng });
  },

  stopLiveLocation: (roomId: string) => {
    socket?.emit('stop_live_location', { roomId });
  },
};
