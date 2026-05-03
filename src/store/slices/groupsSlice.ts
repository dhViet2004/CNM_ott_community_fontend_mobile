/**
 * Groups Slice (Redux)
 * Converted from Web (Next.js/Zustand) to Mobile (React Native/Expo/Redux)
 * - Added async thunks for API calls with AsyncStorage support
 * - Changed: NEXT_PUBLIC_ → EXPO_PUBLIC_
 * - Maintained: endpoints, payloads, response formats
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as groupsApi from '@/features/groups/api';
import type { Group, GroupMember } from '@/types';

interface GroupsState {
  myGroups: Group[];
  allGroups: Group[];
  selectedGroup: (Group & { members?: GroupMember[] }) | null;
  groupMembers: Record<string, GroupMember[]>;
  isLoading: boolean;
  error: string | null;
}

const initialState: GroupsState = {
  myGroups: [],
  allGroups: [],
  selectedGroup: null,
  groupMembers: {},
  isLoading: false,
  error: null,
};

const normalizeMember = (member: any): GroupMember => ({
  userId: String(member.userId || member.id || ''),
  username: member.username || '',
  display_name:
    member.display_name || member.displayName || member.username || '',
  avatar_url: member.avatar_url ?? member.avatarUrl ?? null,
  role: member.role || 'MEMBER',
  joined_at: member.joined_at || member.joinedAt || null,
});

const normalizeGroup = (group: any): Group => ({
  groupId: group.groupId,
  name: group.name,
  description: group.description || '',
  avatar_url: group.avatar_url ?? group.avatarUrl ?? null,
  is_private:
    group.is_private ??
    (group.type === 'private' || group.type === 'private_community' || false),
  invite_code: group.invite_code || group.inviteCode || '',
  member_count: group.member_count ?? group.memberCount ?? 0,
  created_by: group.created_by || group.createdBy || group.ownerId || '',
  created_at: group.created_at || group.createdAt || '',
  members: Array.isArray(group.members)
    ? group.members.map(normalizeMember)
    : group.members,
});

// ─── Async Thunks ──────────────────────────────────────────────────────────

/**
 * Fetch user's own groups
 */
export const fetchMyGroupsAsync = createAsyncThunk(
  'groups/fetchMyGroups',
  async (_, { rejectWithValue }) => {
    try {
      const groups = await groupsApi.fetchMyGroups();
      return groups;
    } catch (error: any) {
      console.error('Failed to fetch my groups:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to fetch groups'
      );
    }
  }
);

/**
 * Fetch all public groups
 */
export const fetchAllGroupsAsync = createAsyncThunk(
  'groups/fetchAllGroups',
  async (_, { rejectWithValue }) => {
    try {
      const groups = await groupsApi.fetchAllGroups();
      return groups;
    } catch (error: any) {
      console.error('Failed to fetch all groups:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to fetch groups'
      );
    }
  }
);

/**
 * Fetch group details by ID
 */
export const fetchGroupByIdAsync = createAsyncThunk(
  'groups/fetchGroupById',
  async (groupId: string | number, { rejectWithValue }) => {
    try {
      const groupDetail = await groupsApi.fetchGroupById(groupId);
      return groupDetail;
    } catch (error: any) {
      console.error('Failed to fetch group details:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to fetch group details'
      );
    }
  }
);

/**
 * Create a new group
 */
export const createGroupAsync = createAsyncThunk(
  'groups/createGroup',
  async (
    payload: groupsApi.CreateGroupPayload,
    { rejectWithValue }
  ) => {
    try {
      const newGroup = await groupsApi.createGroup(payload);
      return newGroup;
    } catch (error: any) {
      console.error('Failed to create group:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to create group'
      );
    }
  }
);

/**
 * Join group by invite code
 */
export const joinGroupByCodeAsync = createAsyncThunk(
  'groups/joinGroupByCode',
  async (inviteCode: string, { rejectWithValue }) => {
    try {
      const result = await groupsApi.joinGroupByCode(inviteCode);
      return result.group;
    } catch (error: any) {
      console.error('Failed to join group:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to join group'
      );
    }
  }
);

/**
 * Fetch group members
 */
