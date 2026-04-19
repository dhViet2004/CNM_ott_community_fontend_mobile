/**
 * Shared type definitions used across the app.
 * Import from here to avoid circular dependencies between slices and API modules.
 */

export interface User {
  userId: string;
  id?: number;
  username: string;
  display_name: string;
  email?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
  status?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  coverImage?: string;
}

// Backend getFriends returns: { friendshipId, friend_id, status, friend_display_name, friend_username, friend_avatar_url }
export interface FriendItem {
  friendshipId: string;
  friend_id: string;
  userId: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
  friendship_status: string;
  friends_since?: string;
  isOnline?: boolean;
  // Raw fields from backend
  friend_display_name?: string;
  friend_username?: string;
  friend_avatar_url?: string | null;
}

// Backend getPendingRequests returns: { id: friendshipId, sender_id, ... }
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
}

export interface Group {
  groupId: string;
  name: string;
  description: string;
  avatar_url: string | null;
  is_private: boolean;
  invite_code: string;
  member_count: number;
  created_by: string;
  created_at: string;
  members?: GroupMember[];
}

export interface GroupMember {
  userId: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: 'OWNER' | 'DEPUTY' | 'MEMBER';
  joined_at: string;
}

export interface Channel {
  channelId: string;
  groupId: string;
  name: string;
  description: string | null;
  type: 'text' | 'video';
  created_at: string;
}

// Backend returns messages with `id` (number), `contentType`, `createdAt`
// Frontend maps: id → messageId, contentType → type
export interface BackendMessage {
  // Backend uses `id` (number), we map to `messageId` (string) on the frontend
  id: number;
  messageId?: string;
  conversationId: string;
  senderId: string;
  sender_name?: string;
  sender_avatar?: string | null;
  // Backend uses contentType; frontend maps to `type`
  contentType?: string;
  type?: string;
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  stickerData?: {
    stickerId?: string;
    stickerUrl?: string;
    stickerPack?: string;
    stickerName?: string;
  };
  attachments?: Array<{
    url: string;
    type: string;
    size: number;
  }>;
  is_revoked?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt?: string;
  created_at?: string;
}

export type { RootStackParamList, MainTabParamList, RootStackScreenProps, MainTabScreenProps } from '@navigation/types';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
  page?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
