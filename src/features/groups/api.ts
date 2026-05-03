/**
 * Groups API Layer
 * Converted from Web (Next.js/Zustand) to Mobile (React Native/Expo/Redux)
 * - Changed: sessionStorage → AsyncStorage
 * - Changed: NEXT_PUBLIC_ → EXPO_PUBLIC_
 * - Maintained: endpoints, payloads, response formats
 */

import apiClient from '@/api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Group, GroupMember } from '@/types';

// ─── Helper Functions ──────────────────────────────────────────────────────

/**
 * Get current user ID from AsyncStorage
 * Replaces web's sessionStorage-based getUserId()
 */
export async function getUserIdFromStorage(): Promise<string | null> {
  try {
    const candidates = ['ott_auth_user', '@ott_auth_user'];
    for (const key of candidates) {
      const authUserStr = await AsyncStorage.getItem(key);
      if (!authUserStr) continue;
      const authUser = JSON.parse(authUserStr);
      const resolvedUserId = authUser?.id || authUser?.userId || authUser?.user_id;
      if (resolvedUserId) {
        return String(resolvedUserId);
      }
    }

    // Fallback: resolve from authenticated profile if user cache key is missing.
    const meResponse = await apiClient.get('/users/me');
    const me = meResponse?.data;
    const resolvedUserId = me?.id || me?.userId || me?.user_id;
    if (resolvedUserId) {
      await AsyncStorage.setItem('ott_auth_user', JSON.stringify(me));
      return String(resolvedUserId);
    }
  } catch (error) {
    console.error('Error retrieving user ID from AsyncStorage:', error);
  }
  return null;
}

/**
 * Store current user info in AsyncStorage
 */
export async function setAuthUserStorage(user: any): Promise<void> {
  try {
    await AsyncStorage.setItem('ott_auth_user', JSON.stringify(user));
  } catch (error) {
    console.error('Error storing user in AsyncStorage:', error);
  }
}

// ─── Type Definitions ──────────────────────────────────────────────────────

export interface CreateGroupPayload {
  name: string;
  description?: string;
  type?: string;
  allowSendLinks?: string;
  spamFilterLevel?: number;
}

export interface JoinGroupPayload {
  userId?: string | number;
}

export interface GroupsResponse {
  message?: string;
  data?: Group[];
  count?: number;
}

export interface GroupDetailResponse {
  groupId: string | number;
  name: string;
  description?: string;
  topic?: string;
  inviteCode?: string;
  ownerId?: string;
  memberCount?: number;
  createdAt?: string;
  members?: Array<{
    userId: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    role: string;
  }>;
}

