/**
 * Custom Hooks for Groups Management
 * Converted from Web (Next.js/Zustand) to Mobile (React Native/Expo/Redux)
 * - Uses Redux dispatch instead of Zustand store
 * - Uses AsyncStorage for persistence
 * - Maintains same API contracts for consistency
 */

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store/store';
import {
  fetchMyGroupsAsync,
  fetchAllGroupsAsync,
  fetchGroupByIdAsync,
  createGroupAsync,
  joinGroupByCodeAsync,
  fetchGroupMembersAsync,
  addMembersAsync,
  removeMemberAsync,
  updateMemberRoleAsync,
  leaveGroupAsync,
  disbandGroupAsync,
  handleJoinRequestAsync,
  setSelectedGroup,
  removeGroup,
  clearError,
} from '@/store/slices/groupsSlice';
import * as groupsApi from '../api';
import type { CreateGroupPayload } from '../api';

/**
 * Hook for accessing groups state
 */
export const useGroupsState = () => {
  return useSelector((state: RootState) => state.groups);
};

/**
 * Hook for accessing my groups only
 */
export const useMyGroups = () => {
  return useSelector((state: RootState) => state.groups.myGroups);
};

/**
 * Hook for accessing all public groups
 */
export const useAllGroups = () => {
  return useSelector((state: RootState) => state.groups.allGroups);
};

/**
 * Hook for accessing selected group
 */
export const useSelectedGroup = () => {
  return useSelector((state: RootState) => state.groups.selectedGroup);
};

/**
 * Hook for accessing group members
 */
export const useGroupMembers = (groupId: string | number) => {
  return useSelector((state: RootState) => state.groups.groupMembers[String(groupId)] || []);
};

/**
 * Hook for accessing loading and error states
 */
export const useGroupsLoading = () => {
  return useSelector((state: RootState) => ({
    isLoading: state.groups.isLoading,
    error: state.groups.error,
  }));
};

/**
 * Hook for fetching my groups
 */
export const useFetchMyGroups = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(async () => {
    try {
      await dispatch(fetchMyGroupsAsync()).unwrap();
    } catch (error) {
      console.error('Error fetching my groups:', error);
      throw error;
    }
  }, [dispatch]);
};

/**
 * Hook for fetching all public groups
 */
export const useFetchAllGroups = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(async () => {
    try {
      await dispatch(fetchAllGroupsAsync()).unwrap();
    } catch (error) {
      console.error('Error fetching all groups:', error);
      throw error;
    }
  }, [dispatch]);
};

/**
 * Hook for fetching a group by ID
 */
