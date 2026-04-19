import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { colors, spacing, typography, shadows } from '@theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled,
  style,
  ...props
}) => {
  const isDisabled = disabled || loading;

  const getBackgroundColor = (): string => {
    if (isDisabled) return colors.background.tertiary;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.background.secondary;
      case 'danger':
        return colors.status.error;
      case 'outline':
      case 'ghost':
        return 'transparent';
      default:
        return colors.primary;
    }
  };

  const getTextColor = (): string => {
    if (isDisabled) return colors.text.tertiary;
    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.text.inverse;
      case 'secondary':
        return colors.text.primary;
      case 'outline':
      case 'ghost':
        return colors.primary;
      default:
        return colors.text.inverse;
    }
  };

  const getBorderColor = (): string => {
    if (isDisabled) return colors.border.light;
    if (variant === 'outline') return colors.primary;
    return 'transparent';
  };

  const getPadding = (): { paddingVertical: number; paddingHorizontal: number } => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.xs, paddingHorizontal: spacing.md };
      case 'lg':
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.xxl };
      default:
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg };
    }
  };

  const getFontSize = (): number => {
    switch (size) {
      case 'sm':
        return 14;
      case 'lg':
        return 18;
      default:
        return 16;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        shadows.sm,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === 'outline' ? 1.5 : 0,
          ...getPadding(),
        },
        fullWidth && styles.fullWidth,
        style as ViewStyle,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text
            style={[
              styles.text,
              {
                color: getTextColor(),
                fontSize: getFontSize(),
                marginLeft: icon && iconPosition === 'left' ? spacing.xs : 0,
                marginRight: icon && iconPosition === 'right' ? spacing.xs : 0,
              },
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing.borderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },
  text: {
    ...typography.button,
    textAlign: 'center',
  },
});

export default Button;