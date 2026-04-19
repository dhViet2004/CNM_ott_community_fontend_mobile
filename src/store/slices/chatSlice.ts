import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FriendItem } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  sender_name?: string;
  sender_avatar?: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'emoji';
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  timestamp: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isDeleted?: boolean;
  isRevoked?: boolean;
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
        state.messages[convId].push(action.payload);
      }

      // Update conversation last message
      const convIndex = state.conversations.findIndex((c) => c.id === convId);
      if (convIndex !== -1) {
        state.conversations[convIndex].lastMessage = action.payload;
        state.conversations[convIndex].updatedAt = action.payload.timestamp;
      }
    },

    addPendingMessage(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string }>
    ) {
      state.pendingMessages[action.payload.messageId] = 'sending';
    },

    confirmPendingMessage(
      state,
      action: PayloadAction<{ tempId: string; realId: string; conversationId: string }>
    ) {
      const { tempId, realId, conversationId } = action.payload;
      delete state.pendingMessages[tempId];

      const messages = state.messages[conversationId];
      if (messages) {
        const idx = messages.findIndex((m) => m.id === tempId);
        if (idx !== -1) {
          messages[idx].id = realId;
          messages[idx].status = 'sent';
        }
      }
    },

    failPendingMessage(state, action: PayloadAction<string>) {
      state.pendingMessages[action.payload] = 'failed';
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
          messages[msgIndex].status = action.payload.status;
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
          messages[msgIndex].status = action.payload.status;
        }
      }
    },

    deleteMessage(
      state,
      action: PayloadAction<{ conversationId: string; messageId: string }>
    ) {
      const messages = state.messages[action.payload.conversationId];
      if (messages) {
        const msgIndex = messages.findIndex(
          (m) => m.id === action.payload.messageId
        );
        if (msgIndex !== -1) {
          messages[msgIndex].isDeleted = true;
          messages[msgIndex].content = '';
        }
      }
    },

    setMessageRevoked(
      state,
      action: PayloadAction<{ messageId: string; conversationId: string }>
    ) {
      const { messageId, conversationId } = action.payload;
      state.revokedMessageIds.push(messageId);
      const messages = state.messages[conversationId];
      if (messages) {
        const msg = messages.find((m) => m.id === messageId);
        if (msg) {
          msg.isRevoked = true;
          msg.content = 'Tin nhắn đã bị thu hồi';
        }
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
  },
});

export const {
  setConversations,
  addConversation,
  updateConversation,
  removeConversation,
  setActiveConversation,
  setMessages,
  prependMessages,
  addMessage,
  addPendingMessage,
  confirmPendingMessage,
  failPendingMessage,
  setMessageStatus,
  updateMessageStatus,
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
} = chatSlice.actions;

export default chatSlice.reducer;
