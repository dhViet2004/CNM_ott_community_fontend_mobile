import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography } from '@theme';

type InputVariant = 'default' | 'filled' | 'outline';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  variant?: InputVariant;
  size?: InputSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  style,
  editable,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = (): string => {
    if (error) return colors.status.error;
    if (isFocused) return colors.border.focus;
    return colors.border.default;
  };

  const getBackgroundColor = (): string => {
    if (variant === 'filled') return colors.background.secondary;
    return colors.background.primary;
  };

  const getPadding = (): { paddingVertical: number; paddingHorizontal: number } => {
    switch (size) {
      case 'sm':
        return { paddingVertical: spacing.xs, paddingHorizontal: spacing.md };
      case 'lg':
        return { paddingVertical: spacing.md, paddingHorizontal: spacing.lg };
      default:
        return { paddingVertical: spacing.sm, paddingHorizontal: spacing.md };
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

  const inputHeight = () => {
    switch (size) {
      case 'sm':
        return 36;
      case 'lg':
        return 52;
      default:
        return 44;
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { marginBottom: spacing.xs }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor: getBorderColor(),
            backgroundColor: getBackgroundColor(),
            ...getPadding(),
            height: inputHeight(),
          },
          isFocused && styles.focused,
          editable === false && styles.disabled,
        ]}
      >
        {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            {
              fontSize: getFontSize(),
              height: inputHeight() - getPadding().paddingVertical * 2,
            },
            style,
          ]}
          placeholderTextColor={colors.text.placeholder}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.iconRight}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { marginTop: spacing.xs }]}>{error}</Text>}
      {hint && !error && (
        <Text style={[styles.hint, { marginTop: spacing.xs }]}>{hint}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
  },
  focused: {
    borderWidth: 2,
  },
  disabled: {
    backgroundColor: colors.background.tertiary,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    color: colors.text.primary,
    paddingVertical: 0,
    ...typography.body,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
  error: {
    ...typography.caption,
    color: colors.status.error,
  },
  hint: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});

export default Input;