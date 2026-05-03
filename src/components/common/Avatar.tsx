import React, { useState } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, spacing, typography, shadows } from '@theme';
import { Icons } from '@components/common';

type AvatarSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarVariant = 'user' | 'group' | 'system_folder' | 'system_document';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  showOnlineIndicator?: boolean;
  variant?: AvatarVariant;
  onPress?: () => void;
  style?: ViewStyle;
}

const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F0A500', '#00B894',
];

const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '',
  size = 'md',
  online,
  showOnlineIndicator = false,
  variant = 'user',
  onPress,
  style,
}) => {
  const getSizeValue = (): number => {
    switch (size) {
      case 'xxs': return 16;
      case 'xs': return 24;
      case 'sm': return spacing.iconSize.avatarSm;
      case 'lg': return spacing.iconSize.avatarLg;
      case 'xl': return 80;
      default: return spacing.iconSize.avatar;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'xxs': return 8;
      case 'xs': return 10;
      case 'sm': return 12;
      case 'lg': return 24;
      case 'xl': return 32;
      default: return 16;
    }
  };

  const getIndicatorSize = (): number => {
    const s = getSizeValue();
    if (s >= 64) return 14;
    if (s >= 48) return 12;
    return 8;
  };

  const getInitials = (nameStr: string): string => {
    if (!nameStr) return '?';
    const parts = nameStr.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (nameStr: string): string => {
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  };

  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const sizeValue = getSizeValue();
  const initials = getInitials(name);
  const indicatorSize = getIndicatorSize();
  const bgColor = getAvatarColor(name || 'User');

  const renderContent = () => {
    if (variant === 'system_folder') {
      const iconSize = Math.max(sizeValue * 0.5, 20);
      return (
        <View style={[styles.systemIconBg, { backgroundColor: '#008AF3' }]}>
          {Icons.folder(iconSize, '#FFFFFF')}
        </View>
      );
    }

    if (variant === 'system_document') {
      const iconSize = Math.max(sizeValue * 0.5, 20);
      return (
        <View style={[styles.systemIconBg, { backgroundColor: '#6C757D' }]}>
          {Icons.fileText(iconSize, '#FFFFFF')}
        </View>
      );
    }

    if (uri && !hasError) {
      return (
        <View>
          <Image
            source={{ uri }}
            style={[
              styles.image,
              { width: sizeValue, height: sizeValue, borderRadius: sizeValue / 2 },
            ]}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => setHasError(true)}
          />
          {isLoading && (
            <View
              style={[
                StyleSheet.absoluteFill,
                styles.placeholder,
                { borderRadius: sizeValue / 2 },
              ]}
            >
              <ActivityIndicator size="small" color={colors.text.inverse} />
            </View>
          )}
        </View>
      );
    }

    return (
      <View
        style={[
          styles.placeholder,
          {
            width: sizeValue,
            height: sizeValue,
            borderRadius: sizeValue / 2,
            backgroundColor: bgColor,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize: getFontSize() }]}>{initials}</Text>
      </View>
    );
  };

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper onPress={onPress} activeOpacity={0.75} style={[styles.wrapper, style]}>
      <View
        style={[
          shadows.sm,
          { borderRadius: sizeValue / 2 },
        ]}
      >
        {renderContent()}
      </View>
      {showOnlineIndicator && online === true && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              backgroundColor: colors.badge.online,
              borderWidth: sizeValue >= 48 ? 2 : 1,
              borderColor: colors.background.primary,
            },
          ]}
        />
      )}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    backgroundColor: colors.background.tertiary,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  systemIconBg: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Avatar;
