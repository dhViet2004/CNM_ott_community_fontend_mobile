import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export enum ChannelProfileType {
  ChannelProfileCommunication = 0,
  ChannelProfileLiveBroadcasting = 1,
  ChannelProfileGame = 2,
  ChannelProfileCloudGaming = 3,
}

export enum ClientRoleType {
  ClientRoleBroadcaster = 1,
  ClientRoleAudience = 2,
}

export enum VideoSourceType {
  VideoSourceCameraToFront = 0,
  VideoSourceCameraToBack = 1,
  VideoSourceCamera = 2,
}

export enum RenderModeType {
  RenderModeHidden = 1,
  RenderModeFit = 2,
}

export const RtcSurfaceView = (props: any) => {
  const uid = props.canvas?.uid;
  const isLocal = uid === 0 || !uid;

  return (
    <View style={[styles.placeholder, props.style]}>
      <Text style={styles.text}>
        {isLocal ? '📷 Camera của bạn (Mock)' : `👤 Video đối phương (Mock UID: ${uid})`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    textAlign: 'center',
  },
});

class MockRtcEngine {
  listeners: { [key: string]: Function[] } = {};

  initialize() {
    console.log('[Agora Mock] Engine initialized');
    return 0;
  }
  enableAudio() {
    console.log('[Agora Mock] Audio enabled');
    return 0;
  }
  enableVideo() {
    console.log('[Agora Mock] Video enabled');
    return 0;
  }
  startPreview() {
    console.log('[Agora Mock] Started preview');
    return 0;
  }
  disableVideo() {
    console.log('[Agora Mock] Video disabled');
    return 0;
  }
  setEnableSpeakerphone(enabled: boolean) {
    console.log('[Agora Mock] Set speakerphone:', enabled);
    return 0;
  }
  muteLocalAudioStream(muted: boolean) {
    console.log('[Agora Mock] Mute local audio:', muted);
    return 0;
  }
  muteLocalVideoStream(muted: boolean) {
    console.log('[Agora Mock] Mute local video:', muted);
    return 0;
  }
  switchCamera() {
    console.log('[Agora Mock] Switched camera');
    return 0;
  }
  stopPreview() {
    console.log('[Agora Mock] Stopped preview');
    return 0;
  }
  release() {
    console.log('[Agora Mock] Released engine');
    return 0;
  }

  addListener(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return { remove: () => this.removeListener(event, callback) };
  }

  removeListener(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }
  }

  removeAllListeners() {
    this.listeners = {};
    console.log('[Agora Mock] Removed all listeners');
  }

  async joinChannel(token: string, channelId: string, uid: number, options: any) {
    console.log('[Agora Mock] Joining channel:', channelId, 'as UID:', uid);
    // Simulate successful channel join after 800ms
    setTimeout(() => {
      this.emit('onJoinChannelSuccess', {}, channelId, uid, 0);
      // Simulate remote user joining after another 1200ms
      setTimeout(() => {
        this.emit('onUserJoined', {}, 999);
      }, 1200);
    }, 800);
    return 0;
  }

  async leaveChannel() {
    console.log('[Agora Mock] Leaving channel');
    setTimeout(() => {
      this.emit('onUserOffline', {}, 999, 0);
    }, 100);
    return 0;
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(...args));
    }
  }
}

const instance = new MockRtcEngine();

export function createAgoraRtcEngine() {
  return instance;
}

export default createAgoraRtcEngine;
