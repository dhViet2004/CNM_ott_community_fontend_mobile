import apiClient from './client';
import type { User, FriendItem, Group, GroupMember, Channel, BackendMessage } from '@/types';

// ─── Backend Response wrapper ──────────────────────────────────────────────────
// NOTE: Backend controllers have INCONSISTENT response formats.
// Most return raw objects (no wrapper). Only some use { success, data }.
// We handle each endpoint individually.

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  token: string;
  expires_in?: number;
}

export interface RegisterResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  token: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiClient
      .post<LoginResponse>('/auth/login', { username, password })
      .then((r) => r.data),

  register: (data: {
    username: string;
    password: string;
    display_name: string;
    email?: string;
    phone_number?: string;
  }) =>
    apiClient
      .post<RegisterResponse>('/auth/register', data)
      .then((r) => r.data),

  // Backend returns: { accessToken, refreshToken, token }
  refreshToken: (refreshToken: string) =>
    apiClient
      .post<{ accessToken: string; refreshToken: string; token: string }>(
        '/auth/refresh',
        { refreshToken }
      )
      .then((r) => r.data),
};

// ─── User ─────────────────────────────────────────────────────────────────────

// Backend returns: { user } from service (no wrapper)
export const userApi = {
  getMe: () =>
    apiClient
      .get<{ user: User }>('/users/me')
      .then((r) => r.data.user),

  updateProfile: (data: {
    display_name?: string;
    email?: string;
    phone_number?: string;
    avatar_url?: string;
  }) =>
    apiClient
      .put<{ message: string; user: User }>('/users/profile', data)
      .then((r) => r.data.user),

  getUserById: (userId: string) =>
    apiClient
      .get<{ user: User }>(`/users/${userId}`)
      .then((r) => r.data.user),

  // Backend listUsers returns raw array (no wrapper)
  searchUsers: (query: string) =>
    apiClient
      .get<User[]>('/users/', { params: { search: query } })
      .then((r) => r.data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient
      .post('/users/change-password', {
        currentPassword,
        newPassword,
      })
      .then((r) => r.data),

  // OTP verification
  sendEmailOTP: (email: string) =>
    apiClient
      .post<{ message: string; channel: string; target: string; expiresIn: number }>(
        '/users/verify/email/send',
        { email }
      )
      .then((r) => r.data),

  confirmEmailOTP: (email: string, otp: string) =>
    apiClient
      .post<{ message: string }>('/users/verify/email/confirm', { email, otp })
      .then((r) => r.data),

  sendPhoneOTP: (phoneNumber: string) =>
    apiClient
      .post<{ message: string; channel: string; target: string; expiresIn: number }>(
        '/users/verify/phone/send',
        { phone: phoneNumber }
      )
      .then((r) => r.data),

  confirmPhoneOTP: (phoneNumber: string, otp: string) =>
    apiClient
      .post<{ message: string }>('/users/verify/phone/confirm', {
        phone: phoneNumber,
        otp,
      })
      .then((r) => r.data),

  // Password reset via OTP
  sendResetOTP: (identifier: string) =>
    apiClient
      .post<{ message: string }>('/users/reset-password/send', { identifier })
      .then((r) => r.data),

  resetPassword: (params: {
    identifier: string;
    type: 'email' | 'phone';
    otp: string;
    newPassword: string;
  }) =>
    apiClient
      .post<{ message: string }>('/users/reset-password', {
        identifier: params.identifier,
        type: params.type,
        otp: params.otp,
        newPassword: params.newPassword,
      })
      .then((r) => r.data),
};

// ─── Friends ─────────────────────────────────────────────────────────────────

// Backend returns: { message, data, count }
export interface PendingRequest {
  id: string;
  requestId?: string;
  friendshipId?: string;
  userId: string;
  sender_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  requested_at?: string;
  // Raw fields from backend
  sender_display_name?: string;
  sender_username?: string;
  sender_avatar_url?: string | null;
}

export const friendsApi = {
  getFriends: () =>
    apiClient
      .get<{ message: string; data: FriendItem[]; count: number }>('/friends')
      .then((r) => r.data.data.map((f) => ({
        ...f,
        // Backend returns friend_display_name, friend_username, friend_avatar_url
        // Map to display_name, username, avatar_url for internal use
        display_name: f.friend_display_name || f.display_name || '',
        username: f.friend_username || f.username || '',
        avatar_url: f.friend_avatar_url ?? f.avatar_url ?? null,
        userId: f.friend_id || f.userId,
      }))),

  // Backend expects receiverId (NOT friend_id)
  sendRequest: (receiverId: string) =>
    apiClient
      .post<{ message: string; data: unknown }>('/friends/request', {
        receiverId,
      })
      .then((r) => r.data),

  // Backend expects requestId (friendshipId from pending requests)
  acceptRequest: (requestId: string) =>
    apiClient
      .put<{ message: string }>('/friends/accept', { requestId })
      .then((r) => r.data),

  rejectRequest: (requestId: string) =>
    apiClient
      .put<{ message: string }>('/friends/reject', { requestId })
      .then((r) => r.data),

  // Same endpoint as reject — backend treats cancel the same as reject
  cancelRequest: (requestId: string) =>
    apiClient
      .put<{ message: string }>('/friends/reject', { requestId })
      .then((r) => r.data),

  getPendingRequests: () =>
    apiClient
      .get<{ message: string; data: any[]; count: number }>(
        '/friends/pending'
      )
      .then((r) => r.data.data.map((p) => ({
        ...p,
        // Backend returns sender_display_name, sender_username, sender_avatar_url
        display_name: p.sender_display_name || p.display_name || '',
        username: p.sender_username || p.username || '',
        avatar_url: p.sender_avatar_url ?? p.avatar_url ?? null,
        userId: p.sender_id || p.userId,
        requested_at: p.created_at,
      }))),
};

// ─── Groups ──────────────────────────────────────────────────────────────────

// Most group controllers return raw objects (no wrapper)
export const groupsApi = {
  createGroup: (data: {
    name: string;
    description?: string;
    is_private?: boolean;
    avatar_url?: string;
  }) =>
    apiClient
      .post<Group>('/groups', data)
      .then((r) => r.data),

  getGroups: () =>
    apiClient
      .get<Group[]>('/groups')
      .then((r) => r.data),

  getGroupById: (groupId: string) =>
    apiClient
      .get<Group>(`/groups/${groupId}`)
      .then((r) => r.data),

  // Correct endpoint: GET /groups/user/:userId
  // Backend returns avatarUrl/memberCount; map to avatar_url/member_count
  getMyGroups: (userId: string) =>
    apiClient
      .get<any[]>(`/groups/user/${userId}`)
      .then((r) => r.data.map((g) => ({
        groupId: g.groupId,
        name: g.name,
        description: g.description ?? '',
        avatar_url: g.avatarUrl ?? g.avatar_url ?? null,
        is_private: g.is_private ?? false,
        invite_code: g.invite_code ?? '',
        member_count: g.memberCount ?? g.member_count ?? 0,
        created_by: g.createdBy ?? g.created_by ?? '',
        created_at: g.createdAt ?? g.created_at ?? '',
        members: g.members,
      }))),

  getMembers: (groupId: string) =>
    apiClient
      .get<GroupMember[]>(`/groups/${groupId}/members`)
      .then((r) => r.data),

  // NOTE: ownerId is taken from JWT token, not from body
  addMember: (groupId: string, userId: string) =>
    apiClient
      .post(`/groups/${groupId}/members`, { userId })
      .then((r) => r.data),

  // NOTE: userId in body is optional (token takes priority)
  joinByCode: (inviteCode: string) =>
    apiClient
      .post<{ message: string; groupId: string; name: string }>(
        `/groups/join/${inviteCode}`
      )
      .then((r) => r.data),

  getInviteInfo: (groupId: string) =>
    apiClient
      .get<{ invite_code: string; group_name: string }>(
        `/groups/${groupId}/invite`
      )
      .then((r) => r.data),
};

// ─── Channels ────────────────────────────────────────────────────────────────

export const channelApi = {
  getChannels: (groupId: string) =>
    apiClient
      .get<Channel[]>(`/channels/group/${groupId}`)
      .then((r) => r.data),

  getChannelById: (channelId: string) =>
    apiClient
      .get<Channel>(`/channels/${channelId}`)
      .then((r) => r.data),
};

// ─── Messages ────────────────────────────────────────────────────────────────

// Backend messageController returns raw service objects
export const messageApi = {
  // GET /messages/conversations/:id → raw array
  getConversationMessages: (
    conversationId: string,
    limit = 50,
    before?: string
  ) =>
    apiClient
      .get<BackendMessage[]>(
        `/messages/conversations/${conversationId}`,
        { params: { limit, before } }
      )
      .then((r) => ({
        messages: r.data,
        has_more: r.data.length === limit,
      })),

  // GET /messages/channel/:id → raw array
  getChannelMessages: (channelId: string, limit = 50, before?: string) =>
    apiClient
      .get<BackendMessage[]>(`/messages/channel/${channelId}`, {
        params: { limit, before },
      })
      .then((r) => ({
        messages: r.data,
        has_more: r.data.length === limit,
      })),

  // POST /messages → raw message object
  // NOTE: backend uses contentType field, not `type`
  sendMessage: (
    conversationId: string,
    content: string,
    senderId: string,
    contentType: 'text' | 'sticker' | 'emoji' = 'text'
  ) =>
    apiClient
      .post<BackendMessage>('/messages', {
        conversationId,
        senderId,
        content,
        contentType,
      })
      .then((r) => r.data),

  // POST /messages/file → { message, data }
  sendFileMessage: (conversationId: string, formData: FormData) =>
    apiClient
      .post<{ message: string; data: BackendMessage }>('/messages/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data),

  // POST /messages/sticker → raw message
  sendSticker: (
    conversationId: string,
    stickerData: { stickerId: string; stickerUrl?: string; stickerPack?: string; stickerName?: string }
  ) =>
    apiClient
      .post<BackendMessage>('/messages/sticker', {
        conversationId,
        stickerData,
      })
      .then((r) => r.data),

  // POST /messages/emoji → raw message
  sendEmoji: (conversationId: string, emoji: string) =>
    apiClient
      .post<BackendMessage>('/messages/emoji', {
        conversationId,
        content: emoji,
      })
      .then((r) => r.data),

  // PUT /messages-extension/revoke → { success, message, data }
  revokeMessage: (messageId: string, conversationId: string) =>
    apiClient
      .put<{ success: boolean; message: string; data: unknown }>(
        '/messages-extension/revoke',
        { messageId, conversationId }
      )
      .then((r) => r.data),

  // DELETE /messages-extension/delete-for-me/:id/:id → { success, message, data }
  deleteForMe: (conversationId: string, messageId: string) =>
    apiClient
      .delete<{ success: boolean; message: string; data: unknown }>(
        `/messages-extension/delete-for-me/${conversationId}/${messageId}`
      )
      .then((r) => r.data),

  // POST /messages-extension/forward → { success, message, data }
  forwardMessage: (
    originalMessageId: string,
    sourceConversationId: string,
    targetConversationIds: string[]
  ) =>
    apiClient
      .post<{
        success: boolean;
        message: string;
        data: { forwardedCount: number; results: unknown[]; skipped: string[] };
      }>('/messages-extension/forward', {
        originalMessageId,
        sourceConversationId,
        targetConversationIds,
      })
      .then((r) => r.data),
};

// ─── Uploads ─────────────────────────────────────────────────────────────────

export const uploadApi = {
  getPresignedUrl: (
    fileName: string,
    fileType: string,
    folder: 'avatars' | 'media' | 'attachments' | 'covers'
  ) =>
    apiClient
      .post<{
        upload_url: string;
        file_url: string;
        expires_in: number;
      }>('/uploads/presigned-url', {
        file_name: fileName,
        file_type: fileType,
        folder,
      })
      .then((r) => r.data),

  uploadDirect: (file: { uri: string; name: string; type: string }, folder: string) => {
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as unknown as Blob);
    formData.append('folder', folder);
    return apiClient
      .post<{ file_url: string; file_name: string; file_size: number }>(
        '/uploads/direct',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      .then((r) => r.data);
  },

  getViewUrl: (fileUrl: string) =>
    apiClient
      .post<{ view_url: string; expires_in: number }>('/uploads/view-url', {
        file_url: fileUrl,
      })
      .then((r) => r.data),
};

// ─── Calls ──────────────────────────────────────────────────────────────────

export const callApi = {
  getZegoToken: (roomId: string, userName: string) =>
    apiClient
      .get<{
        token: string;
        app_id: number;
        room_id: string;
        user_id: string;
        user_name: string;
      }>('/calls/token', {
        params: { room_id: roomId, user_name: userName },
      })
      .then((r) => r.data),
};

// ─── Bot ─────────────────────────────────────────────────────────────────────

// Backend botController returns raw object (no wrapper)
export const botApi = {
  chat: (message: string, conversationId?: string) =>
    apiClient
      .post<{
        reply: string;
        conversation_id: string;
        sources?: { title: string; content: string; score: number }[];
      }>('/v1/bot/chat', { message, conversation_id: conversationId })
      .then((r) => r.data),
};

// ─── Stats ───────────────────────────────────────────────────────────────────

export const statsApi = {
  getOverview: () =>
    apiClient
      .get<{
        total_users: number;
        total_groups: number;
        total_messages: number;
        active_users_today: number;
      }>('/stats/overview')
      .then((r) => r.data),
};
