import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FriendItem } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  // Backend field names (senderDisplayName, senderAvatarUrl) - từ getMessagesForConversation
  senderName?: string;
  senderAvatar?: string | null;
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
  // Legacy field names (sender_name, sender_avatar) - từ socket/addMessage
  sender_name?: string;
  sender_avatar?: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'emoji';
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  // Backend field: createdAt, Legacy field: timestamp
  timestamp: string;
  createdAt?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isDeleted?: boolean;
  isRevoked?: boolean;
  is_revoked?: boolean;
  // Read receipts: danh sách người đã đọc tin nhắn này
  readBy?: Array<{
    userId: string;
    readerName?: string;
    readerAvatar?: string | null;
    readAt?: string;
  }>;
}

export interface Conversation {
  id: string;
  type: 'single' | 'group';
  name?: string;
  avatar?: string;
  lastMessage?: Message;
  participants: string[];
  unreadCount: number;
  isPinned?: boolean;
  isMuted?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TypingUser {
  userId: string;
  user_name?: string;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface ChatState {
  // Conversations
  conversations: Conversation[];
  activeConversationId: string | null;

  // Messages
  messages: Record<string, Message[]>;
  pendingMessages: Record<string, 'sending' | 'sent' | 'failed'>;

  // Friends (DM partners)
  friends: FriendItem[];
  selectedFriendId: string | null;

  // Groups
  myGroups: Array<{
    groupId: string;
    name: string;
    avatar_url?: string | null;
    lastMessage?: string;
    unreadCount: number;
  }>;
  selectedGroupId: string | null;

  // Online presence
  onlineUsers: Record<string, boolean>;

  // Typing
  typingUsers: Record<string, TypingUser[]>;

  // UI state
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  searchQuery: string;

  // Revoked messages
  revokedMessageIds: string[];

  // Deleted-for-me message IDs (local to current user)
  deletedForMeIds: string[];

  // Pinned messages
  pinnedMessages: Record<string, any[]>;
}

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  pendingMessages: {},
  friends: [],
  selectedFriendId: null,
  myGroups: [],
  selectedGroupId: null,
  onlineUsers: {},
  typingUsers: {},
  isLoading: false,
  isLoadingMessages: false,
  error: null,
  searchQuery: '',
  revokedMessageIds: [],
  deletedForMeIds: [],
  pinnedMessages: {},
};

// ─── Slice ───────────────────────────────────────────────────────────────────

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // ─── Conversations ───────────────────────────────────────────────────────
    setConversations(state, action: PayloadAction<Conversation[]>) {
      state.conversations = action.payload;
    },

    addConversation(state, action: PayloadAction<Conversation>) {
      const exists = state.conversations.find((c) => c.id === action.payload.id);
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },

    updateConversation(
      state,
      action: PayloadAction<{ id: string; updates: Partial<Conversation> }>
    ) {
      const index = state.conversations.findIndex(
        (c) => c.id === action.payload.id
      );
      if (index !== -1) {
        state.conversations[index] = {
          ...state.conversations[index],
          ...action.payload.updates,
        };
      }
    },

    /** Nhiệm vụ 1: Thêm conversation mới (dùng khi user được thêm vào group) */
    addNewConversation(state, action: PayloadAction<Conversation>) {
      const exists = state.conversations.find((c) => c.id === action.payload.id);
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },

    /** Nhiệm vụ 1: Xóa conversation (dùng khi group bị giải tán hoặc user bị kick) */
    removeConversationById(state, action: PayloadAction<string>) {
      state.conversations = state.conversations.filter(
        (c) => c.id !== action.payload
      );
      // Also remove messages for this conversation
      if (state.messages[action.payload]) {
        delete state.messages[action.payload];
      }
    },

    /** Nhiệm vụ 1: Cập nhật số lượng thành viên nhóm trong conversation list */
    updateConversationMembersCount(
      state,
      action: PayloadAction<{ conversationId: string; participantsCount: number }>
    ) {
      const { conversationId, participantsCount } = action.payload;
      const conv = state.conversations.find((c) => c.id === conversationId);
      if (conv) {
        conv.participants = Array(participantsCount).fill('');
        // Force update to trigger re-render
        state.conversations = [...state.conversations];
      }
    },

