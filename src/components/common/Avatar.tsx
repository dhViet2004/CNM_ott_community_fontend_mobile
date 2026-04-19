import React from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography, shadows } from '@theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  showOnlineIndicator?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

const Avatar: React.FC<AvatarProps> = ({
  uri,
  name = '',
  size = 'md',
  online,
  showOnlineIndicator = false,
  onPress,
  style,
}) => {
  const getSizeValue = (): number => {
    switch (size) {
      case 'xs':
        return 24;
      case 'sm':
        return spacing.iconSize.avatarSm;
      case 'lg':
        return spacing.iconSize.avatarLg;
      case 'xl':
        return 80;
      default:
        return spacing.iconSize.avatar;
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'xs':
        return 10;
      case 'sm':
        return 12;
      case 'lg':
        return 24;
      case 'xl':
        return 32;
      default:
        return 16;
    }
  };

  const getIndicatorSize = (): number => {
    const avatarSize = getSizeValue();
    if (avatarSize >= 64) return 14;
    if (avatarSize >= 48) return 12;
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

  const sizeValue = getSizeValue();
  const initials = getInitials(name);
  const indicatorSize = getIndicatorSize();

  const avatarContent = uri ? (
    <Image
      source={{ uri }}
      style={[styles.image, { width: sizeValue, height: sizeValue, borderRadius: sizeValue / 2 }]}
    />
  ) : (
    <View
      style={[
        styles.placeholder,
        {
          width: sizeValue,
          height: sizeValue,
          borderRadius: sizeValue / 2,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: getFontSize() }]}>{initials}</Text>
    </View>
  );

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.wrapper, style]}
    >
      <View
        style={[
          shadows.sm,
          {
            borderRadius: sizeValue / 2,
          },
        ]}
      >
        {avatarContent}
      </View>
      {showOnlineIndicator && online !== undefined && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: indicatorSize,
              height: indicatorSize,
              borderRadius: indicatorSize / 2,
              backgroundColor: online ? colors.badge.online : colors.badge.offline,
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
    backgroundColor: colors.primary,
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
});

export default Avatar;