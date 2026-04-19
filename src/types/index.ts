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

export interface FriendItem {
  userId: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  status: string;
  friendship_status: string;
  friends_since?: string;
  isOnline?: boolean;
}

export interface PendingRequest {
  userId: string;
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

export interface BackendMessage {
  messageId: string;
  id?: string;
  conversationId: string;
  senderId: string;
  sender_name?: string;
  sender_avatar?: string | null;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker' | 'emoji';
  content: string;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  is_revoked?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  created_at: string;
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
