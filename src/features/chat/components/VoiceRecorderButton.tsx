import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

/**
 * Props cho VoiceRecorderButton
 */
export interface VoiceRecorderButtonProps {
  /**
   * Callback khi ghi âm hoàn tất - trả về URI của file audio
   */
  onRecordingComplete?: (audioUri: string) => void;

  /**
   * Callback khi hủy ghi âm
   */
  onRecordingCancel?: () => void;

  /**
   * Callback khi bắt đầu ghi âm
   */
  onRecordingStart?: () => void;

  /**
   * Kích thước icon
   * @default 24
   */
  iconSize?: number;

  /**
   * Màu icon khi không ghi âm
   * @default colors.text.secondary
   */
  iconColor?: string;
}

export const VoiceRecorderButton: React.FC<VoiceRecorderButtonProps> = ({
  onRecordingComplete,
  onRecordingCancel,
  onRecordingStart,
  iconSize = 24,
  iconColor = colors.text.secondary,
}) => {
  const [showRecorder, setShowRecorder] = useState(false);

  const {
    isRecording,
    audioUri,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording,
    resetAudio,
  } = useAudioRecorder();

  /**
   * Format thời gian từ giây sang mm:ss
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Xử lý bắt đầu ghi âm
   */
  const handleStart = useCallback(async () => {
    setShowRecorder(true);
    onRecordingStart?.();
    await startRecording();
  }, [startRecording, onRecordingStart]);

  /**
   * Xử lý dừng ghi âm
   */
  const handleStop = useCallback(async () => {
    await stopRecording();
  }, [stopRecording]);

  /**
   * Xử lý hủy ghi âm
   */
  const handleCancel = useCallback(async () => {
    await cancelRecording();
    setShowRecorder(false);
    onRecordingCancel?.();
  }, [cancelRecording, onRecordingCancel]);

  /**
   * Xử lý gửi audio
   */
  const handleSend = useCallback(async () => {
    if (audioUri) {
      onRecordingComplete?.(audioUri);
      resetAudio();
      setShowRecorder(false);
    }
  }, [audioUri, onRecordingComplete, resetAudio]);

  /**
   * Xử lý nhấn nút mic
   */
  const handleMicPress = useCallback(async () => {
    if (isRecording) {
      await handleStop();
    } else if (audioUri) {
      await handleSend();
    } else {
      await handleStart();
    }
  }, [isRecording, audioUri, handleStart, handleStop, handleSend]);

  // Show recorder UI when recording or has recorded audio
  if (showRecorder || isRecording || audioUri) {
    return (
      <View style={styles.recorderContainer}>
        {/* Cancel button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* Stop button - only show when recording */}
        {isRecording && (
          <TouchableOpacity
            style={styles.stopBtn}
            onPress={handleStop}
            activeOpacity={0.7}
          >
            <Ionicons name="stop" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Duration display */}
        <View style={styles.durationContainer}>
          <Ionicons
            name="mic"
            size={16}
            color={isRecording ? colors.status.error : colors.primary}
            style={isRecording && styles.recordingPulse}
          />
          <Text style={[
            styles.durationText,
            isRecording && styles.durationTextRecording
          ]}>
            {isRecording ? 'Đang ghi âm...' : 'Đã ghi âm'}
          </Text>
          <Text style={[
            styles.durationTime,
            isRecording && styles.durationTimeRecording
          ]}>
            {formatTime(recordingTime)}
          </Text>
        </View>

        {/* Send button - only show when has recorded audio */}
        {audioUri && !isRecording && (
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={handleSend}
            activeOpacity={0.7}
          >
            <ActivityIndicator size="small" color={colors.text.inverse} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Default state - just mic button
  return (
    <TouchableOpacity
      style={styles.micBtn}
      onPress={handleMicPress}
      activeOpacity={0.7}
    >
      <Ionicons name="mic-outline" size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  micBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recorderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 20,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    minWidth: 180,
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  recordingPulse: {
    marginRight: spacing.xs,
  },
  durationText: {
    ...typography.caption,
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginRight: spacing.xs,
  },
  durationTextRecording: {
    color: colors.status.error,
  },
  durationTime: {
    ...typography.caption,
    fontSize: 14,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  durationTimeRecording: {
    color: colors.status.error,
    fontWeight: '600',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VoiceRecorderButton;