export const fetchGroupMembersAsync = createAsyncThunk(
  'groups/fetchMembers',
  async (groupId: string | number, { rejectWithValue }) => {
    try {
      const members = await groupsApi.getGroupMembers(groupId);
      return { groupId: String(groupId), members };
    } catch (error: any) {
      console.error('Failed to fetch group members:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to fetch members'
      );
    }
  }
);

/**
 * Add members to group
 */
export const addMembersAsync = createAsyncThunk(
  'groups/addMembers',
  async (
    { groupId, userIds }: { groupId: string | number; userIds: (string | number)[] },
    { rejectWithValue }
  ) => {
    try {
      const result = await groupsApi.addMembersToGroup(groupId, userIds);
      return { groupId, result };
    } catch (error: any) {
      console.error('Failed to add members:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to add members'
      );
    }
  }
);

/**
 * Remove member from group
 */
export const removeMemberAsync = createAsyncThunk(
  'groups/removeMember',
  async (
    { groupId, targetUserId }: { groupId: string | number; targetUserId: string | number },
    { rejectWithValue }
  ) => {
    try {
      await groupsApi.removeMemberFromGroup(groupId, targetUserId);
      return { groupId: String(groupId), targetUserId: String(targetUserId) };
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to remove member'
      );
    }
  }
);

/**
 * Update member role
 */
export const updateMemberRoleAsync = createAsyncThunk(
  'groups/updateRole',
  async (
    {
      groupId,
      targetUserId,
      newRole,
    }: { groupId: string | number; targetUserId: string | number; newRole: string },
    { rejectWithValue }
  ) => {
    try {
      await groupsApi.updateMemberRole(groupId, targetUserId, newRole);
      return { groupId: String(groupId), targetUserId: String(targetUserId), newRole };
    } catch (error: any) {
      console.error('Failed to update member role:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to update member role'
      );
    }
  }
);

/**
 * Leave group
 */
export const leaveGroupAsync = createAsyncThunk(
  'groups/leaveGroup',
  async (
    { groupId, newOwnerId }: { groupId: string | number; newOwnerId?: string | number },
    { rejectWithValue }
  ) => {
    try {
      await groupsApi.leaveGroup(groupId, newOwnerId);
      return groupId;
    } catch (error: any) {
      console.error('Failed to leave group:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to leave group'
      );
    }
  }
);

/**
 * Disband group
 */
export const disbandGroupAsync = createAsyncThunk(
  'groups/disbandGroup',
  async (groupId: string | number, { rejectWithValue }) => {
    try {
      await groupsApi.disbandGroup(groupId);
      return groupId;
    } catch (error: any) {
      console.error('Failed to disband group:', error);
      return rejectWithValue(
        error?.response?.data?.message || 'Failed to disband group'
      );
    }
  }
);

/**
 * Approve/Reject join request
 */
export const handleJoinRequestAsync = createAsyncThunk(
  'groups/handleJoinRequest',
  async (
    {
      groupId,
      userId,
      action,
    }: { groupId: string | number; userId: string | number; action: 'APPROVE' | 'REJECT' },
    { rejectWithValue }
  ) => {
    try {
      await groupsApi.handleJoinRequest(groupId, userId, action);
      return { groupId, userId, action };
    } catch (error: any) {
      console.error(`Failed to ${action} request:`, error);
      return rejectWithValue(
        error?.response?.data?.message || `Failed to ${action} request`
      );
    }
  }
);

