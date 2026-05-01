import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@theme';
import Avatar from '@components/common/Avatar';
import Badge from '@components/common/Badge';
import { Icons, IconSize } from '@components/common';

interface MessageListItemProps {
  avatarUri?: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  isOnline?: boolean;
  isGroup?: boolean;
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
  onPress,
  onLongPress,
  style,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.container, style]}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          uri={avatarUri}
          name={name}
          size="md"
          showOnlineIndicator={!isGroup}
          online={isOnline}
        />
        {isGroup && (
          <View style={styles.groupIconBadge}>
            <View style={styles.groupIconInner}>
              {Icons.people(10)}
            </View>
          </View>
        )}
      </View>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={styles.nameRow}>
            {isGroup && (
              <View style={styles.groupBadgeContainer}>
                {Icons.people(IconSize.xs)}
              </View>
            )}
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <Text style={styles.time}>{time}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastMessage}
          </Text>
          {unreadCount > 0 && (
            <Badge count={unreadCount} variant="unread" size="sm" />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.listItemPadding,
    backgroundColor: colors.background.primary,
  },
  avatarContainer: {
    position: 'relative',
  },
  groupIconBadge: {
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
  groupIconInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupBadgeContainer: {
    marginRight: spacing.xs,
  },
  name: {
    flex: 1,
    ...typography.subtitle,
    color: colors.text.primary,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  time: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  lastMessage: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
});

export default MessageListItem;
