import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@theme';

type BadgeVariant = 'unread' | 'success' | 'warning' | 'info' | 'dot';

interface BadgeProps {
  count?: number;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  maxCount?: number;
  showWhenZero?: boolean;
  style?: ViewStyle;
}

const Badge: React.FC<BadgeProps> = ({
  count,
  variant = 'unread',
  size = 'md',
  maxCount = 99,
  showWhenZero = false,
  style,
}) => {
  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'unread':
        return colors.badge.unread;
      case 'success':
        return colors.badge.online;
      case 'warning':
        return colors.status.warning;
      case 'info':
        return colors.status.info;
      case 'dot':
        return colors.primary;
      default:
        return colors.badge.unread;
    }
  };

  const getSize = (): { width: number; height: number; fontSize: number } => {
    switch (size) {
      case 'sm':
        return { width: 16, height: 16, fontSize: 9 };
      case 'lg':
        return { width: 28, height: 28, fontSize: 13 };
      default:
        return { width: 20, height: 20, fontSize: 11 };
    }
  };

  const sizeConfig = getSize();

  if (count === 0 && !showWhenZero) {
    return null;
  }

  if (variant === 'dot') {
    return (
      <View
        style={[
          styles.dot,
          {
            backgroundColor: getBackgroundColor(),
            width: sizeConfig.width * 0.6,
            height: sizeConfig.height * 0.6,
            borderRadius: (sizeConfig.width * 0.6) / 2,
          },
          style,
        ]}
      />
    );
  }

  const displayCount = count !== undefined && count > maxCount ? `${maxCount}+` : count;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getBackgroundColor(),
          minWidth: sizeConfig.width,
          height: sizeConfig.height,
          borderRadius: sizeConfig.height / 2,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: sizeConfig.fontSize }]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    flexDirection: 'row',
  },
  text: {
    color: colors.text.inverse,
    ...typography.badge,
    textAlign: 'center',
  },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Badge;