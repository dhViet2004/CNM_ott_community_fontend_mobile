import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { colors, spacing, typography } from '@theme';
import Avatar from '@components/common/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.72;

interface MessageBubbleProps {
  id: string | number;
  senderId: string;
  senderName?: string;
  senderAvatar?: string | null;
  content: string;
  time: string;
  isMe: boolean;
  type: 'text' | 'image' | 'file' | 'sticker' | 'emoji';
  file_url?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isDeleted?: boolean;
  isRevoked?: boolean;
  onLongPress?: () => void;
  defaultName?: string;
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'sending':
      return <Text style={styles.statusIcon}>◷</Text>;
    case 'sent':
      return <Text style={styles.statusIcon}>✓</Text>;
    case 'delivered':
      return <Text style={styles.statusIcon}>✓✓</Text>;
    case 'read':
      return <Text style={[styles.statusIcon, styles.statusRead]}>✓✓</Text>;
    case 'failed':
      return <Text style={[styles.statusIcon, styles.statusFailed]}>⚠</Text>;
    default:
      return null;
  }
};

const MessageBubble: React.FC<MessageBubbleProps> = memo(({
  isMe,
  senderName,
  senderAvatar,
  content,
  time,
  type,
  file_url,
  status,
  isDeleted,
  isRevoked,
  onLongPress,
  defaultName,
}) => {
  const isRevokedOrDeleted = isDeleted || isRevoked;

  // Render content based on type
  const renderContent = () => {
    if (type === 'image' && file_url) {
      return (
        <Image
          source={{ uri: file_url }}
          style={styles.messageImage}
          resizeMode="cover"
        />
      );
    }

    if (type === 'sticker' || type === 'emoji') {
      return (
        <Text style={styles.stickerText}>
          {content}
        </Text>
      );
    }

    // Default: text content
    return (
      <Text
        style={[
          styles.messageText,
          isMe ? styles.textMe : styles.textOther,
        ]}
        numberOfLines={0}
      >
        {content}
      </Text>
    );
  };

  // Render footer with time and status
  const renderFooter = () => (
    <View style={[styles.messageFooter, isMe && styles.messageFooterMe]}>
      <Text style={[styles.messageTime, isMe ? styles.timeMe : styles.timeOther]}>
        {time}
      </Text>
      {isMe && status && (
        <StatusIcon status={status} />
      )}
    </View>
  );

  // Revoked/Deleted message
  if (isRevokedOrDeleted) {
    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}>
        {!isMe && (
          <Avatar
            uri={senderAvatar ?? undefined}
            name={senderName || defaultName || 'User'}
            size="xs"
          />
        )}
        <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
          {!isMe && senderName && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
            <Text style={[styles.revokedText, isMe && styles.revokedTextMe]}>
              Tin nhắn đã bị thu hồi
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Normal message
  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.85}
      style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
    >
      {!isMe && (
        <Avatar
          uri={senderAvatar ?? undefined}
          name={senderName || defaultName || 'User'}
          size="xs"
        />
      )}
      <View style={[styles.bubbleWrapper, isMe && styles.bubbleWrapperMe]}>
        {!isMe && senderName && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {renderContent()}
          {renderFooter()}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo - only re-render when content changes
  return (
    prevProps.id === nextProps.id &&
    prevProps.content === nextProps.content &&
    prevProps.time === nextProps.time &&
    prevProps.status === nextProps.status &&
    prevProps.isMe === nextProps.isMe &&
    prevProps.isDeleted === nextProps.isDeleted &&
    prevProps.isRevoked === nextProps.isRevoked
  );
});

const styles = StyleSheet.create({
  // Layout containers
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },

  // Bubble wrapper - handles alignment
  bubbleWrapper: {
    flexDirection: 'column',
    maxWidth: MAX_BUBBLE_WIDTH,
  },
  bubbleWrapperMe: {
    alignItems: 'flex-end',
  },

  // Sender name (for group chat)
  senderName: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: 2,
    marginLeft: spacing.sm,
  },

  // Message bubble
  messageBubble: {
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.background.chatBubbleOther,
    borderBottomLeftRadius: 4,
  },

  // Message content
  messageText: {
    ...typography.body,
  },
  textMe: {
    color: colors.text.inverse,
  },
  textOther: {
    color: colors.text.primary,
  },

  // Image message
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.tertiary,
  },

  // Sticker/Emoji
  stickerText: {
    fontSize: 64,
    textAlign: 'center',
  },

  // Footer with time and status
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  messageFooterMe: {
    justifyContent: 'flex-end',
  },
  messageTime: {
    ...typography.caption,
    fontSize: 11,
  },
  timeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  timeOther: {
    color: colors.text.tertiary,
  },

  // Status icon
  statusIcon: {
    ...typography.caption,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 4,
  },
  statusRead: {
    color: '#4FC3F7', // Blue for read
  },
  statusFailed: {
    color: '#FF6B6B', // Red for failed
  },

  // Revoked message
  revokedText: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  revokedTextMe: {
    color: 'rgba(255,255,255,0.5)',
  },
});

export default MessageBubble;
