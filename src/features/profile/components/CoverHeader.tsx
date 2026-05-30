import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  Dimensions,
  Modal,
  Alert,
  Share,
} from 'react-native';
import { colors, spacing, shadows } from '@theme';
import { Avatar } from '@components/common';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 200;
const AVATAR_SIZE = 80;

export interface CoverHeaderUser {
  id?: string;
  fullName: string;
  avatarUrl?: string;
  coverUrl?: string;
  isOnline?: boolean;
}

interface CoverHeaderProps {
  user: CoverHeaderUser;
  isMyProfile: boolean;
  scrollY?: Animated.Value;
  onChangeCoverPress?: () => void;
  onChangeAvatarPress?: () => void;
}

const CoverHeader: React.FC<CoverHeaderProps> = ({
  user,
  isMyProfile,
  scrollY,
  onChangeCoverPress,
  onChangeAvatarPress,
}) => {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  const getParallaxStyle = () => {
    if (!scrollY) return {};
    return {
      transform: [
        {
          translateY: scrollY.interpolate({
            inputRange: [-COVER_HEIGHT, 0, COVER_HEIGHT],
            outputRange: [-COVER_HEIGHT / 2, 0, COVER_HEIGHT * 0.3],
            extrapolate: 'clamp',
          }),
        },
        {
          scale: scrollY.interpolate({
            inputRange: [-100, 0],
            outputRange: [1.5, 1],
            extrapolate: 'clamp',
          }),
        },
      ],
    };
  };

  const avatarOverlayStyle = scrollY
    ? {
        transform: [
          {
            scale: scrollY.interpolate({
              inputRange: [-50, 0, COVER_HEIGHT],
              outputRange: [1.3, 1, 0.85],
              extrapolate: 'clamp',
            }),
          },
        ],
        opacity: scrollY.interpolate({
          inputRange: [0, COVER_HEIGHT * 0.6],
          outputRange: [1, 0],
          extrapolate: 'clamp',
        }),
      }
    : {};

  const handleCoverPress = () => {
    if (isMyProfile) {
      Alert.alert('Ảnh bìa', undefined, [
        {
          text: 'Xem ảnh bìa',
          onPress: () => {
            if (user.coverUrl) {
              setViewerUrl(user.coverUrl);
            } else {
              Alert.alert('Thông báo', 'Bạn chưa cài đặt ảnh bìa');
            }
          },
        },
        {
          text: 'Thay đổi ảnh bìa',
          onPress: onChangeCoverPress,
        },
        { text: 'Hủy', style: 'cancel' },
      ]);
    } else {
      if (user.coverUrl) {
        setViewerUrl(user.coverUrl);
      }
    }
  };

  const handleAvatarPress = () => {
    if (isMyProfile) {
      Alert.alert('Ảnh đại diện', undefined, [
        {
          text: 'Xem ảnh đại diện',
          onPress: () => {
            if (user.avatarUrl) {
              setViewerUrl(user.avatarUrl);
            } else {
              Alert.alert('Thông báo', 'Bạn chưa cài đặt ảnh đại diện');
            }
          },
        },
        {
          text: 'Thay đổi ảnh đại diện',
          onPress: onChangeAvatarPress,
        },
        { text: 'Hủy', style: 'cancel' },
      ]);
    } else {
      if (user.avatarUrl) {
        setViewerUrl(user.avatarUrl);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Ảnh bìa với Parallax */}
      <Animated.View
        style={[
          styles.coverWrapper,
          getParallaxStyle(),
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleCoverPress}
          style={StyleSheet.absoluteFill}
        >
          {user.coverUrl ? (
            <Image
              source={{ uri: user.coverUrl }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.coverPlaceholderText}>
                {user.fullName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Gradient overlay */}
        <View style={styles.coverOverlay} pointerEvents="none" />

        {/* Nút đổi ảnh bìa */}
        {isMyProfile && (
          <TouchableOpacity
            style={styles.coverCameraButton}
            onPress={onChangeCoverPress}
            activeOpacity={0.8}
          >
            <View style={styles.cameraIconContainer}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Avatar đè lên ảnh bìa */}
      <View style={styles.avatarSection}>
        <Animated.View style={[styles.avatarWrapper, avatarOverlayStyle]}>
          <View style={[styles.avatarContainer, shadows.md]}>
            <TouchableOpacity activeOpacity={0.9} onPress={handleAvatarPress}>
              <Avatar
                uri={user.avatarUrl}
                name={user.fullName}
                size="xl"
                showOnlineIndicator={!isMyProfile}
                online={user.isOnline}
              />
            </TouchableOpacity>

            {/* Viền trắng avatar */}
            <View style={styles.avatarBorder} pointerEvents="none" />

            {/* Nút đổi avatar */}
            {isMyProfile && (
              <TouchableOpacity
                style={styles.avatarCameraButton}
                onPress={onChangeAvatarPress}
                activeOpacity={0.8}
              >
                <Text style={styles.avatarCameraIcon}>📷</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Online indicator badge */}
        {!isMyProfile && user.isOnline && (
          <View style={styles.onlineBadge}>
            <Text style={styles.onlineBadgeText}>Đang hoạt động</Text>
          </View>
        )}
      </View>

      {/* ── Full-Screen Lightbox Image Viewer Modal ── */}
      <Modal
        visible={!!viewerUrl}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUrl(null)}
      >
        <View style={styles.lightboxContainer}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setViewerUrl(null)} />
          {/* Header */}
          <View style={styles.lightboxHeader}>
            <TouchableOpacity onPress={() => setViewerUrl(null)} style={styles.lightboxButton}>
              <Text style={styles.lightboxCloseText}>Đóng</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (viewerUrl) {
                  Share.share({ message: viewerUrl });
                }
              }}
              style={styles.lightboxButton}
            >
              <Text style={styles.lightboxShareText}>Chia sẻ</Text>
            </TouchableOpacity>
          </View>

          {/* Image */}
          {viewerUrl && (
            <Image
              source={{ uri: viewerUrl }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT + AVATAR_SIZE / 2,
    backgroundColor: colors.background.primary,
    position: 'relative',
  },
  coverWrapper: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.tertiary,
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlaceholderText: {
    fontSize: 64,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  coverCameraButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },
  cameraIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: {
    fontSize: 16,
  },
  avatarSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBorder: {
    position: 'absolute',
    width: AVATAR_SIZE + 4,
    height: AVATAR_SIZE + 4,
    borderRadius: (AVATAR_SIZE + 4) / 2,
    borderWidth: 3,
    borderColor: colors.background.primary,
    top: -2,
    left: -2,
  },
  avatarCameraButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraIcon: {
    fontSize: 12,
  },
  onlineBadge: {
    marginTop: spacing.xs,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.borderRadius.full,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.badge.online,
  },
  lightboxContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxHeader: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 100,
  },
  lightboxButton: {
    padding: 8,
  },
  lightboxCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lightboxShareText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lightboxImage: {
    width: '100%',
    height: '80%',
  },
});

export default CoverHeader;
