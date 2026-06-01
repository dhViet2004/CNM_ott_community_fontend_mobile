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
  addReaderToMessage,
  addNewConversation,
  removeConversationById,
  updateMessage,
} from '@store/slices/chatSlice';
import type { PollData } from '@/types';
import {
  removeGroup,
  addGroup,
  socketAddMember,
  socketRemoveMember,
  socketUpdateRole,
  socketReloadMembers,
} from '@store/slices/groupsSlice';
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
import {
  setGroupIncomingCall,
  clearGroupIncomingCall,
  setGroupStatus,
} from '@store/slices/groupCallSlice';
import { updateUser } from '@store/slices/authSlice';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL;

let socket: Socket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let unsubscribeRoomSync: (() => void) | null = null;
const MAX_RECONNECT_ATTEMPTS = 5;
const joinedRooms = new Set<string>();
const emittedJoinedRooms = new Set<string>();

const normalizeRoomId = (roomId?: string | number | null): string =>
  String(roomId ?? '').trim();

const buildDmRoomId = (
  userId?: string | number | null,
  friendId?: string | number | null
): string | null => {
  const a = normalizeRoomId(userId);
  const b = normalizeRoomId(friendId);
  if (!a || !b) return null;

  const aNum = Number(a);
  const bNum = Number(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
    return `dm:${[aNum, bNum].sort((x, y) => x - y).join(':')}`;
  }

  return `dm:${[a, b].sort().join(':')}`;
};

const registerRoom = (roomId?: string | number | null): string => {
  const normalized = normalizeRoomId(roomId);
  if (normalized) joinedRooms.add(normalized);
  return normalized;
};

const emitJoinRoom = (roomId?: string | number | null) => {
  const normalized = registerRoom(roomId);
  if (normalized && socket?.connected && !emittedJoinedRooms.has(normalized)) {
    socket.emit('join_room', { roomId: normalized });
    emittedJoinedRooms.add(normalized);
  }
};

const emitLeaveRoom = (roomId?: string | number | null) => {
  const normalized = normalizeRoomId(roomId);
  if (!normalized) return;
  joinedRooms.delete(normalized);
  emittedJoinedRooms.delete(normalized);
  if (socket?.connected) {
    socket.emit('leave_room', { roomId: normalized });
  }
};

const syncKnownConversationRooms = () => {
  const state = store.getState();
  const currentUserId = state.auth?.user?.userId;
  const activeConversationId = state.chat?.activeConversationId;

  if (activeConversationId) {
    registerRoom(activeConversationId);
  }

  (state.chat?.conversations || []).forEach((conversation: any) => {
    if (conversation?.id && !String(conversation.id).startsWith('bot:')) {
      registerRoom(conversation.id);
    }
  });

  (state.chat?.friends || []).forEach((friend: any) => {
    const friendId = friend.friend_id || friend.userId || friend.id;
    const roomId = buildDmRoomId(currentUserId, friendId);
    if (roomId) registerRoom(roomId);
  });

  (state.groups?.myGroups || []).forEach((group: any) => {
    const groupId = group.groupId || group.id;
    if (groupId) registerRoom(groupId);
  });
};

const joinKnownRooms = () => {
  syncKnownConversationRooms();
  if (!socket?.connected) return;

  joinedRooms.forEach((roomId) => {
    emitJoinRoom(roomId);
  });
};

const ensureRoomSyncSubscription = () => {
  if (unsubscribeRoomSync) return;

  unsubscribeRoomSync = store.subscribe(() => {
    if (!socket?.connected) return;
    joinKnownRooms();
  });
};

