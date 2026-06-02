import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Group call status — mirrors web's GroupCallPhase exactly.
 * Transitions: idle → ringing → joining → active → ended
 */
export type GroupCallStatus = 'idle' | 'ringing' | 'joining' | 'connected' | 'active' | 'ended';

interface GroupIncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  callType: 'audio' | 'video';
  callMode: 'group';
  channelName: string;
  conversationId: string;
  token?: string;
  uid?: number;
}

interface GroupCallState {
  status: GroupCallStatus;
  incomingCall: GroupIncomingCall | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  isHost: boolean;
  channelName: string | null;
  uid: number | null;
  callId: string | null;
  sessionId: string | null;
  groupId: string | null;
  groupName: string | null;
  callType: 'audio' | 'video';
  token: string | null;
  remoteUsers: number[];
}

const initialState: GroupCallState = {
  status: 'idle',
  incomingCall: null,
  isMuted: false,
  isCameraOff: false,
  isSpeakerOn: true,
  isHost: false,
  channelName: null,
  uid: null,
  callId: null,
  sessionId: null,
  groupId: null,
  groupName: null,
  callType: 'video',
  token: null,
  remoteUsers: [],
};

const groupCallSlice = createSlice({
  name: 'groupCall',
  initialState,
  reducers: {
    setGroupStatus(state, action: PayloadAction<GroupCallStatus>) {
      state.status = action.payload;
    },

    setGroupIncomingCall(state, action: PayloadAction<GroupIncomingCall>) {
      state.incomingCall = action.payload;
      state.status = 'ringing';
    },
    clearGroupIncomingCall(state) {
      state.incomingCall = null;
      if (state.status === 'ringing') {
        state.status = 'idle';
      }
    },

    setGroupCallCredentials(
      state,
      action: PayloadAction<{
        channelName: string;
        uid: number;
        callId: string;
        sessionId: string;
        groupId: string;
        groupName: string;
        callType: 'audio' | 'video';
        token: string;
        isHost?: boolean;
      }>
    ) {
      const p = action.payload;
      state.channelName = p.channelName;
      state.uid = p.uid;
      state.callId = p.callId;
      state.sessionId = p.sessionId;
      state.groupId = p.groupId;
      state.groupName = p.groupName;
      state.callType = p.callType;
      state.token = p.token;
      if (p.isHost !== undefined) state.isHost = p.isHost;
      if (state.status === 'idle' || state.status === 'ringing') {
        state.status = 'joining';
      }
    },

    toggleGroupMute(state) { state.isMuted = !state.isMuted; },
    toggleGroupCamera(state) { state.isCameraOff = !state.isCameraOff; },
    toggleGroupSpeaker(state) { state.isSpeakerOn = !state.isSpeakerOn; },

    addGroupRemoteUser(state, action: PayloadAction<number>) {
      if (!state.remoteUsers.includes(action.payload)) {
        state.remoteUsers.push(action.payload);
      }
    },
    removeGroupRemoteUser(state, action: PayloadAction<number>) {
      state.remoteUsers = state.remoteUsers.filter((u) => u !== action.payload);
    },
    clearGroupRemoteUsers(state) { state.remoteUsers = []; },

    /** Local-only reset — call continues for others */
    leaveGroupLocal(state) {
      state.status = 'idle';
      state.incomingCall = null;
      state.isMuted = false;
      state.isCameraOff = false;
      state.isSpeakerOn = true;
      state.isHost = false;
      state.channelName = null;
      state.uid = null;
      state.callId = null;
      state.sessionId = null;
      state.groupId = null;
      state.groupName = null;
      state.callType = 'video';
      state.token = null;
      state.remoteUsers = [];
    },

    /** Full reset — call ended for everyone */
    endGroupCall(state) {
      state.status = 'idle';
      state.incomingCall = null;
      state.isMuted = false;
      state.isCameraOff = false;
      state.isSpeakerOn = true;
      state.isHost = false;
      state.channelName = null;
      state.uid = null;
      state.callId = null;
      state.sessionId = null;
      state.groupId = null;
      state.groupName = null;
      state.callType = 'video';
      state.token = null;
      state.remoteUsers = [];
    },
  },
});

export const {
  setGroupStatus,
  setGroupIncomingCall,
  clearGroupIncomingCall,
  setGroupCallCredentials,
  toggleGroupMute,
  toggleGroupCamera,
  toggleGroupSpeaker,
  addGroupRemoteUser,
  removeGroupRemoteUser,
  clearGroupRemoteUsers,
  leaveGroupLocal,
  endGroupCall,
} = groupCallSlice.actions;

export default groupCallSlice.reducer;
