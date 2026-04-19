import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Group, GroupMember } from '@/types';

interface GroupsState {
  myGroups: Group[];
  allGroups: Group[];
  selectedGroup: Group | null;
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

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    setMyGroups(state, action: PayloadAction<Group[]>) {
      state.myGroups = action.payload;
    },
    setAllGroups(state, action: PayloadAction<Group[]>) {
      state.allGroups = action.payload;
    },
    addGroup(state, action: PayloadAction<Group>) {
      const exists = state.myGroups.find(
        (g) => g.groupId === action.payload.groupId
      );
      if (!exists) {
        state.myGroups.unshift(action.payload);
      }
    },
    updateGroup(state, action: PayloadAction<Group>) {
      const idx = state.myGroups.findIndex(
        (g) => g.groupId === action.payload.groupId
      );
      if (idx !== -1) state.myGroups[idx] = action.payload;
    },
    removeGroup(state, action: PayloadAction<string>) {
      state.myGroups = state.myGroups.filter(
        (g) => g.groupId !== action.payload
      );
    },
    setSelectedGroup(state, action: PayloadAction<Group | null>) {
      state.selectedGroup = action.payload;
    },
    setGroupMembers(
      state,
      action: PayloadAction<{ groupId: string; members: GroupMember[] }>
    ) {
      state.groupMembers[action.payload.groupId] = action.payload.members;
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
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    clearGroups(state) {
      return { ...initialState };
    },
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
  setLoading,
  setError,
  clearGroups,
} = groupsSlice.actions;

export default groupsSlice.reducer;