export const useFetchGroupById = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (groupId: string | number) => {
      try {
        await dispatch(fetchGroupByIdAsync(groupId)).unwrap();
      } catch (error) {
        console.error('Error fetching group:', error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for creating a new group
 */
export const useCreateGroup = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (payload: CreateGroupPayload) => {
      try {
        const result = await dispatch(createGroupAsync(payload)).unwrap();
        return result;
      } catch (error) {
        console.error('Error creating group:', error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for joining group by invite code
 */
export const useJoinGroupByCode = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (inviteCode: string) => {
      try {
        const result = await dispatch(joinGroupByCodeAsync(inviteCode)).unwrap();
        return result;
      } catch (error) {
        console.error('Error joining group:', error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for fetching group members
 */
export const useFetchGroupMembers = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (groupId: string | number) => {
      try {
        await dispatch(fetchGroupMembersAsync(groupId)).unwrap();
      } catch (error) {
        console.error('Error fetching group members:', error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for adding members to a group
 */
export const useAddMembers = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (groupId: string | number, userIds: (string | number)[]) => {
      try {
        await dispatch(addMembersAsync({ groupId, userIds })).unwrap();
      } catch (error) {
        console.error('Error adding members:', error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for removing a member from a group
 */
export const useRemoveMember = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (groupId: string | number, targetUserId: string | number) => {
      try {
        await dispatch(
          removeMemberAsync({ groupId, targetUserId })
        ).unwrap();
      } catch (error) {
        console.error('Error removing member:', error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for updating member role
 */
export const useUpdateMemberRole = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (
      groupId: string | number,
      targetUserId: string | number,
      newRole: string
    ) => {
      try {
        await dispatch(
          updateMemberRoleAsync({ groupId, targetUserId, newRole })
        ).unwrap();
      } catch (error) {
        console.error('Error updating member role:', error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for leaving a group
 */
export const useLeaveGroup = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (groupId: string | number, newOwnerId?: string | number) => {
      try {
        await dispatch(
          leaveGroupAsync({ groupId, newOwnerId })
        ).unwrap();
      } catch (error) {
        console.error('Error leaving group:', error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for disbanding a group
 */
export const useDisbandGroup = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (groupId: string | number) => {
      try {
        await dispatch(disbandGroupAsync(groupId)).unwrap();
      } catch (error) {
        console.error('Error disbanding group:', error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for handling join requests (approve/reject)
 */
export const useHandleJoinRequest = () => {
  const dispatch = useDispatch<AppDispatch>();
  
  return useCallback(
    async (
      groupId: string | number,
      userId: string | number,
      action: 'APPROVE' | 'REJECT'
    ) => {
      try {
        await dispatch(
          handleJoinRequestAsync({ groupId, userId, action })
        ).unwrap();
      } catch (error) {
        console.error(`Error ${action} join request:`, error);
        throw error;
      }
    },
    [dispatch]
  );
};

/**
 * Hook for selecting a group and optionally loading its members
 */
export const useSelectGroup = () => {
  const dispatch = useDispatch<AppDispatch>();
  const fetchMembers = useFetchGroupMembers();
  
  return useCallback(
    async (group: any, loadMembers = true) => {
      dispatch(setSelectedGroup(group));
      if (loadMembers && group?.groupId) {
        try {
          await fetchMembers(group.groupId);
        } catch (error) {
          console.error('Error loading group members:', error);
        }
      }
    },
    [dispatch, fetchMembers]
  );
};

/**
 * Hook for clearing selected group
 */
export const useClearSelectedGroup = () => {
  const dispatch = useDispatch();
  
  return useCallback(() => {
    dispatch(setSelectedGroup(null));
  }, [dispatch]);
};

/**
 * Hook for removing a group locally
 */
export const useRemoveGroupLocal = () => {
  const dispatch = useDispatch();
  
  return useCallback((groupId: string | number) => {
    dispatch(removeGroup(groupId));
  }, [dispatch]);
};

/**
 * Hook for clearing error message
 */
export const useClearGroupError = () => {
  const dispatch = useDispatch();
  
  return useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);
};

/**
 * Hook for fetching group invite code
 */
export const useFetchGroupInvite = () => {
  return useCallback(
    async (groupId: string | number) => {
      try {
        const inviteInfo = await groupsApi.fetchGroupInvite(groupId);
        return inviteInfo;
      } catch (error) {
        console.error('Error fetching group invite:', error);
        throw error;
      }
    },
    []
  );
};

/**
 * Hook for fetching pending requests for a group
 */
export const useFetchPendingRequests = () => {
  return useCallback(
    async (groupId: string | number) => {
      try {
        const requests = await groupsApi.fetchPendingRequests(groupId);
        return requests;
      } catch (error) {
        console.error('Error fetching pending requests:', error);
        throw error;
      }
    },
    []
  );
};

/**
 * Hook for updating group settings
 */
export const useUpdateGroupSettings = () => {
  return useCallback(
    async (
      groupId: string | number,
      settings: {
        isApprovalRequired?: boolean;
        allowSendLinks?: string;
        spamFilterLevel?: number;
      }
    ) => {
      try {
        const result = await groupsApi.updateGroupSettings(groupId, settings);
        return result;
      } catch (error) {
        console.error('Error updating group settings:', error);
        throw error;
      }
    },
    []
  );
};

/**
 * Combined hook for comprehensive group management
 */
export const useGroupManagement = () => {
  const state = useGroupsState();
  const fetchMyGroups = useFetchMyGroups();
  const fetchAllGroups = useFetchAllGroups();
  const fetchGroupById = useFetchGroupById();
  const createGroup = useCreateGroup();
  const joinGroupByCode = useJoinGroupByCode();
  const fetchGroupMembers = useFetchGroupMembers();
  const addMembers = useAddMembers();
  const removeMember = useRemoveMember();
  const updateMemberRole = useUpdateMemberRole();
  const leaveGroup = useLeaveGroup();
  const disbandGroup = useDisbandGroup();
  const handleJoinRequest = useHandleJoinRequest();
  const selectGroup = useSelectGroup();
  const clearSelectedGroup = useClearSelectedGroup();
  const fetchGroupInvite = useFetchGroupInvite();
  const fetchPendingRequests = useFetchPendingRequests();
  const updateGroupSettings = useUpdateGroupSettings();
  const clearError = useClearGroupError();

  return {
    // State
    ...state,
    
    // Actions
    fetchMyGroups,
    fetchAllGroups,
    fetchGroupById,
    createGroup,
    joinGroupByCode,
    fetchGroupMembers,
    addMembers,
    removeMember,
    updateMemberRole,
    leaveGroup,
    disbandGroup,
    handleJoinRequest,
    selectGroup,
    clearSelectedGroup,
    fetchGroupInvite,
    fetchPendingRequests,
    updateGroupSettings,
    clearError,
  };
};
