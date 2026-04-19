import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface IncomingCall {
  roomId: string;
  callerId: string;
  caller_name: string;
  type: 'video' | 'voice';
}

interface ActiveCall {
  roomId: string;
  type: 'video' | 'voice';
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
  zegoToken: string | null;
  zegoAppId: number | null;
}

const initialState: CallState = {
  activeCall: null,
  incomingCall: null,
  callStatus: 'idle',
  isMuted: false,
  isCameraOff: false,
  isSpeakerOn: true,
  zegoToken: null,
  zegoAppId: null,
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
    setZegoCredentials(
      state,
      action: PayloadAction<{ token: string; appId: number }>
    ) {
      state.zegoToken = action.payload.token;
      state.zegoAppId = action.payload.appId;
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
    endCall(state) {
      state.activeCall = null;
      state.incomingCall = null;
      state.callStatus = 'idle';
      state.isMuted = false;
      state.isCameraOff = false;
      state.zegoToken = null;
      state.zegoAppId = null;
    },
  },
});

export const {
  setIncomingCall,
  clearIncomingCall,
  setActiveCall,
  setCallStatus,
  setZegoCredentials,
  toggleMute,
  toggleCamera,
  toggleSpeaker,
  endCall,
} = callSlice.actions;

export default callSlice.reducer;
