import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  transparent?: boolean;
  useZaloStyle?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  leftContent,
  rightContent,
  transparent = false,
  useZaloStyle = true,
}: HeaderProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        useZaloStyle && { backgroundColor: colors.primary },
        transparent && styles.transparent,
        { paddingTop: insets.top },
      ]}
    >
      <StatusBar
        barStyle={useZaloStyle ? 'light-content' : 'dark-content'}
        backgroundColor={useZaloStyle ? colors.primary : 'transparent'}
        translucent={transparent}
      />
      <View style={styles.content}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.backText, useZaloStyle && styles.lightText]}>
                {'<'}
              </Text>
            </TouchableOpacity>
          )}
          {leftContent}
        </View>

        {title && (
          <Text
            style={[
              styles.title,
              useZaloStyle && styles.lightText,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}

        <View style={styles.right}>{rightContent}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 0,
  },
  transparent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  content: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    textAlign: 'center',
    flex: 2,
  },
  lightText: {
    color: colors.text.inverse,
  },
  backButton: {
    paddingRight: spacing.sm,
  },
  backText: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '300',
  },
});

export default Header;