export interface InviteInfo {
  groupId: string | number;
  inviteCode: string;
  inviteLink: string;
  expiresAt?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Tạo nhóm mới
 * POST /groups
 * Header: Authorization: Bearer <token> (userId tự động lấy từ token)
 */
export async function createGroup(
  payload: CreateGroupPayload
): Promise<Group> {
  const response = await apiClient.post<Group>('/groups', payload);
  return response.data;
}

/**
 * Lấy danh sách tất cả nhóm (không cần auth)
 * GET /groups
 */
export async function fetchAllGroups(): Promise<Group[]> {
  const response = await apiClient.get<Group[]>('/groups');
  return response.data;
}

/**
 * Lấy chi tiết một nhóm
 * GET /groups/:groupId
 */
export async function fetchGroupById(
  groupId: string | number
): Promise<GroupDetailResponse> {
  const response = await apiClient.get<GroupDetailResponse>(
    `/groups/${groupId}`
  );
  return response.data;
}

/**
 * Lấy danh sách nhóm của tôi
 * GET /groups/user/:userId
 * userId được lấy tự động từ AsyncStorage (thay vì sessionStorage)
 */
export async function fetchMyGroups(): Promise<Group[]> {
  const userId = await getUserIdFromStorage();
  if (!userId) {
    return [];
  }
  const response = await apiClient.get<GroupsResponse>(`/groups/user/${userId}`);
  if (response.data?.data) {
    return response.data.data;
  }
  if (Array.isArray(response.data)) {
    return response.data as Group[];
  }
  return [];
}

/**
 * Tham gia nhóm bằng mã mời
 * POST /groups/join/:inviteCode
 * Header: Authorization: Bearer <token> (userId tự động lấy từ token)
 */
export async function joinGroupByCode(
  inviteCode: string
): Promise<{ message: string; group?: Group }> {
  const encodedCode = encodeURIComponent(inviteCode);
  const userId = await getUserIdFromStorage();

  const response = await apiClient.post<{ message: string; group?: Group }>(
    `/groups/join/${encodedCode}`,
    { userId }
  );
  return response.data;
}

/**
 * Lấy mã mời của nhóm
 * GET /groups/:groupId/invite
 * Header: Authorization: Bearer <token>
 */
export async function fetchGroupInvite(
  groupId: string | number
): Promise<InviteInfo> {
  const response = await apiClient.get<InviteInfo>(
    `/groups/${groupId}/invite`
  );
  return response.data;
}

/**
 * Thêm thành viên vào nhóm
 * POST /groups/:groupId/members
 */
export async function addMemberToGroup(
  groupId: string | number,
  userId: string | number,
  role: string = 'member'
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>(
    `/groups/${groupId}/members`,
    { userId, role }
  );
  return response.data;
}

/**
 * Thêm nhiều thành viên vào nhóm
 * POST /groups/:groupId/members
 */
export async function addMembersToGroup(
  groupId: string | number,
  userIds: (string | number)[]
): Promise<any> {
  const response = await apiClient.post(
    `/groups/${groupId}/members`,
    { userIds }
  );
  return response.data;
}

/**
 * Xóa thành viên khỏi nhóm
 * DELETE /groups/:groupId/members/:userId
 */
export async function removeMemberFromGroup(
  groupId: string | number,
  targetUserId: string | number,
): Promise<any> {
  const gId = String(groupId || '').trim();
  const uId = String(targetUserId || '').trim();

  if (!gId) {
    throw new Error('groupId không được rỗng khi xóa thành viên');
  }
  if (!uId) {
    throw new Error('targetUserId không được rỗng khi xóa thành viên');
  }

  console.log(`[removeMemberFromGroup] DELETE /groups/${gId}/members/${uId}`);
  const response = await apiClient.delete(
    `/groups/${gId}/members/${uId}`,
  );
  return response.data;
}

/**
 * Cập nhật vai trò thành viên
 * PATCH /groups/:groupId/members/:targetUserId/role
 */
export async function updateMemberRole(
  groupId: string | number,
  targetUserId: string | number,
  newRole: string
): Promise<any> {
  const response = await apiClient.patch(
    `/groups/${groupId}/members/${targetUserId}/role`,
    { role: newRole }
  );
  return response.data;
}

/**
 * Rời nhóm
 * DELETE /groups/:groupId/leave
 */
export async function leaveGroup(
  groupId: string | number,
  newOwnerId?: string | number
): Promise<any> {
  const response = await apiClient.delete(
    `/groups/${groupId}/leave`,
    { data: { newOwnerId } }
  );
  return response.data;
}

/**
 * Giải tán nhóm
 * DELETE /groups/:groupId/disband
 */
export async function disbandGroup(groupId: string | number): Promise<any> {
  const response = await apiClient.delete(`/groups/${groupId}/disband`);
  return response.data;
}

/**
 * Lấy danh sách thành viên trong nhóm
 * GET /groups/:groupId/members
 */
export async function getGroupMembers(
  groupId: string | number
): Promise<GroupMember[]> {
  const response = await apiClient.get<GroupMember[]>(
    `/groups/${String(groupId || '').trim()}/members`
  );
  return response.data;
}

/**
 * Lấy danh sách yêu cầu tham gia nhóm đang chờ xử lý
 * GET /groups/:groupId/requests
 */
export async function fetchPendingRequests(
  groupId: string | number
): Promise<any[]> {
  const response = await apiClient.get(`/groups/${groupId}/requests`);
  return response.data;
}

/**
 * Xử lý yêu cầu tham gia nhóm (phê duyệt/từ chối)
 * PATCH /groups/:groupId/requests/:userId
 */
export async function handleJoinRequest(
  groupId: string | number,
  userId: string | number,
  action: 'APPROVE' | 'REJECT'
): Promise<{ message: string }> {
  const response = await apiClient.patch(
    `/groups/${groupId}/requests/${userId}`,
    { action }
  );
  return response.data;
}

/**
 * Cập nhật cài đặt nhóm
 * PATCH /groups/:groupId/settings
 */
export async function updateGroupSettings(
  groupId: string | number,
  settings: {
    isApprovalRequired?: boolean;
    allowSendLinks?: string;
    spamFilterLevel?: number;
  }
): Promise<{ message: string }> {
  const response = await apiClient.patch(
    `/groups/${groupId}/settings`,
    settings
  );
  return response.data;
}
