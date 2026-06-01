import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, Platform, PermissionsAndroid, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createAgoraRtcEngine,
  IRtcEngine,
  RtcSurfaceView,
  ChannelProfileType,
  ChannelMediaOptions,
  VideoSourceType,
  RenderModeType,
} from 'react-native-agora';
import { useKeepAwake } from 'expo-keep-awake';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  setGroupStatus,
  toggleGroupMute,
  toggleGroupCamera,
  toggleGroupSpeaker,
  addGroupRemoteUser,
  removeGroupRemoteUser,
  leaveGroupLocal,
  endGroupCall,
} from '@store/slices/groupCallSlice';
import { socketActions } from '@api/socket';
import { callApi } from '@api/endpoints';
import CallControls from '@features/call/components/CallControls';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'GroupCall'>;

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
 * GroupCallScreen — 4-bug-fix rewrite
 *
 * Bug 1: View+map+ScrollView grid, deduped UIDs, proper sizing.
 * Bug 2: mode='rejoin' skips incoming modal, joins Agora immediately.
 * Bug 3: leave ≠ end. leave=local-only. end=broadcast. No auto-end on unmount.
 * Bug 4: engineReady gate + sourceType=VideoSourceCamera for local preview.
 */
const GroupCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    callId,
    channelName,
    token,
    uid,
    callType,
    groupId,
    groupName,
    mode = 'normal',
  } = route.params;

  useKeepAwake();

  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.groupCall.status);
  const isMuted = useAppSelector((s) => s.groupCall.isMuted);
  const isCameraOff = useAppSelector((s) => s.groupCall.isCameraOff);
  const isSpeakerOn = useAppSelector((s) => s.groupCall.isSpeakerOn);
  const remoteReduxUsers = useAppSelector((s) => s.groupCall.remoteUsers);

  // ── Agora refs ──────────────────────────────────────────────────────────
  const engineRef = useRef<IRtcEngine | null>(null);
  const releasedRef = useRef(false);
  const hasJoinedRef = useRef(false);
  const endedHandledRef = useRef(false);

  // Bug 4: engineReady gates RtcSurfaceView rendering
  const [engineReady, setEngineReady] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Timer cleanup ───────────────────────────────────────────────────────
  const stopDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  }, []);

  // ── Idempotent Agora-only cleanup (Bug 3: no Redux/API/nav) ────────────
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

  // ════════════════════════════════════════════════════════════════════════
  // 1. Create one engine on mount — Bug 4: engineReady before joinChannel
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
          dispatch(setGroupStatus('ended'));
          return;
        }

        const engine = createAgoraRtcEngine();
        if (destroyed) {
          try { engine.release(); } catch {}
          return;
        }
        engineRef.current = engine;

        // ── Initialize ─────────────────────────────────────────────────
        engine.initialize({
          appId: AGORA_APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
        });

        // ── Enable media ───────────────────────────────────────────────
        engine.enableAudio();
        if (callType === 'video') {
          engine.enableVideo();
          engine.startPreview(VideoSourceType.VideoSourceCamera);
        } else {
          engine.disableVideo();
        }
        engine.setEnableSpeakerphone(isSpeakerOn);

        // ── Event listeners ────────────────────────────────────────────
        engine.addListener('onUserJoined', (_conn: any, remote: number) => {
          if (!destroyed && !releasedRef.current) {
            console.log('[GroupCall] onUserJoined:', remote);
            dispatch(addGroupRemoteUser(remote));
          }
        });

        engine.addListener('onUserOffline', (_conn: any, remote: number) => {
          if (!destroyed && !releasedRef.current) {
            console.log('[GroupCall] onUserOffline:', remote);
            dispatch(removeGroupRemoteUser(remote));
          }
        });

        engine.addListener('onJoinChannelSuccess', () => {
          console.log('[GroupCall] Joined channel:', channelName);
          if (!destroyed) {
            dispatch(setGroupStatus('active'));
            setCallDuration(0);
            stopDurationTimer();
            durationTimerRef.current = setInterval(() => {
              setCallDuration((p) => p + 1);
            }, 1000);
          }
        });

        engine.addListener('onError', (err: any) => {
          console.error('[GroupCall] Agora error:', err);
        });

        // Bug 4: engineReady BEFORE joinChannel — local preview visible immediately
        if (!destroyed) {
          setEngineReady(true);
        }

        // ── Join channel ───────────────────────────────────────────────
        const options: ChannelMediaOptions = {
          clientRoleType: 1, // ClientRoleBroadcaster
          channelProfile: ChannelProfileType.ChannelProfileCommunication,
          publishCameraTrack: callType === 'video',
          publishMicrophoneTrack: true,
          autoSubscribeVideo: true,
          autoSubscribeAudio: true,
        };
        console.log('[GroupCall] joinChannel', { channelName, uid, mode });
        await engine.joinChannel(token, channelName, uid, options);
        hasJoinedRef.current = true;

      } catch (err: any) {
        console.error('[GroupCall] init error:', err);
        if (!destroyed) {
          Alert.alert('Lỗi', 'Không thể khởi tạo cuộc gọi nhóm');
          dispatch(setGroupStatus('ended'));
        }
      }
    };

    init();

    // Bug 3: Unmount = ONLY Agora cleanup. No API/Redux/nav.
    return () => {
      destroyed = true;
      cleanupAgora();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // 2. Terminal status (group-call:ended from backend) → cleanup + reset + goBack
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (status === 'ended' && !endedHandledRef.current && hasJoinedRef.current) {
      endedHandledRef.current = true;
      cleanupAgora();
      dispatch(endGroupCall());
      navigation.goBack();
    }
  }, [status, cleanupAgora, dispatch, navigation]);

  // ════════════════════════════════════════════════════════════════════════
  // 3. Sync UI controls → Agora engine
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
  }, [isCameraOff]);

  useEffect(() => {
    if (!releasedRef.current && engineRef.current) {
      engineRef.current.setEnableSpeakerphone(isSpeakerOn);
    }
  }, [isSpeakerOn]);

  // ── Bug 3: LEAVE = local-only, call continues for others ────────────────
  const handleLeave = useCallback(async () => {
    endedHandledRef.current = true; // Prevent terminal effect
    try { await callApi.leaveGroupCall(callId); } catch {}
    socketActions.leaveGroupCall(callId);
    cleanupAgora();
    dispatch(leaveGroupLocal()); // Local reset only
    navigation.goBack();
  }, [callId, cleanupAgora, dispatch, navigation]);

  // ── Host: END = force-end for everyone ──────────────────────────────
  const handleToggleMute = useCallback(() => dispatch(toggleGroupMute()), [dispatch]);
  const handleToggleCamera = useCallback(() => dispatch(toggleGroupCamera()), [dispatch]);
  const handleToggleSpeaker = useCallback(() => dispatch(toggleGroupSpeaker()), [dispatch]);

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

  // Bug 1: Deduplicate UIDs — local uid not in remote list
  const remoteUids = remoteReduxUsers.filter((u) => u !== uid);
  const allUids = [uid, ...remoteUids];
  const count = allUids.length;

  // Bug 1: Layout rules
  const getTileStyle = () => {
    if (count <= 1) return styles.tileFull;
    if (count === 2) return styles.tileHalf;
    return styles.tileGrid; // 2-column for 3-4, scroll for 5+
  };
  const tileStyle = getTileStyle();

  const renderTile = (tileUid: number, isLocal: boolean) => {
    const tileKey = isLocal
      ? `local-${callId}`
      : `remote-${callId}-${tileUid}`;

    if (callType === 'audio') {
      return (
        <View key={tileKey} style={[tileStyle, styles.audioCell]}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>{isLocal ? 'B' : '#'}</Text>
          </View>
          <Text style={styles.participantName}>
            {isLocal ? 'Bạn' : `User ${tileUid}`}
          </Text>
        </View>
      );
    }

    // Bug 4: engineReady gate — don't render RtcSurfaceView before engine init
    if (!engineReady) {
      return (
        <View key={tileKey} style={[tileStyle, styles.videoCell]}>
          <View style={styles.nameOverlay}>
            <Text style={styles.debugText}>Đang khởi tạo...</Text>
          </View>
        </View>
      );
    }

    return (
      <View key={tileKey} style={[tileStyle, styles.videoCell]}>
        <RtcSurfaceView
          style={StyleSheet.absoluteFill}
          canvas={isLocal
            ? { uid: 0, sourceType: VideoSourceType.VideoSourceCamera, renderMode: RenderModeType.RenderModeHidden }
            : { uid: tileUid, renderMode: RenderModeType.RenderModeHidden }
          }
          zOrderMediaOverlay={isLocal}
        />
        <View style={styles.nameOverlay}>
          <Text style={styles.debugText}>
            {isLocal
              ? `LOCAL canvasUid=0 backendUid=${tileUid}`
              : `REMOTE uid=${tileUid}`}
          </Text>
        </View>
      </View>
    );
  };

  // Bug 1: Grid layout — View+map+ScrollView
  const gridContent = (
    <View style={count <= 2 ? styles.columnLayout : styles.wrapLayout}>
      {allUids.map((tileUid, idx) => renderTile(tileUid, idx === 0))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <Text style={styles.statusText}>
            {status === 'active'
              ? formatDuration(callDuration)
              : status === 'joining'
              ? 'Đang tham gia...'
              : 'Đang kết nối...'}
          </Text>
          <Text style={styles.countText}>
            {count} người tham gia
          </Text>
        </View>

        {/* Bug 1: ScrollView for 5+ users */}
        <View style={styles.gridArea}>
          {count > 4 ? (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {gridContent}
            </ScrollView>
          ) : (
            gridContent
          )}
        </View>

        <View style={styles.bottomArea}>
          {/* Member: "Rời khỏi" text link */}
          
            <Text style={styles.leaveText} onPress={handleLeave}>
              Rời khỏi
            </Text>
          
          <CallControls
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isSpeakerOn={isSpeakerOn}
            callType={callType}
            onToggleMute={handleToggleMute}
            onToggleCamera={handleToggleCamera}
            onToggleSpeaker={handleToggleSpeaker}
            onEndCall={handleLeave}
            onSwitchCamera={handleSwitchCamera}
          />
        </View>
      </SafeAreaView>
    </View>
  );
};

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
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  countText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
  gridArea: {
    flex: 1,
    margin: 8,
  },
  scrollContent: {
    gap: 8,
  },
  columnLayout: {
    flex: 1,
    gap: 8,
  },
  wrapLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tileFull: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tileHalf: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tileGrid: {
    width: '48%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoCell: {
    backgroundColor: '#1A1A1A',
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  audioCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#1A1A1A',
  },
  avatarSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  participantName: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
  },
  bottomArea: {
    alignItems: 'center',
  },
  leaveText: {
    color: '#FF9500',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  debugText: {
    color: '#00FF00',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});

export default GroupCallScreen;
