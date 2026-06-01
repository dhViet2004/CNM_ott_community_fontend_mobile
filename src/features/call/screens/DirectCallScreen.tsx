import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Alert, Platform, PermissionsAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
  ChannelProfileType,
  ClientRoleType,
  VideoSourceType,
  ChannelMediaOptions,
  RenderModeType,
} from 'react-native-agora';
import { useKeepAwake } from 'expo-keep-awake';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  setCallStatus,
  toggleMute,
  toggleCamera,
  toggleSpeaker,
  endCall,
} from '@store/slices/callSlice';
import { socketActions } from '@api/socket';
import { callApi } from '@api/endpoints';
import CallControls from '@features/call/components/CallControls';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'DirectCall'>;

const AGORA_APP_ID = process.env.EXPO_PUBLIC_AGORA_APP_ID || '';

async function requestMediaPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA!,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO!,
      ]);
      return (
        grants['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
        grants['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (err) {
      console.warn('[Permissions] Error requesting:', err);
      return false;
    }
  }
  return true;
}

/**
 * DirectCallScreen — Agora RTC lifecycle
 *
 * Guarantees:
 *  • One engine created per screen mount, released on unmount (never reused).
 *  • Local preview: RtcSurfaceView uid=0 + sourceType=VideoSourceCamera.
 *  • Remote video:  RtcSurfaceView uid=remoteUid.
 *  • Surfaces keyed by callId for correct React reconciliation.
 *  • Surfaces only mount AFTER engine is fully initialized (engineReady gate).
 *  • On unmount only Agora resources are cleaned up (no API / Redux / nav).
 *  • callApi.endCall  → only when user presses end-call button.
 *  • Redux endCall()  → only when callStatus transitions to 'ended'
 *    (covers ended / rejected / missed / busy / error from socket).
 */
const DirectCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    callId,
    channelName,
    token,
    uid,
    callType,
    remoteName,
  } = route.params;

  useKeepAwake();

  const dispatch = useAppDispatch();
  const isMuted = useAppSelector((s) => s.call.isMuted);
  const isCameraOff = useAppSelector((s) => s.call.isCameraOff);
  const isSpeakerOn = useAppSelector((s) => s.call.isSpeakerOn);
  const callStatus = useAppSelector((s) => s.call.callStatus);
  const isCaller = useAppSelector((s) => s.call.isCaller);

  // ── Agora refs — one engine per mount, never singleton ──────────────────
  const engineRef = useRef<IRtcEngine | null>(null);
  const releasedRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const endedHandledRef = useRef(false);

  // engineReady gates RtcSurfaceView rendering — surfaces must NOT mount
  // before the engine is fully initialized or the native binding fails.
  const [engineReady, setEngineReady] = useState(false);
  const [remoteUid, setRemoteUid] = useState<number | undefined>(undefined);
  const [callDuration, setCallDuration] = useState(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Shared timer cleanup (used by cleanupAgora, onUserJoined, onUserOffline)
  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  // ── Idempotent Agora-only cleanup (no Redux / API / navigation) ─────────
  const cleanupAgora = useCallback(() => {
    stopDurationTimer();
    if (engineRef.current && !releasedRef.current) {
      releasedRef.current = true;
      try { engineRef.current.removeAllListeners(); } catch {}
      try { engineRef.current.stopPreview(); } catch {}
      try { engineRef.current.leaveChannel(); } catch {}
      try { engineRef.current.release(); } catch {}
      engineRef.current = null;
    }
    hasJoinedRef.current = false;
  }, [stopDurationTimer]);

  // ── Join channel (guarded by releasedRef) ───────────────────────────────
  const joinChannel = useCallback(async () => {
    if (hasJoinedRef.current || !engineRef.current || releasedRef.current) return;

    try {
      const options: ChannelMediaOptions = {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        publishCameraTrack: callType === 'video',
        publishMicrophoneTrack: true,
        autoSubscribeVideo: true,
        autoSubscribeAudio: true,
      };
      console.log('[DirectCall] joinChannel', { channelName, uid });
      await engineRef.current.joinChannel(token, channelName, uid, options);
      hasJoinedRef.current = true;
    } catch (err: any) {
      console.error('[DirectCall] joinChannel error:', err);
      dispatch(setCallStatus('ended'));
    }
  }, [token, channelName, uid, callType, dispatch]);

  // ════════════════════════════════════════════════════════════════════════
  // 1. Create one engine on mount — cleanup only Agora on unmount
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let destroyed = false;
    releasedRef.current = false;
    endedHandledRef.current = false;

    const init = async () => {
      try {
        const ok = await requestMediaPermissions();
        if (destroyed) return;

        if (!ok) {
          Alert.alert('Lỗi', 'Cần cấp quyền camera và micro để thực hiện cuộc gọi');
          dispatch(setCallStatus('ended'));
          return;
        }

        const engine = createAgoraRtcEngine();
        if (destroyed) {
          try { engine.release(); } catch {}
          return;
        }
        engineRef.current = engine;

        engine.initialize({
          appId: AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });

        engine.enableAudio();
        if (callType === 'video') {
          engine.enableVideo();
          engine.startPreview(VideoSourceType.VideoSourceCamera);
        } else {
          engine.disableVideo();
        }
        engine.setEnableSpeakerphone(isSpeakerOn);

        // ── Agora event listeners ──────────────────────────────────────
        engine.addListener('onUserJoined', (_conn: any, remote: number) => {
          if (!destroyed && !releasedRef.current) {
            console.log('[DirectCall] onUserJoined:', remote);
            setRemoteUid(remote);
            setCallDuration(0);
            stopDurationTimer();
            durationTimerRef.current = setInterval(() => {
              setCallDuration((p) => p + 1);
            }, 1000);
          }
        });

        engine.addListener('onUserOffline', (_conn: any, remote: number) => {
          if (!destroyed && !releasedRef.current) {
            console.log('[DirectCall] onUserOffline:', remote);
            setRemoteUid(undefined);
            stopDurationTimer();
          }
        });

        engine.addListener('onJoinChannelSuccess', () => {
          console.log('[DirectCall] Joined channel:', channelName);
        });

        engine.addListener('onError', (err: any) => {
          console.error('[DirectCall] Agora error:', err);
        });

        // Engine fully initialized — safe to mount RtcSurfaceView now
        if (!destroyed) {
          setEngineReady(true);
        }
      } catch (err: any) {
        console.error('[DirectCall] init error:', err);
        if (!destroyed) {
          Alert.alert('Lỗi', 'Không thể khởi tạo cuộc gọi');
          dispatch(setCallStatus('ended'));
        }
      }
    };

    init();

    // Cleanup: release Agora resources only (no Redux / API / navigation)
    return () => {
      destroyed = true;
      cleanupAgora();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount-only

  // ════════════════════════════════════════════════════════════════════════
  // 2. Join channel once call is connected
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Retry the actual Agora join once the engine is ready. Without this,
    // a fast accept can flip callStatus to "connected" before init finishes,
    // and the first join attempt is skipped forever.
    if (
      engineReady &&
      callStatus === 'connected' &&
      !hasJoinedRef.current &&
      !releasedRef.current
    ) {
      joinChannel();
    }
  }, [callStatus, engineReady, joinChannel]);

  // ════════════════════════════════════════════════════════════════════════
  // 3. Terminal status → cleanup Agora + reset Redux + navigate back
  //    (covers: ended / rejected / missed / busy / error)
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (callStatus === 'ended' && !endedHandledRef.current) {
      endedHandledRef.current = true;
      cleanupAgora();
      dispatch(endCall());
      navigation.goBack();
    }
  }, [callStatus, cleanupAgora, dispatch, navigation]);

  // ════════════════════════════════════════════════════════════════════════
  // 4. Sync UI controls → Agora engine (guarded by releasedRef)
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!releasedRef.current && engineRef.current) {
      engineRef.current.muteLocalAudioStream(isMuted);
    }
  }, [isMuted]);

  useEffect(() => {
    if (!releasedRef.current && engineRef.current && callType === 'video') {
      engineRef.current.muteLocalVideoStream(isCameraOff);
    }
  }, [isCameraOff]); // callType is constant from route.params

  useEffect(() => {
    if (!releasedRef.current && engineRef.current) {
      engineRef.current.setEnableSpeakerphone(isSpeakerOn);
    }
  }, [isSpeakerOn]);

  // ── User presses end-call button ────────────────────────────────────────
  //    callApi.endCall  → only here (user-initiated)
  //    socketActions    → emit + dispatches setCallStatus('ended')
  //    The ended-effect above handles Agora cleanup + Redux reset + nav.
  const handleEndCall = useCallback(async () => {
    try {
      await callApi.endCall(callId);
    } catch {
      // API failure should not prevent local teardown
    }
    socketActions.endCall(callId);
  }, [callId]);

  // ── UI toggle handlers ──────────────────────────────────────────────────
  const handleToggleMute = useCallback(() => dispatch(toggleMute()), [dispatch]);
  const handleToggleCamera = useCallback(() => dispatch(toggleCamera()), [dispatch]);
  const handleToggleSpeaker = useCallback(() => dispatch(toggleSpeaker()), [dispatch]);

  const handleSwitchCamera = useCallback(() => {
    if (!releasedRef.current && engineRef.current) {
      engineRef.current.switchCamera();
    }
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ── Render: video / audio surfaces keyed by callId ──────────────────────
  const renderVideo = () => {
    if (callType === 'audio') {
      return (
        <View style={styles.audioArea}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {(remoteName || 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.remoteName}>{remoteName || 'Người dùng'}</Text>
          <Text style={styles.statusText}>
            {callStatus === 'connected'
              ? remoteUid !== undefined
                ? formatDuration(callDuration)
                : 'Đang chờ đối phương...'
              : isCaller
              ? 'Đang gọi...'
              : 'Đang kết nối...'}
          </Text>
        </View>
      );
    }

    // Video call — only mount surfaces after engine is ready
    if (!engineReady) {
      return (
        <View style={styles.videoArea}>
          <View style={styles.remoteVideo}>
            <View style={styles.videoPlaceholder}>
              <Text style={styles.placeholderText}>Đang khởi tạo camera...</Text>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.videoArea}>
        {/* Remote video — keyed by callId */}
        <View style={styles.remoteVideo}>
          {remoteUid !== undefined ? (
            <RtcSurfaceView
              key={`remote-${callId}`}
              style={StyleSheet.absoluteFill}
              canvas={{ uid: remoteUid, renderMode: RenderModeType.RenderModeHidden }}
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.placeholderText}>
                {callStatus === 'connected'
                  ? 'Đang chờ camera...'
                  : isCaller
                  ? 'Đang gọi...'
                  : 'Đang kết nối...'}
              </Text>
            </View>
          )}
        </View>

        {/* Local preview — uid=0, sourceType=VideoSourceCamera, keyed by callId */}
        <View style={styles.localVideoContainer}>
          <RtcSurfaceView
            key={`local-${callId}`}
            style={StyleSheet.absoluteFill}
            canvas={{
              uid: 0,
              sourceType: VideoSourceType.VideoSourceCamera,
              renderMode: RenderModeType.RenderModeHidden,
            }}
            zOrderMediaOverlay
          />
        </View>
      </View>
    );
  };

  // ── JSX ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
          </Text>
          <Text style={styles.headerSubtitle}>{remoteName}</Text>
        </View>

        {renderVideo()}

        <CallControls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isSpeakerOn={isSpeakerOn}
          callType={callType}
          onToggleMute={handleToggleMute}
          onToggleCamera={handleToggleCamera}
          onToggleSpeaker={handleToggleSpeaker}
          onEndCall={handleEndCall}
          onSwitchCamera={handleSwitchCamera}
        />
      </SafeAreaView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  audioArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  remoteName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  videoArea: {
    flex: 1,
    margin: 16,
  },
  remoteVideo: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default DirectCallScreen;
