import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface VideoSurfaceProps {
  uid: number;
  isLocal?: boolean;
  callType: 'audio' | 'video';
  remoteName?: string;
}

const VideoSurface: React.FC<VideoSurfaceProps> = ({
  uid: _uid,
  isLocal = false,
  callType,
  remoteName,
}) => {
  if (callType === 'audio') {
    return (
      <View style={styles.audioPlaceholder}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={64} color="#FFFFFF" />
        </View>
        <Text style={styles.remoteName}>{remoteName || 'Người dùng'}</Text>
        <Text style={styles.statusText}>
          {isLocal ? 'Bạn' : 'Đang kết nối...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.videoContainer, isLocal && styles.localVideo]}>
      <View style={styles.videoPlaceholder}>
        <Ionicons
          name={isLocal ? 'videocam' : 'videocam-off'}
          size={32}
          color="rgba(255,255,255,0.5)"
        />
        <Text style={styles.placeholderText}>
          {isLocal ? 'Camera của bạn' : remoteName || 'Đang kết nối...'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  audioPlaceholder: {
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
  videoContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    overflow: 'hidden',
  },
  localVideo: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  placeholderText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 8,
  },
});

export default VideoSurface;
