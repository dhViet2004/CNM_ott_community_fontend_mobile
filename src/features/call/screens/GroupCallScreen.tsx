import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, Platform, PermissionsAndroid, Alert, TouchableOpacity, Dimensions } from 'react-native';
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
import { playOutgoingRingtone, stopRingtone } from '@utils/audioUtils';

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
  const isHost = useAppSelector((s) => s.groupCall.isHost);
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

  // ── Layout mode ──────────────────────────────────────────────────────────
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'auto' | 'grid'>('auto');

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

  const joinChannel = useCallback(async () => {
    if (!engineRef.current || !token || !channelName || uid === undefined) return;
    try {
      const options: ChannelMediaOptions = {
        clientRoleType: 1, // ClientRoleBroadcaster
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        publishCameraTrack: callType === 'video',
        publishMicrophoneTrack: true,
        autoSubscribeVideo: true,
        autoSubscribeAudio: true,
      };
      console.log('[GroupCall] Executing joinChannel', { channelName, uid, mode });
      await engineRef.current.joinChannel(token, channelName, uid, options);
      hasJoinedRef.current = true;
    } catch (err) {
      console.error('[GroupCall] joinChannel error:', err);
    }
  }, [token, channelName, uid, callType, mode]);

  useEffect(() => {
    if (
      engineReady &&
      !hasJoinedRef.current &&
      !releasedRef.current &&
      (mode === 'rejoin' || status === 'connected' || !isHost)
    ) {
      joinChannel();
    }
  }, [engineReady, status, mode, isHost, joinChannel]);

  // ════════════════════════════════════════════════════════════════════════
  // 2. Terminal status (group-call:ended from backend) → cleanup + reset + goBack
  // ════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (status === 'ended' && !endedHandledRef.current) {
      endedHandledRef.current = true;
      cleanupAgora();
      dispatch(endGroupCall());
      navigation.goBack();
    }
  }, [status, cleanupAgora, dispatch, navigation]);

  // ════════════════════════════════════════════════════════════════════════
  // 3. Ringtone for outgoing group calls
  // ════════════════════════════════════════════════════════════════════════
  const remoteUids = remoteReduxUsers.filter((u) => u !== uid);
  const remoteCount = remoteUids.length;



  // ════════════════════════════════════════════════════════════════════════
  // 4. Sync UI controls → Agora engine
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

  // ── Layout calculations ──────────────────────────────────────────────────
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
  // Reserve space for header (~120px) + bottom controls (~140px)
  const VIDEO_AREA_H = SCREEN_H - 260;
  const TILE_GAP = 6;

  // Only remote UIDs in grid (local is floating overlay)
  // (remoteUids and remoteCount are defined above)

  // Tile dimensions based on remote count + layoutMode
  const getTileDimensions = () => {
    if (remoteCount <= 0) return { width: SCREEN_W - 32, height: VIDEO_AREA_H };
    
    const isGrid = layoutMode === 'grid' || (layoutMode === 'auto' && remoteCount >= 3);
    
    if (!isGrid) {
      // 1-2 remote: column layout (stacked vertically)
      const tileH = (VIDEO_AREA_H - TILE_GAP * (remoteCount - 1)) / remoteCount;
      return { width: SCREEN_W - 32, height: tileH };
    }
    
    // Grid: 2 columns
    const cols = 2;
    const rows = Math.ceil(remoteCount / cols);
    const tileW = (SCREEN_W - 32 - TILE_GAP * (cols - 1)) / cols;
    const tileH = (VIDEO_AREA_H - TILE_GAP * (rows - 1)) / rows;
    return { width: tileW, height: Math.min(tileH, 300) };
  };
  const tileDim = getTileDimensions();

  const renderRemoteTile = (tileUid: number) => {
    const tileKey = `remote-${callId}-${tileUid}`;

    if (callType === 'audio') {
      return (
        <View key={tileKey} style={[styles.audioCell, { width: tileDim.width, height: tileDim.height }]}>
          <View style={styles.avatarSmall}>
            <Text style={styles.avatarText}>#</Text>
          </View>
          <Text style={styles.participantName}>User {tileUid}</Text>
        </View>
      );
    }

    if (!engineReady) {
      return (
        <View key={tileKey} style={[styles.videoCell, { width: tileDim.width, height: tileDim.height }]}>
          <Text style={styles.placeholderText}>Đang khởi tạo...</Text>
        </View>
      );
    }

    return (
      <View key={tileKey} style={[styles.videoCell, { width: tileDim.width, height: tileDim.height }]}>
        <RtcSurfaceView
          style={StyleSheet.absoluteFill}
          canvas={{ uid: tileUid, renderMode: RenderModeType.RenderModeHidden }}
        />
        {__DEV__ && (
          <View style={styles.nameOverlay}>
            <Text style={styles.debugText}>uid={tileUid}</Text>
          </View>
        )}
      </View>
    );
  };

  // Grid content — remote users only
  const isGridLayout = layoutMode === 'grid' || (layoutMode === 'auto' && remoteCount >= 3);
  const gridContent = remoteCount > 0 ? (
    <View style={isGridLayout && remoteCount > 1 ? styles.wrapLayout : styles.columnLayout}>
      {remoteUids.map((tileUid) => renderRemoteTile(tileUid))}
    </View>
  ) : (
    <View style={styles.waitingArea}>
      <Text style={styles.waitingText}>Đang chờ người khác tham gia...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }} />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>{groupName}</Text>
              <Text style={styles.statusText}>
                {status === 'active'
                  ? formatDuration(callDuration)
                  : status === 'joining'
                  ? isHost ? 'Đang gọi nhóm...' : 'Đang tham gia...'
                  : 'Đang kết nối...'}
              </Text>
              <Text style={styles.countText}>
                {remoteCount + 1} người tham gia
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.layoutButton}
                onPress={() => setShowLayoutMenu((p) => !p)}
                activeOpacity={0.7}
              >
                <Text style={styles.layoutButtonText}>⊞</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Layout dropdown menu */}
          {showLayoutMenu && (
            <View style={styles.layoutMenu}>
              {([
                { key: 'auto', label: 'Tự động' },
                { key: 'grid', label: 'Lưới' },
              ] as const).map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    styles.layoutMenuItem,
                    layoutMode === opt.key && styles.layoutMenuItemActive,
                  ]}
                  onPress={() => {
                    setLayoutMode(opt.key);
                    setShowLayoutMenu(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.layoutMenuText,
                      layoutMode === opt.key && styles.layoutMenuTextActive,
                    ]}
                  >
                    {opt.label}{layoutMode === opt.key ? ' ✓' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Remote video grid */}
        <View style={styles.gridArea}>
          {remoteCount > 4 ? (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              {gridContent}
            </ScrollView>
          ) : (
            gridContent
          )}
        </View>

        {/* Local preview — floating overlay, always visible for video calls */}
        {callType === 'video' && engineReady && (
          <View style={styles.localPreview}>
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
        )}

        <View style={styles.bottomArea}>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 16,
  },
  layoutButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layoutButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  layoutMenu: {
    marginTop: 8,
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 140,
    alignSelf: 'center',
  },
  layoutMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  layoutMenuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  layoutMenuText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  layoutMenuTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    gap: 6,
  },
  columnLayout: {
    flex: 1,
    gap: 6,
  },
  wrapLayout: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignContent: 'flex-start',
    justifyContent: 'center',
  },
  videoCell: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  audioCell: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
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
  nameOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  debugText: {
    color: '#00FF00',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    textAlign: 'center',
  },
  waitingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 15,
  },
  // Local preview — floating overlay (like DirectCallScreen)
  localPreview: {
    position: 'absolute',
    bottom: 160,
    right: 16,
    width: 110,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
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
});

export default GroupCallScreen;
