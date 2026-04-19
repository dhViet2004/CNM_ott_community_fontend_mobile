import React, { useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Text,
  ScrollView,
  Dimensions,
} from 'react-native';
import { colors, spacing, shadows } from '@theme';
import { Avatar } from '@components/common';
import type { ProfileUser } from '../data/mockUsers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 200;
const AVATAR_SIZE = 96;

interface CoverHeaderProps {
  user: ProfileUser;
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

  return (
    <View style={styles.container}>
      {/* Ảnh bìa với Parallax */}
      <Animated.View
        style={[
          styles.coverWrapper,
          getParallaxStyle(),
        ]}
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

        {/* Gradient overlay */}
        <View style={styles.coverOverlay} />

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
            <Avatar
              uri={user.avatarUrl}
              name={user.fullName}
              size="xl"
              showOnlineIndicator={!isMyProfile}
              online={user.isOnline}
            />

            {/* Viền trắng avatar */}
            <View style={styles.avatarBorder} />

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
});

export default CoverHeader;