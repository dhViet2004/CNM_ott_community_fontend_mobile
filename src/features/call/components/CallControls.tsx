import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CallControlsProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean;
  callType: 'audio' | 'video';
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
  onSwitchCamera?: () => void;
}

const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  isCameraOff,
  isSpeakerOn,
  callType,
  onToggleMute,
  onToggleCamera,
  onToggleSpeaker,
  onEndCall,
  onSwitchCamera,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.roundButton} onPress={onToggleSpeaker}>
        <Ionicons
          name={isSpeakerOn ? 'volume-high' : 'volume-mute'}
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      {callType === 'video' && (
        <TouchableOpacity style={styles.roundButton} onPress={onToggleCamera}>
          <Ionicons
            name={isCameraOff ? 'videocam-off' : 'videocam'}
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      )}

      {callType === 'video' && onSwitchCamera && (
        <TouchableOpacity style={styles.roundButton} onPress={onSwitchCamera}>
          <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.roundButton} onPress={onToggleMute}>
        <Ionicons
          name={isMuted ? 'mic-off' : 'mic'}
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.endCallButton} onPress={onEndCall}>
        <Ionicons name="call" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  roundButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endCallButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CallControls;
