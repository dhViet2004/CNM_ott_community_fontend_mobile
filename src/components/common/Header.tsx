import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import Avatar from './Avatar';

interface HeaderAction {
  icon: React.ReactNode;
  onPress: () => void;
  hitSlop?: { top?: number; bottom?: number; left?: number; right?: number };
}

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  rightActions?: HeaderAction[];
  transparent?: boolean;
  useZaloStyle?: boolean;
  variant?: 'default' | 'chat';

  // Chat-specific props
  avatarUrl?: string | null;
  subtitle?: string;
  onlineIndicator?: boolean;
}

const ZALO_BLUE = '#008AF3';

const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  leftContent,
  rightContent,
  rightActions,
  transparent = false,
  useZaloStyle = true,
  variant = 'default',
  avatarUrl,
  subtitle,
  onlineIndicator = false,
}: HeaderProps) => {
  const insets = useSafeAreaInsets();
  const isChatVariant = variant === 'chat';

  return (
    <View
      style={[
        styles.container,
        useZaloStyle && { backgroundColor: isChatVariant ? ZALO_BLUE : colors.primary },
        transparent && styles.transparent,
        { paddingTop: insets.top },
      ]}
    >
      <StatusBar
        barStyle={useZaloStyle ? 'light-content' : 'dark-content'}
        backgroundColor={useZaloStyle ? (isChatVariant ? ZALO_BLUE : colors.primary) : 'transparent'}
        translucent={transparent}
      />
      <View style={[styles.content, isChatVariant && styles.chatContent]}>
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              onPress={onBackPress}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color={useZaloStyle ? '#FFFFFF' : colors.text.primary} />
            </TouchableOpacity>
          )}
          {isChatVariant && avatarUrl !== undefined ? (
            <View style={styles.chatLeftInner}>
              <Avatar
                uri={avatarUrl || undefined}
                name={title}
                size="md"
                style={styles.chatAvatar}
              />
              {onlineIndicator && <View style={styles.onlineDot} />}
            </View>
          ) : null}
          {leftContent}
        </View>

        {isChatVariant && avatarUrl !== undefined ? (
          <TouchableOpacity
            style={styles.chatCenter}
            activeOpacity={0.7}
            onPress={undefined}
            disabled
          >
            <Text style={styles.chatTitle} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.chatSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </TouchableOpacity>
        ) : (
          title && (
            <Text
              style={[
                styles.title,
                useZaloStyle && styles.lightText,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )
        )}

        <View style={styles.right}>
          {rightContent}
          {isChatVariant && rightActions?.map((action, index) => (
            <TouchableOpacity
              key={index}
              onPress={action.onPress}
              style={styles.chatIconBtn}
              hitSlop={action.hitSlop ?? { top: 10, bottom: 10, left: 6, right: 6 }}
            >
              {action.icon}
            </TouchableOpacity>
          ))}
        </View>
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
  chatContent: {
    height: 56,
    paddingHorizontal: spacing.md,
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
  // Chat variant styles
  chatLeftInner: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  chatAvatar: {},
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: ZALO_BLUE,
  },
  chatCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  chatSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: 1,
  },
  chatIconBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
});

export default Header;
