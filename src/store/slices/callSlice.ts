import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface IncomingCall {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string | null;
  callType: 'audio' | 'video';
  callMode: 'direct' | 'group';
  channelName: string;
  conversationId: string;
  token?: string;
  uid?: number;
}

interface ActiveCall {
  callId: string;
  channelName: string;
  token: string;
  uid: number;
  callType: 'audio' | 'video';
  callMode: 'direct' | 'group';
  conversationId: string;
  participants: string[];
  startedAt: string;
}

interface CallState {
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  callStatus: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  agoraToken: string | null;
  agoraAppId: string | null;
  channelName: string | null;
  uid: number | null;
  callId: string | null;
  conversationId: string | null;
  callType: 'audio' | 'video';
  callMode: 'direct' | 'group';
  isCaller: boolean;
}

const initialState: CallState = {
  activeCall: null,
  incomingCall: null,
  callStatus: 'idle',
  isMuted: false,
  isCameraOff: false,
  isSpeakerOn: true,
  agoraToken: null,
  agoraAppId: null,
  channelName: null,
  uid: null,
  callId: null,
  conversationId: null,
  callType: 'video',
  callMode: 'direct',
  isCaller: false,
};

const callSlice = createSlice({
  name: 'call',
  initialState,
  reducers: {
    setIncomingCall(state, action: PayloadAction<IncomingCall>) {
      state.incomingCall = action.payload;
      state.callStatus = 'ringing';
    },
    clearIncomingCall(state) {
      state.incomingCall = null;
      if (state.callStatus === 'ringing') {
        state.callStatus = 'idle';
      }
    },
    setActiveCall(state, action: PayloadAction<ActiveCall | null>) {
      state.activeCall = action.payload;
    },
    setCallStatus(state, action: PayloadAction<CallState['callStatus']>) {
      state.callStatus = action.payload;
      if (action.payload === 'ended') {
        state.activeCall = null;
        state.incomingCall = null;
      }
    },
    setAgoraCredentials(
      state,
      action: PayloadAction<{
        token: string;
        appId: string;
        channelName: string;
        uid: number;
        callId: string;
        conversationId: string;
        callType: 'audio' | 'video';
        callMode: 'direct' | 'group';
      }>
    ) {
      state.agoraToken = action.payload.token;
      state.agoraAppId = action.payload.appId;
      state.channelName = action.payload.channelName;
      state.uid = action.payload.uid;
      state.callId = action.payload.callId;
      state.conversationId = action.payload.conversationId;
      state.callType = action.payload.callType;
      state.callMode = action.payload.callMode;
    },
    toggleMute(state) {
      state.isMuted = !state.isMuted;
    },
    toggleCamera(state) {
      state.isCameraOff = !state.isCameraOff;
    },
    toggleSpeaker(state) {
      state.isSpeakerOn = !state.isSpeakerOn;
    },
    setIsCaller(state, action: PayloadAction<boolean>) {
      state.isCaller = action.payload;
    },
    endCall(state) {
      state.activeCall = null;
      state.incomingCall = null;
      state.callStatus = 'idle';
      state.isMuted = false;
      state.isCameraOff = false;
      state.agoraToken = null;
      state.agoraAppId = null;
      state.channelName = null;
      state.uid = null;
      state.callId = null;
      state.conversationId = null;
      state.isCaller = false;
    },
  },
});

export const {
  setIncomingCall,
  clearIncomingCall,
  setActiveCall,
  setCallStatus,
  setAgoraCredentials,
  toggleMute,
  toggleCamera,
  toggleSpeaker,
  setIsCaller,
  endCall,
} = callSlice.actions;

export default callSlice.reducer;