    removeConversation(state, action: PayloadAction<string>) {
      state.conversations = state.conversations.filter((c) => c.id !== action.payload);
    },

    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload;
    },

    // ─── Messages ───────────────────────────────────────────────────────────
    setMessages(
      state,
      action: PayloadAction<{ conversationId: string; messages: Message[] }>
    ) {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },

    prependMessages(
      state,
      action: PayloadAction<{ conversationId: string; messages: Message[] }>
    ) {
      const existing = state.messages[action.payload.conversationId] || [];
      state.messages[action.payload.conversationId] = [
        ...action.payload.messages,
        ...existing,
      ];
    },

    addMessage(state, action: PayloadAction<Message>) {
      const convId = action.payload.conversationId;
      if (!state.messages[convId]) {
        state.messages[convId] = [];
      }

      // Avoid duplicate
      const exists = state.messages[convId].find(
        (m) => m.id === action.payload.id
      );
      if (!exists) {
        state.messages[convId] = [...state.messages[convId], action.payload];
      }

      // Update conversation last message
      const convIndex = state.conversations.findIndex((c) => c.id === convId);
      if (convIndex !== -1) {
        state.conversations[convIndex].lastMessage = action.payload;
        state.conversations[convIndex].updatedAt = action.payload.timestamp;
      }

      // Force new state reference so shallowEqual selectors re-fire
      state.messages = { ...state.messages };
    },

    addPendingMessage(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string }>
    ) {
      state.pendingMessages[action.payload.messageId] = 'sending';
    },

    confirmPendingMessage(
      state,
      action: PayloadAction<{
        tempId: string;
        realId: string;
        conversationId: string;
        senderId: string;
        senderName?: string;
        senderAvatar?: string | null;
        content: string;
        type: string;
        file_url?: string | null;
      }>
    ) {
      const { tempId, realId, conversationId, senderId, senderName, senderAvatar, content, type, file_url } = action.payload;
      delete state.pendingMessages[tempId];

      const messages = state.messages[conversationId];
      if (messages) {
        const idx = messages.findIndex((m) => m.id === tempId);
        if (idx !== -1) {
          const updated = [...messages];
          updated[idx] = {
            ...updated[idx],
            id: realId,
            senderId,
            senderName,
            sender_name: senderName,
            sender_avatar: senderAvatar ?? null,
            content,
            type: type as Message['type'],
            file_url: file_url ?? null,
            status: 'sent',
          };
          state.messages[conversationId] = updated;
          state.messages = { ...state.messages };
        }
      }
    },

    failPendingMessage(state, action: PayloadAction<string>) {
      state.pendingMessages[action.payload] = 'failed';
    },

    setMessageFailed(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string }>
    ) {
      const { conversationId, messageId } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const idx = messages.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          const updated = [...messages];
          updated[idx] = { ...updated[idx], status: 'failed' as const };
          state.messages[conversationId] = updated;
          state.messages = { ...state.messages };
        }
      }
    },

    setMessageStatus(
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        status: Message['status'];
      }>
    ) {
      const messages = state.messages[action.payload.conversationId];
      if (messages) {
        const msgIndex = messages.findIndex(
          (m) => m.id === action.payload.messageId
        );
        if (msgIndex !== -1) {
          const updated = [...messages];
          updated[msgIndex] = { ...updated[msgIndex], status: action.payload.status };
          state.messages[action.payload.conversationId] = updated;
          state.messages = { ...state.messages };
        }
      }
    },

    updateMessageStatus(
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        status: Message['status'];
      }>
    ) {
      const messages = state.messages[action.payload.conversationId];
      if (messages) {
        const msgIndex = messages.findIndex(
          (m) => m.id === action.payload.messageId
        );
        if (msgIndex !== -1) {
          const updated = [...messages];
          updated[msgIndex] = { ...updated[msgIndex], status: action.payload.status };
          state.messages[action.payload.conversationId] = updated;
          state.messages = { ...state.messages };
        }
      }
    },

    updateMessage(
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        updates: Partial<Message>;
      }>
    ) {
      const { conversationId, messageId, updates } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const msgIndex = messages.findIndex((m) => m.id === messageId);
        if (msgIndex !== -1) {
          const updated = [...messages];
          updated[msgIndex] = { ...updated[msgIndex], ...updates };
          state.messages[conversationId] = updated;
          state.messages = { ...state.messages };
        }
      }
    },

    deleteMessage(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string }>
    ) {
      const messages = state.messages[action.payload.conversationId];
      if (messages) {
        state.messages[action.payload.conversationId] = messages.filter(
          (m) => m.id !== action.payload.messageId
        );
        state.messages = { ...state.messages };
      }
    },

    setMessageRevoked(
      state,
      action: PayloadAction<{ messageId: string; conversationId: string }>
    ) {
      const { messageId, conversationId } = action.payload;

      // Add to revokedMessageIds if not already present
      if (!state.revokedMessageIds.includes(messageId)) {
        state.revokedMessageIds.push(messageId);
      }

      const messages = state.messages[conversationId];
      if (messages) {
        const wasFound = messages.some((m) => m.id === messageId);
        state.messages[conversationId] = messages.map((m) => {
          if (m.id === messageId) {
            return { ...m, isRevoked: true, is_revoked: true, content: 'Tin nhắn đã được thu hồi' };
          }
          return m;
        });
        // Force new state reference so shallowEqual selectors re-fire
        state.messages = { ...state.messages };
        console.log(`[ChatSlice] setMessageRevoked: messageId=${messageId} in conversationId=${conversationId}, found=${wasFound}`);
      } else {
        console.warn(`[ChatSlice] setMessageRevoked: no messages array for conversationId=${conversationId}`);
      }
    },

    addReaderToMessage(
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        reader: { userId: string; readerName?: string; readerAvatar?: string | null; readAt?: string };
      }>
    ) {
      const { conversationId, messageId, reader } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const msgIndex = messages.findIndex((m) => String(m.id) === String(messageId));
        if (msgIndex !== -1) {
          const msg = messages[msgIndex];
          // Avoid duplicate reader
          if (!msg.readBy) {
            msg.readBy = [];
          }
          const alreadyExists = msg.readBy.some((r) => String(r.userId) === String(reader.userId));
          if (!alreadyExists) {
            msg.readBy.push(reader);
          }
          // Update status to 'read' if not already
          if (msg.status !== 'read') {
            msg.status = 'read';
          }
          state.messages[conversationId] = [...messages];
          state.messages = { ...state.messages };
        }
      }
    },

    // Tracks message IDs that the current user has deleted for themselves.
    // Used to prevent socket from re-adding a deleted message.
    addDeletedForMeId(state, action: PayloadAction<string>) {
      const msgId = String(action.payload);
      if (!state.deletedForMeIds.includes(msgId)) {
        state.deletedForMeIds.push(msgId);
      }
    },

    // ─── Friends ─────────────────────────────────────────────────────────────
    setFriends(state, action: PayloadAction<FriendItem[]>) {
      state.friends = action.payload;
    },

    addFriend(state, action: PayloadAction<FriendItem>) {
      const exists = state.friends.find((f) => f.userId === action.payload.userId);
      if (!exists) {
        state.friends.unshift(action.payload);
      }
    },

    setSelectedFriend(state, action: PayloadAction<string | null>) {
      state.selectedFriendId = action.payload;
    },

    // ─── Groups ─────────────────────────────────────────────────────────────
    setMyGroups(
      state,
      action: PayloadAction<
        Array<{
          groupId: string;
          name: string;
          avatar_url?: string | null;
          lastMessage?: string;
          unreadCount: number;
        }>
      >
    ) {
      state.myGroups = action.payload;
    },

    addGroup(
      state,
      action: PayloadAction<{
        groupId: string;
        name: string;
        avatar_url?: string | null;
        unreadCount?: number;
      }>
    ) {
      state.myGroups.unshift({
        ...action.payload,
        unreadCount: action.payload.unreadCount ?? 0,
      });
    },

    setSelectedGroup(state, action: PayloadAction<string | null>) {
      state.selectedGroupId = action.payload;
    },

    // ─── Online Presence ─────────────────────────────────────────────────────
    setUserOnline(state, action: PayloadAction<string>) {
      state.onlineUsers[action.payload] = true;
    },

    setUserOffline(state, action: PayloadAction<string>) {
      state.onlineUsers[action.payload] = false;
    },

    // ─── Typing ─────────────────────────────────────────────────────────────
    setTypingUser(
      state,
      action: PayloadAction<{
        conversationId: string;
        userId: string;
        user_name?: string;
      }>
    ) {
      const { conversationId, userId, user_name } = action.payload;
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = [];
      }
      const exists = state.typingUsers[conversationId].find(
        (u) => u.userId === userId
      );
      if (!exists) {
        state.typingUsers[conversationId].push({ userId, user_name });
      }
    },

    removeTypingUser(
      state,
      action: PayloadAction<{ conversationId: string; userId: string }>
    ) {
      const { conversationId, userId } = action.payload;
      if (state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = state.typingUsers[conversationId].filter(
          (u) => u.userId !== userId
        );
      }
    },

    // ─── UI ─────────────────────────────────────────────────────────────────
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setLoadingMessages(state, action: PayloadAction<boolean>) {
      state.isLoadingMessages = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    clearChatError(state) {
      state.error = null;
    },
    clearChat(state) {
      return { ...initialState };
    },

    setPinnedMessages(state, action: PayloadAction<{ conversationId: string; pinnedMessages: any[] }>) {
      state.pinnedMessages[action.payload.conversationId] = action.payload.pinnedMessages;
    },
  },
});

export const {
  setConversations,
  addConversation,
  updateConversation,
  addNewConversation,
  removeConversation,
  removeConversationById,
  updateConversationMembersCount,
  setActiveConversation,
  setMessages,
  prependMessages,
  addMessage,
  addPendingMessage,
  confirmPendingMessage,
  failPendingMessage,
  setMessageFailed,
  setMessageStatus,
  updateMessageStatus,
  updateMessage,
  deleteMessage,
  setMessageRevoked,
  setFriends,
  addFriend,
  setSelectedFriend,
  setMyGroups,
  addGroup,
  setSelectedGroup,
  setUserOnline,
  setUserOffline,
  setTypingUser,
  removeTypingUser,
  setLoadingMessages,
  setSearchQuery,
  clearChatError,
  clearChat,
  setPinnedMessages,
  addReaderToMessage,
  addDeletedForMeId,
} = chatSlice.actions;

export default chatSlice.reducer;
