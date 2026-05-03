import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@theme';
import Avatar from '@components/common/Avatar';
import { Icons, IconSize } from '@components/common';

interface MessageListItemProps {
  avatarUri?: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  isOnline?: boolean;
  isGroup?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  variant?: 'user' | 'group' | 'system_folder' | 'system_document';
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
}

const MessageListItem: React.FC<MessageListItemProps> = ({
  avatarUri,
  name,
  lastMessage,
  time,
  unreadCount = 0,
  isOnline,
  isGroup = false,
  isPinned = false,
  isMuted = false,
  variant = 'user',
  onPress,
  onLongPress,
  style,
}) => {
  const hasUnread = unreadCount > 0;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.container, style]}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <Avatar
          uri={avatarUri}
          name={name}
          size="md"
          variant={variant}
          showOnlineIndicator={!isGroup}
          online={isOnline}
        />
        {/* Group multi-user badge */}
        {isGroup && (
          <View style={styles.groupBadge}>
            <View style={styles.groupBadgeInner}>
              {Icons.people(9)}
            </View>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Row 1: Name + Meta info */}
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            {isGroup && (
              <View style={styles.groupIconPrefix}>
                {Icons.userGroup(13, colors.text.secondary)}
              </View>
            )}
            <Text
              style={[styles.name, hasUnread && styles.nameUnread]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>

          {/* Meta info (right side) */}
          <View style={styles.metaRow}>
            {isPinned && (
              <View style={styles.pinIcon}>
                {Icons.pin(10, colors.text.tertiary)}
              </View>
            )}
            <Text style={[styles.time, hasUnread && styles.timeUnread]}>
              {time}
            </Text>
          </View>
        </View>

        {/* Row 2: Preview + Badges */}
        <View style={styles.bottomRow}>
          <View style={styles.previewRow}>
            {/* Muted icon */}
            {isMuted && (
              <View style={styles.mutedIcon}>
                {Icons.bellOff(12, colors.text.tertiary)}
              </View>
            )}
            {/* Message preview */}
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {lastMessage === 'accepted'
                ? 'Đã chấp nhận lời mời'
                : (lastMessage || 'Bắt đầu trò chuyện')}
            </Text>
          </View>

          {/* Right-side badges */}
          <View style={styles.badgesRow}>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
            {isMuted && !hasUnread && (
              <View style={styles.mutedBadge}>
                {Icons.bellOff(13, colors.text.tertiary)}
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.listItemPadding,
    paddingHorizontal: spacing.screenPadding,
    backgroundColor: colors.background.primary,
  },
  avatarContainer: {
    position: 'relative',
  },
  groupBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  groupBadgeInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: spacing.listItemPadding,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.xs,
  },
  groupIconPrefix: {
    marginRight: spacing.xs,
    opacity: 0.6,
  },
  name: {
    ...typography.subtitle,
    color: colors.text.primary,
    fontWeight: '500',
    fontSize: 15,
    flexShrink: 1,
  },
  nameUnread: {
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  pinIcon: {
    marginRight: 3,
  },
  time: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.tertiary,
  },
  timeUnread: {
    color: colors.primary,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  mutedIcon: {
    marginRight: 4,
  },
  lastMessage: {
    ...typography.bodySmall,
    fontSize: 13,
    color: '#8A8D91',
    flex: 1,
  },
  lastMessageUnread: {
    color: colors.text.primary,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    ...typography.badge,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  mutedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MessageListItem;