// Track registered event names so we can clean up before re-registering
const REGISTERED_EVENTS = [
  'connect', 'disconnect', 'connect_error',
  'receive_message', 'message_sent', 'message:revoked',
  'user_typing', 'user_stopped_typing',
  'online_users', 'user_online', 'user_offline',
  'new_friend_request', 'friend_request_accepted',
  'direct-call:incoming', 'direct-call:accepted', 'direct-call:rejected', 'direct-call:ended',
  'call:missed', 'call:busy', 'call:error', 'call:ringing', 'call:state-updated',
  'group-call:incoming', 'group-call:accepted', 'group-call:ended',
  'group-call:participant-joined', 'group-call:participant-left',
  'user_joined', 'user_left', 'room_joined', 'message_read',
  'live_location_started', 'live_location_updated', 'live_location_stopped',
  'message_pinned_updated', 'poll_updated',
  // Nhiệm vụ 2: Group management socket events
  'group:members_added', 'group:member_removed', 'group:member_left',
  'group:you_were_removed', 'group:you_were_added', 'group:deleted',
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
  replyTo?: string | number | null;
  replyToMessage?: any;
  pollData?: PollData | null;
}

// ─── Connect ─────────────────────────────────────────────────────────────────

export const connectSocket = (token: string) => {
  if (socket?.connected) {
    joinKnownRooms();
    return socket;
  }

  if (socket) {
    removeAllListeners();
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  ensureRoomSyncSubscription();

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    reconnectAttempts = 0;
    emittedJoinedRooms.clear();
    joinKnownRooms();
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

    // Skip if user already deleted this message for themselves
    const msgId = String(message.id);
    const deletedForMeIds = store.getState().chat?.deletedForMeIds || [];
    if (msgId && deletedForMeIds.includes(msgId)) {
      console.log('[Socket] Skipping message already deleted-for-me:', msgId);
      return;
    }

    const rawConvId = message.conversationId || (message as any).roomId;
    const activeConversationId = store.getState().chat?.activeConversationId;
    const dmConvId =
      currentUserId && senderId
        ? `dm:${[String(currentUserId), senderId].sort().join(':')}`
        : '';
    const convId =
      activeConversationId === dmConvId ? dmConvId : rawConvId;
    console.log('[Socket] Adding message to conversation:', convId);

    // Get senderDisplayName - prefer from message, then try group members
    let senderDisplayName = message.senderDisplayName || message.sender_name;
    let senderAvatar = message.sender_avatar ?? message.senderAvatarUrl ?? null;

    // If no senderDisplayName, try to get from group members in store
    if (!senderDisplayName || String(senderDisplayName).trim().toLowerCase() === 'unknown') {
      const conversationKey = String(convId || '');
      const strippedGroupKey = conversationKey.replace(/^group:/, '');
      const groupMembers =
        store.getState().groups?.groupMembers?.[conversationKey] ||
        store.getState().groups?.groupMembers?.[strippedGroupKey] ||
        [];
      const senderMember = groupMembers.find((m: any) => 
        String(m.userId) === String(senderId) || String(m.id) === String(senderId)
      );
      if (senderMember) {
        senderDisplayName = senderMember.display_name || (senderMember as any).displayName || senderMember.username;
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
      type: (message.contentType ?? 'text') as 'text' | 'image' | 'video' | 'audio' | 'voice' | 'file' | 'sticker' | 'emoji' | 'system' | 'poll' | 'reminder' | 'reminder_due' | 'location',
      content: message.content ?? '',
      pollData: message.pollData ?? null,
      file_url: message.file_url ?? (message as any).attachments?.[0]?.url ?? null,
      locationData: (message as any).locationData ?? null,
      file_name: message.file_name ?? null,
      file_size: message.file_size ?? null,
      timestamp: message.createdAt ?? (message as any).created_at ?? '',
      status: 'delivered',
      replyTo: (message as any).replyTo ?? null,
      replyToMessage: (message as any).replyToMessage ?? null,
      storyReply: (message as any).storyReply ?? null,
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
    console.log('[Socket] ⭐ message:revoked received!', { messageId, conversationId });
    if (!messageId || !conversationId) {
      console.warn('[Socket] message:revoked received with missing messageId or conversationId:', { messageId, conversationId });
      return;
    }
    store.dispatch(setMessageRevoked({ messageId, conversationId }));
    console.log('[Socket] ⭐ setMessageRevoked dispatched for messageId:', messageId);
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

  // ─── Call Events (backend-compatible) ──────────────────────────────────────

  // Direct call incoming
  socket.on('direct-call:incoming', (data: {
    callId: string;
    callerId: string;
    callerName?: string;
    caller_name?: string;
    callerAvatar?: string | null;
    callType: 'audio' | 'video';
    channelName: string;
    conversationId: string;
    token?: string;
    uid?: number;
  }) => {
    store.dispatch(setIncomingCall({
      callId: data.callId,
      callerId: data.callerId,
      callerName: data.callerName || data.caller_name || '',
      callerAvatar: data.callerAvatar ?? null,
      callType: data.callType,
      callMode: 'direct',
      channelName: data.channelName,
      conversationId: data.conversationId,
      token: data.token,
      uid: data.uid,
    }));
    store.dispatch(setCallStatus('ringing'));
  });

  // Direct call accepted — caller receives this when callee accepts
  socket.on('direct-call:accepted', (data: {
    callId: string;
    token?: { appId: string; token: string; uid: number; channelName: string };
  }) => {
    store.dispatch(setCallStatus('connected'));
  });

  // Direct call rejected
  socket.on('direct-call:rejected', () => {
    store.dispatch(setCallStatus('ended'));
    store.dispatch(clearIncomingCall());
    store.dispatch(setActiveCall(null));
  });

  // Direct call ended
  socket.on('direct-call:ended', () => {
    store.dispatch(setCallStatus('ended'));
    store.dispatch(clearIncomingCall());
    store.dispatch(setActiveCall(null));
  });

  // Call missed (timeout)
  socket.on('call:missed', () => {
    store.dispatch(setCallStatus('ended'));
    store.dispatch(clearIncomingCall());
    store.dispatch(setActiveCall(null));
  });

  // Call busy
  socket.on('call:busy', () => {
    store.dispatch(setCallStatus('ended'));
    store.dispatch(clearIncomingCall());
    store.dispatch(setActiveCall(null));
  });

  // Call error
  socket.on('call:error', (data: { message?: string }) => {
    console.warn('[Socket] call:error:', data?.message);
    store.dispatch(setCallStatus('ended'));
    store.dispatch(clearIncomingCall());
    store.dispatch(setActiveCall(null));
  });

  // Group call incoming
  socket.on('group-call:incoming', (data: {
    callId: string;
    sessionId?: string;
    callerId: string;
    callerName?: string;
    caller_name?: string;
    callerAvatar?: string | null;
    callType: 'audio' | 'video';
    channelName: string;
    conversationId: string;
    token?: string;
    uid?: number;
  }) => {
    store.dispatch(setGroupIncomingCall({
      callId: data.sessionId ?? data.callId,
      callerId: data.callerId,
      callerName: data.callerName || data.caller_name || '',
      callerAvatar: data.callerAvatar ?? null,
      // Group call is video-only in current product flow. Web also treats it as a single type.
      callType: 'video',
      callMode: 'group',
      channelName: data.channelName,
      conversationId: data.conversationId,
      token: data.token,
      uid: data.uid,
    }));
    store.dispatch(setGroupStatus('ringing'));
  });

  // Group call accepted
  socket.on('group-call:accepted', (data: {
    callId: string;
    token?: { appId: string; token: string; uid: number; channelName: string };
  }) => {
    // NO dispatch — initiator is already active, invitee handles via modal
    console.log('[Socket] group-call:accepted:', data.callId);
  });

  // Group call ended
  socket.on('group-call:ended', () => {
    store.dispatch(setGroupStatus('ended'));
    store.dispatch(clearGroupIncomingCall());
  });

  // Group call participant joined
  socket.on('group-call:participant-joined', (data: {
    callId: string;
    userId: string;
  }) => {
    console.log('[Socket] group-call:participant-joined:', data.userId);
  });

  // Group call participant left
  socket.on('group-call:participant-left', (data: {
    callId: string;
    userId: string;
  }) => {
    console.log('[Socket] group-call:participant-left:', data.userId);
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
      // Update status to 'read'
      store.dispatch(updateMessageStatus({
        conversationId,
        messageId: String(messageId),
        status: 'read',
      }));

      // Append reader to readBy array for avatar display
      store.dispatch(addReaderToMessage({
        conversationId,
        messageId: String(messageId),
        reader: {
          userId: String(readerId),
          readerName: readerName,
          readerAvatar: readerAvatar ?? null,
          readAt: readAt,
        },
      }));

      console.log(`[Socket] message_read: reader=${readerId} read msg=${messageId} in conv=${conversationId}`);
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

  socket.on('message_pinned_updated', (data: { roomId: string; pinnedMessages: any[] }) => {
    console.log('[Socket] Pinned messages updated for room:', data.roomId);
    // Dispatch to store if we have pinned messages in state
    store.dispatch({
      type: 'chat/setPinnedMessages',
      payload: { conversationId: data.roomId, pinnedMessages: data.pinnedMessages }
    });
  });

  socket.on('poll_updated', (data: { roomId?: string; conversationId?: string; messageId: string; pollData: PollData }) => {
    const conversationId = data.roomId || data.conversationId;
    if (!conversationId || !data.messageId) return;
    store.dispatch(updateMessage({
      conversationId,
      messageId: String(data.messageId),
      updates: { pollData: data.pollData },
    }));
  });

  socket.on('chat_background_updated', (data: { friendshipId: string; bgUrl: string | null; updatedBy: string }) => {
    console.log('[Socket] Chat background updated for friendship:', data.friendshipId);
  });

  // ─── Nhiệm vụ 2: Group Management Socket Events ─────────────────────────────────
  // Đồng bộ từ Web (useGroupSocket.ts) sang Mobile

  // Khi thành viên được thêm vào nhóm
  socket.on('group:members_added', (data: {
    groupId: string;
    newMembers: Array<{ userId: string; username?: string; display_name?: string; displayName?: string; avatar_url?: string; avatarUrl?: string; role?: string }>;
    addedBy: string;
  }) => {
    console.log('[Socket] ⭐ group:members_added received:', JSON.stringify(data));
    if (!data.groupId) return;

    const currentUserId = store.getState().auth?.user?.userId;
    const gIdStr = String(data.groupId);

    // Reload toàn bộ danh sách members cho group hiện tại
    store.dispatch(socketReloadMembers({
      groupId: gIdStr,
      members: data.newMembers.map((m: any) => ({
        userId: m.userId,
        username: m.username || '',
        display_name: m.display_name || m.displayName || m.username || '',
        avatar_url: m.avatar_url ?? m.avatarUrl ?? null,
        role: m.role || 'MEMBER',
        joined_at: new Date().toISOString(),
      })),
    }));

    // Nếu user hiện tại là người được thêm → thêm vào conversation list
    if (currentUserId && data.newMembers.some((m) => String(m.userId) === String(currentUserId))) {
      const conversationId = gIdStr;
      const existingConv = store.getState().chat?.conversations?.find(
        (c: any) => String(c.id) === conversationId
      );
      if (!existingConv) {
        store.dispatch(addNewConversation({
          id: conversationId,
          type: 'group',
          name: 'Nhóm mới',
          avatar: undefined,
          participants: data.newMembers.map((m) => String(m.userId)),
          unreadCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    }
  });

  // Khi user VỪA ĐƯỢC THÊM VÀO nhóm — nhận thông tin đầy đủ của group để hiển thị trong Chat List
  socket.on('group:added_to_group', (data: {
    groupDetails: {
      groupId: string;
      name: string;
      description?: string;
      avatarUrl?: string | null;
      memberCount?: number;
      createdBy?: string;
      createdAt?: string;
      isApprovalRequired?: boolean;
    };
    addedBy: string;
  }) => {
    console.log('[Socket] ⭐ group:added_to_group received:', JSON.stringify(data));
    if (!data.groupDetails?.groupId) return;

    const currentUserId = store.getState().auth?.user?.userId;
    const gDetails = data.groupDetails;
    emitJoinRoom(gDetails.groupId);

    // Thêm nhóm mới vào danh sách chat
    const conversationId = String(gDetails.groupId);
    const existingConv = store.getState().chat?.conversations?.find(
      (c: any) => String(c.id) === conversationId
    );

    if (!existingConv) {
      store.dispatch(addNewConversation({
        id: conversationId,
        type: 'group',
        name: gDetails.name || 'Nhóm mới',
        avatar: gDetails.avatarUrl || undefined,
        participants: [],
        unreadCount: 0,
        createdAt: gDetails.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      console.log('[Socket] group:added_to_group → addNewConversation dispatched');
    }

    // Thêm nhóm vào groups.myGroups (để ChatScreen hiển thị đúng)
    const existingMyGroup = store.getState().groups?.myGroups?.find(
      (g: any) => String(g.groupId) === String(gDetails.groupId)
    );
    console.log('[Socket] group:added_to_group → existingMyGroup check:', !!existingMyGroup, '| groupId:', gDetails.groupId);

    if (!existingMyGroup) {
      const groupPayload = {
        groupId: String(gDetails.groupId),
        name: gDetails.name || 'Nhóm mới',
        description: gDetails.description || '',
        avatar_url: gDetails.avatarUrl ?? null,
        is_private: false,
        invite_code: '',
        member_count: gDetails.memberCount ?? 0,
        created_by: gDetails.createdBy || '',
        created_at: gDetails.createdAt || new Date().toISOString(),
        members: [] as any[],
      };
      console.log('[Socket] group:added_to_group → dispatching addGroup with payload:', JSON.stringify(groupPayload));
      store.dispatch(addGroup(groupPayload));
      console.log('[Socket] group:added_to_group → addGroup dispatched, myGroups now:', store.getState().groups?.myGroups?.length);
    }
  });

  // Khi thành viên bị kick khỏi nhóm
  socket.on('group:member_removed', (data: {
    groupId: string;
    removedMember: string;
    kickedBy: string;
  }) => {
    console.log('[Socket] ⭐ group:member_removed received:', JSON.stringify(data));
    if (!data.groupId || !data.removedMember) return;

    const currentUserId = store.getState().auth?.user?.userId;
    const gIdStr = String(data.groupId);

    // Nếu user hiện tại là người bị kick → xóa khỏi myGroups và conversations
    if (currentUserId && String(data.removedMember) === String(currentUserId)) {
      emitLeaveRoom(gIdStr);
      store.dispatch(removeGroup(gIdStr));
      store.dispatch(removeConversationById(gIdStr));
      console.log('[Socket] Current user was kicked, removing from store');
    } else {
      // Cập nhật danh sách members cho những user khác
      store.dispatch(socketRemoveMember({
        groupId: gIdStr,
        userId: String(data.removedMember),
      }));
    }
  });

  // Khi thành viên tự rời nhóm
  socket.on('group:member_left', (data: {
    groupId: string;
    leftMember: string;
  }) => {
    console.log('[Socket] ⭐ group:member_left received:', JSON.stringify(data));
    if (!data.groupId || !data.leftMember) return;

    const currentUserId = store.getState().auth?.user?.userId;
    const gIdStr = String(data.groupId);

    // Nếu user hiện tại tự rời → xóa khỏi myGroups và conversations
    if (currentUserId && String(data.leftMember) === String(currentUserId)) {
      emitLeaveRoom(gIdStr);
      store.dispatch(removeGroup(gIdStr));
      store.dispatch(removeConversationById(gIdStr));
      console.log('[Socket] Current user left the group, removing from store');
    } else {
      store.dispatch(socketRemoveMember({
        groupId: gIdStr,
        userId: String(data.leftMember),
      }));
    }
  });

  // Khi user hiện tại bị xóa khỏi nhóm (bị admin kick)
  socket.on('group:you_were_removed', (data: {
    groupId: string;
  }) => {
    console.log('[Socket] ⭐ group:you_were_removed received:', JSON.stringify(data));
    if (!data.groupId) return;

    const gIdStr = String(data.groupId);
    emitLeaveRoom(gIdStr);
    store.dispatch(removeGroup(gIdStr));
    store.dispatch(removeConversationById(gIdStr));
    console.log('[Socket] User was removed from group:', gIdStr);
  });

  // Khi user hiện tại được thêm vào nhóm mới
  socket.on('group:you_were_added', (data: {
    groupData: {
      groupId?: string | number;
      id?: string | number;
      name?: string;
      avatar_url?: string;
      avatarUrl?: string;
      description?: string;
      memberCount?: number;
    };
    addedBy: string;
  }) => {
    console.log('[Socket] ⭐ group:you_were_added received:', JSON.stringify(data));
    if (!data.groupData) return;

    const groupId = String(data.groupData.groupId || data.groupData.id || '');
    if (!groupId) return;
    emitJoinRoom(groupId);

    const conversationId = groupId;
    const existingConv = store.getState().chat?.conversations?.find(
      (c: any) => String(c.id) === conversationId
    );

    console.log('[Socket] group:you_were_added → existingConv check:', !!existingConv, '| conversationId:', conversationId);

    if (!existingConv) {
      store.dispatch(addNewConversation({
        id: conversationId,
        type: 'group',
        name: data.groupData.name || 'Nhóm mới',
        avatar: data.groupData.avatar_url ?? data.groupData.avatarUrl ?? undefined,
        participants: [],
        unreadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      console.log('[Socket] group:you_were_added → addNewConversation dispatched');
    }

    // Thêm nhóm vào groups.myGroups (để ChatScreen hiển thị đúng)
    const existingMyGroup = store.getState().groups?.myGroups?.find(
      (g: any) => String(g.groupId) === groupId
    );
    console.log('[Socket] group:you_were_added → existingMyGroup check:', !!existingMyGroup, '| groupId:', groupId);

    if (!existingMyGroup) {
      const groupPayload = {
        groupId,
        name: data.groupData.name || 'Nhóm mới',
        description: data.groupData.description || '',
        avatar_url: data.groupData.avatar_url ?? data.groupData.avatarUrl ?? null,
        is_private: false,
        invite_code: '',
        member_count: data.groupData.memberCount ?? 0,
        created_by: data.addedBy || '',
        created_at: new Date().toISOString(),
        members: [] as any[],
      };
      console.log('[Socket] group:you_were_added → dispatching addGroup with payload:', JSON.stringify(groupPayload));
      store.dispatch(addGroup(groupPayload));
      console.log('[Socket] group:you_were_added → addGroup dispatched, myGroups now:', store.getState().groups?.myGroups?.length);
    }
  });

  // Khi nhóm bị giải tán
  socket.on('group:deleted', (data: {
    groupId: string;
    disbandedBy: string;
  }) => {
    console.log('[Socket] ⭐ group:deleted received:', JSON.stringify(data));
    if (!data.groupId) return;

    const gIdStr = String(data.groupId);
    emitLeaveRoom(gIdStr);
    store.dispatch(removeGroup(gIdStr));
    store.dispatch(removeConversationById(gIdStr));
    console.log('[Socket] Group deleted:', gIdStr);
  });

  // Khi hồ sơ cá nhân/avatar được cập nhật ở client khác (Web/Mobile), đồng bộ lại state
  socket.on('profile_updated', (data: any) => {
    console.log('[Socket] ⭐ profile_updated received:', JSON.stringify(data));
    if (data) {
      const mappedUser = {
        userId: data.userId || data.id,
        username: data.username,
        display_name: data.display_name || data.fullName,
        displayName: data.display_name || data.fullName,
        avatar_url: data.avatar_url || data.avatarUrl,
        avatarUrl: data.avatar_url || data.avatarUrl,
        cover_url: data.cover_url || data.coverUrl,
        coverUrl: data.cover_url || data.coverUrl,
        gender: data.gender,
        birthday: data.birthday,
        phoneNumber: data.phoneNumber || data.phone,
      };
      store.dispatch(updateUser(mappedUser));
    }
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
  if (unsubscribeRoomSync) {
    unsubscribeRoomSync();
    unsubscribeRoomSync = null;
  }
  emittedJoinedRooms.clear();
  socket?.disconnect();
  socket = null;
};

// ─── Get Socket Instance ──────────────────────────────────────────────────────

export const getSocket = () => socket;

// ─── Emit Actions ────────────────────────────────────────────────────────────

export const socketActions = {
  // Join/Leave conversation rooms
  joinConversation: (conversationId: string) => {
    emitJoinRoom(conversationId);
  },

  leaveConversation: (conversationId: string) => {
    // Keep chat rooms joined for app-wide realtime. Use forceLeaveConversation
    // only when the user is no longer a participant.
    registerRoom(conversationId);
  },

  forceLeaveConversation: (conversationId: string) => {
    emitLeaveRoom(conversationId);
  },

  // Typing indicators - backend uses typing_start/typing_stop
  sendTyping: (conversationId: string) => {
    socket?.emit('typing_start', { roomId: conversationId });
  },

  sendStopTyping: (conversationId: string) => {
    socket?.emit('typing_stop', { roomId: conversationId });
  },

  // Send message via socket - backend uses send_message
  sendMessage: (conversationId: string, content: string, type: string = 'text', pollData?: PollData, callback?: (res: any) => void) => {
    if (!socket) {
      callback?.({ ok: false, error: 'Socket chưa kết nối' });
      return;
    }
    socket?.emit('send_message', { roomId: conversationId, content, contentType: type, ...(pollData ? { pollData } : {}) }, callback);
  },

  votePoll: (conversationId: string, messageId: string | number, optionId: string, callback?: (res: any) => void) => {
    if (!socket) {
      callback?.({ ok: false, error: 'Socket chưa kết nối' });
      return;
    }
    socket?.emit('vote_poll', { roomId: conversationId, messageId, optionId }, callback);
  },

  // Call actions (backend-compatible event names)
  startCall: (conversationId: string, callType: 'audio' | 'video') => {
    socket?.emit('call:start', { conversationId, callType });
    store.dispatch(setCallStatus('calling'));
  },

  startGroupCall: (conversationId: string, callType: 'audio' | 'video', memberUserIds: string[]) => {
    socket?.emit('group-call:start', { conversationId, callType, memberUserIds });
    store.dispatch(setGroupStatus('joining'));
  },

  acceptCall: (callId: string) => {
    socket?.emit('call:accept', { callId });
    store.dispatch(setCallStatus('connected'));
  },

  rejectCall: (callId: string) => {
    socket?.emit('call:reject', { callId });
    store.dispatch(clearIncomingCall());
    store.dispatch(setCallStatus('ended'));
  },

  cancelCall: (callId: string) => {
    socket?.emit('call:cancel', { callId });
    store.dispatch(setCallStatus('ended'));
  },

  endCall: (callId: string) => {
    socket?.emit('call:end', { callId });
    store.dispatch(setCallStatus('ended'));
    store.dispatch(setActiveCall(null));
  },

  acceptGroupCall: (callId: string) => {
    // NO dispatch — modal sets credentials → joining, screen sets active on Agora join
    socket?.emit('group-call:accept', { callId });
  },

  /** Late-join / rejoin — emits call:join with ACK, returns credentials */
  joinGroupCall: (callId: string): Promise<{ ok: boolean; token?: string; uid?: number; channelName?: string; error?: string }> => {
    return new Promise((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      socket.emit('call:join', { callId }, (response: any) => {
        if (response?.ok) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'call:join failed'));
        }
      });
    });
  },

  rejectGroupCall: (callId: string) => {
    socket?.emit('group-call:reject', { callId });
    store.dispatch(clearGroupIncomingCall());
    store.dispatch(setGroupStatus('idle'));
  },

  leaveGroupCall: (callId: string) => {
    socket?.emit('group-call:leave', { callId });
    // NO dispatch — caller handles local cleanup
  },

  endGroupCall: (callId: string) => {
    socket?.emit('group-call:end', { callId });
    store.dispatch(setGroupStatus('ended'));
  },

  // Read receipts - backend uses mark_read
  // Emits mark_read for the LATEST message in the conversation (marks all prior as read)
  markRead: (conversationId: string, latestMessageId?: string) => {
    socket?.emit('mark_read', { conversationId, messageId: latestMessageId });
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

  // Pinning
  pinMessage: (roomId: string, message: any, callback?: (res: any) => void) => {
    socket?.emit('pin_message', { roomId, message }, callback);
  },

  unpinMessage: (roomId: string, messageId: string, callback?: (res: any) => void) => {
    socket?.emit('unpin_message', { roomId, messageId }, callback);
  },

  updateChatBackground: (friendshipId: string, bgUrl: string | null, receiverId: string) => {
    socket?.emit('chat_background_updated', { friendshipId, bgUrl, receiverId });
  },
};