// ─── Slice ─────────────────────────────────────────────────────────────────

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    // Synchronous reducers
    setMyGroups(state, action: PayloadAction<Group[]>) {
      state.myGroups = action.payload;
    },
    setAllGroups(state, action: PayloadAction<Group[]>) {
      state.allGroups = action.payload;
    },
    addGroup(state, action: PayloadAction<Group>) {
      const exists = state.myGroups.find(
        (g) => String(g.groupId) === String(action.payload.groupId)
      );
      if (!exists) {
        // Normalize field names từ backend (camelCase) sang interface (snake_case)
        const raw = action.payload;
        const normalized: Group = {
          groupId: String(raw.groupId || raw.id || ''),
          name: raw.name || '',
          description: raw.description || '',
          avatar_url: raw.avatar_url ?? raw.avatarUrl ?? null,
          is_private: raw.is_private ?? false,
          invite_code: raw.invite_code || raw.inviteCode || '',
          member_count: raw.member_count ?? raw.memberCount ?? 0,
          created_by: raw.created_by ?? raw.createdBy ?? '',
          created_at: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
          members: raw.members,
        };
        state.myGroups.unshift(normalized);
      }
    },
    updateGroup(state, action: PayloadAction<Group>) {
      const idx = state.myGroups.findIndex(
        (g) => String(g.groupId) === String(action.payload.groupId)
      );
      if (idx !== -1) state.myGroups[idx] = action.payload;
    },
    removeGroup(state, action: PayloadAction<string | number>) {
      state.myGroups = state.myGroups.filter(
        (g) => String(g.groupId) !== String(action.payload)
      );
      if (
        state.selectedGroup &&
        String(state.selectedGroup.groupId) === String(action.payload)
      ) {
        state.selectedGroup = null;
      }
    },
    setSelectedGroup(state, action: PayloadAction<(Group & { members?: GroupMember[] }) | null>) {
      state.selectedGroup = action.payload;
    },
    setGroupMembers(
      state,
      action: PayloadAction<{ groupId: string; members: GroupMember[] }>
    ) {
      // Normalize members from backend (camelCase) to mobile format (snake_case)
      const normalizedMembers = action.payload.members.map((m: any) => ({
        userId: m.userId || m.id,
        username: m.username || '',
        display_name: m.displayName || m.display_name || m.username || '',
        avatar_url: m.avatarUrl ?? m.avatar_url ?? null,
        role: m.role || 'MEMBER',
        joined_at: m.joinedAt || m.joined_at || null,
      }));
      state.groupMembers[action.payload.groupId] = normalizedMembers as GroupMember[];
      
      // Also update selectedGroup if it matches
      if (
        state.selectedGroup &&
        String(state.selectedGroup.groupId) === String(action.payload.groupId)
      ) {
        state.selectedGroup.members = normalizedMembers;
      }
    },
    addMemberToGroup(
      state,
      action: PayloadAction<{ groupId: string; member: GroupMember }>
    ) {
      const { groupId, member } = action.payload;
      if (!state.groupMembers[groupId]) {
        state.groupMembers[groupId] = [];
      }
      const exists = state.groupMembers[groupId].find(
        (m) => m.userId === member.userId
      );
      if (!exists) {
        state.groupMembers[groupId].push(member);
      }
      
      // Also add to selectedGroup if it matches
      if (
        state.selectedGroup &&
        String(state.selectedGroup.groupId) === String(groupId)
      ) {
        if (!state.selectedGroup.members) {
          state.selectedGroup.members = [];
        }
        const existsInSelected = state.selectedGroup.members.find(
          (m) => m.userId === member.userId
        );
        if (!existsInSelected) {
          state.selectedGroup.members.push(member);
        }
      }
    },
    removeMemberFromSelectedGroup(state, action: PayloadAction<string>) {
      const userId = action.payload;
      if (state.selectedGroup?.members) {
        state.selectedGroup.members = state.selectedGroup.members.filter(
          (m) => m.userId !== userId
        );
      }
    },
    updateMemberRoleInGroup(
      state,
      action: PayloadAction<{ userId: string; newRole: string }>
    ) {
      const { userId, newRole } = action.payload;
      if (state.selectedGroup?.members) {
        const member = state.selectedGroup.members.find((m) => m.userId === userId);
        if (member) {
          member.role = newRole as any;
        }
      }
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    clearGroups(state) {
      return { ...initialState };
    },

    // ─── Socket Event Reducers ─────────────────────────────────────────────────
    /** Nhiệm vụ 2: Thêm thành viên mới qua socket (dùng khi có group:members_added) */
    socketAddMember(
      state,
      action: PayloadAction<{ groupId: string; member: any }>
    ) {
      const { groupId, member } = action.payload;
      const gIdStr = String(groupId);

      if (!state.groupMembers[gIdStr]) {
        state.groupMembers[gIdStr] = [];
      }
      const exists = state.groupMembers[gIdStr].find(
        (m) => String(m.userId) === String(member.userId || member.id)
      );
      if (!exists) {
        state.groupMembers[gIdStr].push({
          userId: String(member.userId || member.id || ''),
          username: member.username || '',
          display_name: member.display_name || member.displayName || member.username || '',
          avatar_url: member.avatar_url ?? member.avatarUrl ?? null,
          role: member.role || 'MEMBER',
          joined_at: member.joined_at || member.joinedAt || new Date().toISOString(),
        });
      }

      // Also add to selectedGroup if it matches
      if (
        state.selectedGroup &&
        String(state.selectedGroup.groupId) === gIdStr
      ) {
        if (!state.selectedGroup.members) {
          state.selectedGroup.members = [];
        }
        const existsInSelected = state.selectedGroup.members.find(
          (m) => String(m.userId) === String(member.userId || member.id)
        );
        if (!existsInSelected) {
          state.selectedGroup.members.push({
            userId: String(member.userId || member.id || ''),
            username: member.username || '',
            display_name: member.display_name || member.displayName || member.username || '',
            avatar_url: member.avatar_url ?? member.avatarUrl ?? null,
            role: member.role || 'MEMBER',
            joined_at: member.joined_at || member.joinedAt || new Date().toISOString(),
          });
        }
      }
    },

    /** Nhiệm vụ 2: Xóa thành viên qua socket (dùng khi có group:member_removed hoặc group:member_left) */
    socketRemoveMember(
      state,
      action: PayloadAction<{ groupId: string; userId: string }>
    ) {
      const { groupId, userId } = action.payload;
      const gIdStr = String(groupId);

      if (state.groupMembers[gIdStr]) {
        state.groupMembers[gIdStr] = state.groupMembers[gIdStr].filter(
          (m) => String(m.userId) !== String(userId)
        );
      }

      if (
        state.selectedGroup &&
        String(state.selectedGroup.groupId) === gIdStr &&
        state.selectedGroup.members
      ) {
        state.selectedGroup.members = state.selectedGroup.members.filter(
          (m) => String(m.userId) !== String(userId)
        );
      }
    },

    /** Nhiệm vụ 2: Cập nhật vai trò thành viên qua socket */
    socketUpdateRole(
      state,
      action: PayloadAction<{ groupId: string; userId: string; newRole: string }>
    ) {
      const { groupId, userId, newRole } = action.payload;
      const gIdStr = String(groupId);

      if (state.groupMembers[gIdStr]) {
        const member = state.groupMembers[gIdStr].find(
          (m) => String(m.userId) === String(userId)
        );
        if (member) {
          member.role = newRole as any;
        }
      }

      if (
        state.selectedGroup &&
        String(state.selectedGroup.groupId) === gIdStr &&
        state.selectedGroup.members
      ) {
        const member = state.selectedGroup.members.find(
          (m) => String(m.userId) === String(userId)
        );
        if (member) {
          member.role = newRole as any;
        }
      }
    },

    /** Nhiệm vụ 2: Reload members khi nhận socket event */
    socketReloadMembers(
      state,
      action: PayloadAction<{ groupId: string; members: any[] }>
    ) {
      const { groupId, members } = action.payload;
      const gIdStr = String(groupId);
      state.groupMembers[gIdStr] = members.map((m: any) => ({
        userId: String(m.userId || m.id || ''),
        username: m.username || '',
        display_name: m.display_name || m.displayName || m.username || '',
        avatar_url: m.avatar_url ?? m.avatarUrl ?? null,
        role: m.role || 'MEMBER',
        joined_at: m.joined_at || m.joinedAt || null,
      }));

      if (
        state.selectedGroup &&
        String(state.selectedGroup.groupId) === gIdStr
      ) {
        state.selectedGroup.members = state.groupMembers[gIdStr];
      }
    },
  },
  extraReducers: (builder) => {
    // fetchMyGroupsAsync
    builder
      .addCase(fetchMyGroupsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyGroupsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myGroups = action.payload.map(normalizeGroup);
      })
      .addCase(fetchMyGroupsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchAllGroupsAsync
    builder
      .addCase(fetchAllGroupsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAllGroupsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.allGroups = action.payload.map(normalizeGroup);
      })
      .addCase(fetchAllGroupsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchGroupByIdAsync
    builder
      .addCase(fetchGroupByIdAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroupByIdAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedGroup = normalizeGroup(action.payload) as any;
      })
      .addCase(fetchGroupByIdAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // createGroupAsync
    builder
      .addCase(createGroupAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createGroupAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myGroups.unshift(normalizeGroup(action.payload));
      })
      .addCase(createGroupAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // joinGroupByCodeAsync
    builder
      .addCase(joinGroupByCodeAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(joinGroupByCodeAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload) {
          state.myGroups.unshift(normalizeGroup(action.payload));
        }
      })
      .addCase(joinGroupByCodeAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // fetchGroupMembersAsync
    builder
      .addCase(fetchGroupMembersAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchGroupMembersAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const { groupId, members } = action.payload;
        state.groupMembers[groupId] = members.map(normalizeMember);
        if (
          state.selectedGroup &&
          String(state.selectedGroup.groupId) === groupId
        ) {
          state.selectedGroup.members = members.map(normalizeMember);
        }
      })
      .addCase(fetchGroupMembersAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // addMembersAsync
    builder
      .addCase(addMembersAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(addMembersAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const { groupId, result } = action.payload;
        if (result.addedMembers) {
          if (!state.groupMembers[String(groupId)]) {
            state.groupMembers[String(groupId)] = [];
          }
          const currentMembers = state.groupMembers[String(groupId)];
          const newMembers = result.addedMembers.map(normalizeMember).filter(
            (nm: any) =>
              !currentMembers.some(
                (cm) => String(cm.userId) === String(nm.userId)
              )
          );
          state.groupMembers[String(groupId)].push(...newMembers);
          
          if (
            state.selectedGroup &&
            String(state.selectedGroup.groupId) === String(groupId)
          ) {
            if (!state.selectedGroup.members) {
              state.selectedGroup.members = [];
            }
            state.selectedGroup.members.push(...newMembers);
          }
        }
      })
      .addCase(addMembersAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // removeMemberAsync
    builder
      .addCase(removeMemberAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(removeMemberAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const { groupId, targetUserId } = action.payload;
        const gIdStr = String(groupId);
        if (state.groupMembers[gIdStr]) {
          state.groupMembers[gIdStr] = state.groupMembers[gIdStr].filter(
            (m) => String(m.userId) !== targetUserId
          );
        }
        if (
          state.selectedGroup &&
          String(state.selectedGroup.groupId) === gIdStr &&
          state.selectedGroup.members
        ) {
          state.selectedGroup.members = state.selectedGroup.members.filter(
            (m) => String(m.userId) !== targetUserId
          );
        }
      })
      .addCase(removeMemberAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // updateMemberRoleAsync
    builder
      .addCase(updateMemberRoleAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateMemberRoleAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const { groupId, targetUserId, newRole } = action.payload;
        const gIdStr = String(groupId);
        if (state.groupMembers[gIdStr]) {
          const member = state.groupMembers[gIdStr].find(
            (m) => String(m.userId) === targetUserId
          );
          if (member) {
            member.role = newRole as any;
          }
        }
        if (
          state.selectedGroup &&
          String(state.selectedGroup.groupId) === gIdStr &&
          state.selectedGroup.members
        ) {
          const member = state.selectedGroup.members.find(
            (m) => String(m.userId) === targetUserId
          );
          if (member) {
            member.role = newRole as any;
          }
        }
      })
      .addCase(updateMemberRoleAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // leaveGroupAsync
    builder
      .addCase(leaveGroupAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(leaveGroupAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const groupId = String(action.payload);
        state.myGroups = state.myGroups.filter(
          (g) => String(g.groupId) !== groupId
        );
        if (
          state.selectedGroup &&
          String(state.selectedGroup.groupId) === groupId
        ) {
          state.selectedGroup = null;
        }
      })
      .addCase(leaveGroupAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // disbandGroupAsync
    builder
      .addCase(disbandGroupAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(disbandGroupAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const groupId = String(action.payload);
        state.myGroups = state.myGroups.filter(
          (g) => String(g.groupId) !== groupId
        );
        if (
          state.selectedGroup &&
          String(state.selectedGroup.groupId) === groupId
        ) {
          state.selectedGroup = null;
        }
      })
      .addCase(disbandGroupAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // handleJoinRequestAsync
    builder
      .addCase(handleJoinRequestAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(handleJoinRequestAsync.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(handleJoinRequestAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  setMyGroups,
  setAllGroups,
  addGroup,
  updateGroup,
  removeGroup,
  setSelectedGroup,
  setGroupMembers,
  addMemberToGroup,
  removeMemberFromSelectedGroup,
  updateMemberRoleInGroup,
  socketAddMember,
  socketRemoveMember,
  socketUpdateRole,
  socketReloadMembers,
  setLoading,
  setError,
  clearError,
  clearGroups,
} = groupsSlice.actions;

export default groupsSlice.reducer;
