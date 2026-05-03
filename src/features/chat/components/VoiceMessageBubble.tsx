import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus, AVPlaybackStatusSuccess } from 'expo-av';
import { colors, spacing, typography } from '@theme';
import { Icons } from '@components/common';

interface VoiceMessageBubbleProps {
  /** URL của file audio */
  uri: string;
  /** Thời lượng audio (milliseconds) - optional, sẽ tự detect nếu không truyền */
  duration?: number;
  /** Người gửi có phải là mình không */
  isMe: boolean;
  /** Thời gian gửi */
  time: string;
  /** Trạng thái tin nhắn */
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  /** Callback khi press */
  onLongPress?: () => void;
}

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

const VoiceMessageBubble: React.FC<VoiceMessageBubbleProps> = ({
  uri,
  duration: initialDuration,
  isMe,
  time,
  status,
  onLongPress,
}) => {
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('idle');
  const [position, setPosition] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration || 0);
  const [error, setError] = useState<string | null>(null);

  const soundRef = React.useRef<Audio.Sound | null>(null);

  /**
   * Format thời gian từ milliseconds sang mm:ss
   */
  const formatDuration = (ms: number): string => {
    if (!ms || ms <= 0) return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  /**
   * Setup audio mode
   */
  const setupAudioMode = useCallback(async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (err) {
      console.error('Error setting audio mode:', err);
    }
  }, []);

  /**
   * Load audio file
   */
  const loadAudio = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    setPlaybackStatus('loading');
    setError(null);

    try {
      await setupAudioMode();

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false },
        (status: AVPlaybackStatus) => {
          if (status.isLoaded) {
            const playbackStatusData = status as AVPlaybackStatusSuccess;
            setPosition(playbackStatusData.positionMillis);
            setTotalDuration(playbackStatusData.durationMillis || initialDuration || 0);

            if (playbackStatusData.didJustFinish) {
              setPlaybackStatus('idle');
              setPosition(0);
              soundRef.current?.setPositionAsync(0);
            } else if (playbackStatusData.isPlaying) {
              setPlaybackStatus('playing');
            } else {
              setPlaybackStatus('paused');
            }
          }
        }
      );

      soundRef.current = sound;
    } catch (err) {
      console.error('Error loading audio:', err);
      setError('Không thể tải audio');
      setPlaybackStatus('error');
    }
  }, [uri, initialDuration, setupAudioMode]);

  /**
   * Toggle play/pause
   */
  const togglePlayback = useCallback(async () => {
    try {
      if (!soundRef.current) {
        await loadAudio();
        return;
      }

      if (playbackStatus === 'playing') {
        await soundRef.current.pauseAsync();
        setPlaybackStatus('paused');
      } else {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.didJustFinish) {
          await soundRef.current.setPositionAsync(0);
        }
        await soundRef.current.playAsync();
        setPlaybackStatus('playing');
      }
    } catch (err) {
      console.error('Error toggling playback:', err);
      setError('Lỗi phát audio');
      setPlaybackStatus('error');
    }
  }, [playbackStatus, loadAudio]);

  // Calculate progress percentage
  const progress = totalDuration > 0 ? (position / totalDuration) * 100 : 0;

  // Load audio on mount
  useEffect(() => {
    loadAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [uri]);

  const bubbleBackgroundColor = isMe ? colors.primary : colors.background.chatBubbleOther;
  const textColor = isMe ? colors.text.inverse : colors.text.primary;
  const secondaryTextColor = isMe ? 'rgba(255,255,255,0.65)' : colors.text.tertiary;

  return (
    <TouchableOpacity
      onPress={togglePlayback}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
      style={[
        styles.container,
        { backgroundColor: bubbleBackgroundColor },
      ]}
    >
      {/* Play/Pause button */}
      <View style={[styles.playButton, isMe && styles.playButtonMe]}>
        {playbackStatus === 'loading' ? (
          <ActivityIndicator size="small" color={isMe ? colors.text.inverse : colors.primary} />
        ) : playbackStatus === 'error' ? (
          <Ionicons name="alert-circle" size={20} color={colors.status.error} />
        ) : (
          <Ionicons
            name={playbackStatus === 'playing' ? 'pause' : 'play'}
            size={20}
            color={isMe ? colors.text.inverse : colors.primary}
          />
        )}
      </View>

      {/* Waveform / Progress bar */}
      <View style={styles.waveformContainer}>
        {/* Progress bar */}
        <View style={[styles.progressTrack, !isMe && styles.progressTrackLight]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%` },
              isMe && styles.progressFillMe,
            ]}
          />
        </View>

        {/* Duration */}
        <Text style={[styles.duration, { color: secondaryTextColor }]}>
          {playbackStatus === 'playing' || playbackStatus === 'paused'
            ? `${formatDuration(position)} / ${formatDuration(totalDuration)}`
            : formatDuration(totalDuration || initialDuration || 0)}
        </Text>
      </View>

      {/* Time and status */}
      <View style={styles.footer}>
        <Text style={[styles.time, { color: secondaryTextColor }]}>{time}</Text>
        {isMe && status && (
          <View style={styles.statusWrapper}>
            {status === 'sending' && (
              <Ionicons name="sync" size={11} color={secondaryTextColor} />
            )}
            {status === 'sent' && (
              Icons.checkmark(11, secondaryTextColor)
            )}
            {status === 'delivered' && (
              <View style={styles.doubleCheck}>
                {Icons.checkmark(10, secondaryTextColor)}
                <View style={{ marginLeft: -4 }}>
                  {Icons.checkmark(10, secondaryTextColor)}
                </View>
              </View>
            )}
            {status === 'read' && (
              <View style={styles.doubleCheck}>
                {Icons.checkmark(10, '#5DADE2')}
                <View style={{ marginLeft: -4 }}>
                  {Icons.checkmark(10, '#5DADE2')}
                </View>
              </View>
            )}
            {status === 'failed' && (
              <Ionicons name="alert-circle" size={12} color={colors.status.error} />
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.lg,
    minWidth: 180,
    maxWidth: 280,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 138, 243, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  waveformContainer: {
    flex: 1,
    marginLeft: spacing.sm,
    marginRight: spacing.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0, 138, 243, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressTrackLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressFillMe: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  duration: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  time: {
    ...typography.caption,
    fontSize: 10,
  },
  statusWrapper: {
    marginLeft: 4,
  },
  doubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default VoiceMessageBubble;
