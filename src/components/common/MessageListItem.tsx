import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@theme';
import Avatar from './Avatar';
import Badge from './Badge';

interface MessageListItemProps {
  avatarUri?: string;
  name: string;
  lastMessage: string;
  time: string;
  unreadCount?: number;
  isOnline?: boolean;
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
      <Avatar
        uri={avatarUri}
        name={name}
        size="md"
        showOnlineIndicator
        online={isOnline}
      />
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
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
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
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
  lastMessage: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
});

export default MessageListItem;