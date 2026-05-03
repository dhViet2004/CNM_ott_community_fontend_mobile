import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { colors, spacing, typography } from '@theme';
import Avatar from '@components/common/Avatar';
import { Icons } from '@components/common';
import VoiceMessageBubble from './VoiceMessageBubble';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_BUBBLE_WIDTH = SCREEN_WIDTH * 0.72;
const IMAGE_BUBBLE_WIDTH = SCREEN_WIDTH * 0.55;

// ─── Time Divider ─────────────────────────────────────────────────────────────
interface TimeDividerProps {
  label: string; // e.g. '01:09 Hôm qua'
}

export const TimeDivider: React.FC<TimeDividerProps> = ({ label }) => (
  <View style={styles.timeDividerContainer}>
    <View style={styles.timeDividerPill}>
      <Text style={styles.timeDividerText}>{label}</Text>
    </View>
  </View>
);

// ─── Delivered Status Pill ────────────────────────────────────────────────────
interface DeliveredPillProps {
  time: string; // e.g. '13:28'
}

export const DeliveredPill: React.FC<DeliveredPillProps> = ({ time }) => (
  <View style={styles.deliveredContainer}>
    <Text style={styles.deliveredTime}>{time}</Text>
    <View style={styles.deliveredPill}>
      {Icons.checkmarkDone(11, colors.text.inverse)}
      <Text style={styles.deliveredText}>Đã nhận</Text>
    </View>
  </View>
);

// ─── Call History Bubble ──────────────────────────────────────────────────────
export type CallType = 'incoming' | 'outgoing' | 'missed' | 'video_incoming' | 'video_outgoing' | 'video_missed';

interface CallHistoryBubbleProps {
  callType: CallType;
  title: string;        // e.g. 'Bạn đã hủy', 'Cuộc gọi video đi'
  duration?: string;   // e.g. '00:32'
  time: string;
  isMe: boolean;
}

export const CallHistoryBubble: React.FC<CallHistoryBubbleProps> = ({
  callType,
  title,
  duration,
  time,
  isMe,
}) => {
  const isVideo = callType.startsWith('video');
  const isMissed = callType.includes('missed');

  const icon = isVideo ? Icons.videocam(14, '#666') : Icons.call(14, '#666');
  const statusColor = isMissed ? colors.status.error : '#666';

  return (
    <View style={[styles.callRow, isMe ? styles.callRowMe : styles.callRowOther]}>
      {/* Avatar for received calls */}
      {!isMe && (
        <View style={styles.callAvatarContainer}>
          <Avatar name="User" size="xs" />
        </View>
      )}

      {/* Bubble card */}
      <View style={[styles.callBubble, isMe ? styles.callBubbleMe : styles.callBubbleOther]}>
        {/* Row 1: Title */}
        <Text
          style={[
            styles.callTitle,
            isMe ? styles.callTitleMe : styles.callTitleOther,
            isMissed && styles.callTitleMissed,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Row 2: Icon + duration/status */}
        <View style={styles.callMetaRow}>
          {icon}
          <Text style={[styles.callDuration, isMissed && { color: colors.status.error }]}>
            {isMissed ? 'Nhỡ' : (duration || '')}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.callDivider} />

        {/* Action button */}
        <TouchableOpacity style={styles.callActionBtn} activeOpacity={0.7}>
          <Text style={styles.callActionText}>GỌI LẠI</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Main Message Bubble ──────────────────────────────────────────────────────
interface MessageBubbleProps {
  id: string | number;
  senderId: string;
  senderName?: string;
  senderAvatar?: string | null;
  content: string;
  time: string;
  isMe: boolean;
  type: 'text' | 'image' | 'file' | 'sticker' | 'emoji' | 'call' | 'voice';
  file_url?: string | null;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isDeleted?: boolean;
  isRevoked?: boolean;
  onLongPress?: (msg: {
    id: string | number;
    content: string;
    type: string;
    isMe: boolean;
    senderName?: string;
    senderAvatar?: string | null;
    senderId: string;
  }) => void;
  defaultName?: string;
  isFocused?: boolean;
  callType?: CallType;
  callDuration?: string;
  isTimeDivider?: boolean;
  timeDividerLabel?: string;
  voiceDuration?: number;
}

const CheckIcon: React.FC<{ filled?: boolean }> = ({ filled }) =>
  filled
    ? Icons.checkmarkDone(12, '#5DADE2')
    : Icons.checkmark(12, '#CCC');

const StatusIcons: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'sending':
      return Icons.sync(11);
    case 'sent':
      return Icons.checkmark(11, 'rgba(255,255,255,0.6)');
    case 'delivered':
      return (
        <View style={styles.statusDoubleCheck}>
          {Icons.checkmark(10, 'rgba(255,255,255,0.6)')}
          <View style={{ marginLeft: -4 }}>
            {Icons.checkmark(10, 'rgba(255,255,255,0.6)')}
          </View>
        </View>
      );
    case 'read':
      return (
        <View style={styles.statusDoubleCheck}>
          {Icons.checkmark(10, '#5DADE2')}
          <View style={{ marginLeft: -4 }}>
            {Icons.checkmark(10, '#5DADE2')}
          </View>
        </View>
      );
    case 'failed':
      return Icons.alertCircle(12);
    default:
      return null;
  }
};

const MessageBubble: React.FC<MessageBubbleProps> = memo(({
  id,
  senderName,
  senderAvatar,
  content,
  time,
  isMe,
  type,
  file_url,
  status,
  isDeleted,
  isRevoked,
  onLongPress,
  defaultName,
  isFocused,
  callType = 'missed',
  callDuration,
  isTimeDivider,
  timeDividerLabel,
  voiceDuration,
}) => {
  // Time divider inline component
  if (isTimeDivider) {
    return <TimeDivider label={timeDividerLabel || time} />;
  }

  const isRevokedOrDeleted = isDeleted || isRevoked;

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress({ id, content, type, isMe, senderName, senderAvatar, senderId: String(id) });
    }
  };

  // ── Call history bubble ──────────────────────────────────────────────────
  if (type === 'call') {
    const callTitle = isMe
      ? content || 'Cuộc gọi đi'
      : (senderName ? `${senderName} đã gọi` : 'Cuộc gọi đến');
    return (
      <View style={styles.callWrapper}>
        <CallHistoryBubble
          callType={callType}
          title={callTitle}
          duration={callDuration}
          time={time}
          isMe={isMe}
        />
        <View style={[styles.callMetaFooter, isMe ? styles.callMetaFooterMe : {}]}>
          <Text style={[styles.callFooterTime, isMe ? styles.callFooterTimeMe : {}]}>
            {time}
          </Text>
          {isMe && status && (
            <StatusIcons status={status} />
          )}
        </View>
      </View>
    );
  }

  // ── Revoked / Deleted ───────────────────────────────────────────────────
  if (isRevokedOrDeleted) {
    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}>
        {!isMe && (
          <View style={styles.avatarContainer}>
            <Avatar
              uri={senderAvatar ?? undefined}
              name={senderName || defaultName || 'User'}
              size="xs"
            />
          </View>
        )}
        <View style={[styles.bubbleInner, isMe && styles.bubbleInnerMe]}>
          {!isMe && senderName && (
            <Text style={styles.senderName}>{senderName}</Text>
          )}
          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleMe : styles.bubbleOther,
              styles.revokedBubble,
            ]}
          >
            <Text style={[styles.revokedText, isMe && styles.revokedTextMe]}>
              Tin nhắn đã được thu hồi
            </Text>
            <View style={[styles.bubbleFooter, isMe ? styles.bubbleFooterMe : styles.bubbleFooterOther]}>
              <Text style={[styles.bubbleTime, { color: '#999' }]}>
                {time}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ── Normal text / image / sticker messages ────────────────────────────────
  const renderBubbleContent = () => {
    if (type === 'image' && file_url) {
      return (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: file_url }}
            style={styles.messageImage}
            resizeMode="cover"
          />
          {/* Floating Share button — top-right corner of image */}
          <TouchableOpacity
            style={styles.imageActionBtn}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <View style={styles.imageActionBtnInner}>
              {Icons.shareOutline(14, colors.text.primary)}
            </View>
          </TouchableOpacity>
          {/* Floating Heart button — bottom-right corner overlapping image */}
          <TouchableOpacity
            style={styles.imageHeartBtn}
            activeOpacity={0.8}
            onPress={() => {}}
          >
            <View style={styles.imageHeartBtnInner}>
              {Icons.heartOutline(14, colors.text.primary)}
            </View>
          </TouchableOpacity>
        </View>
      );
    }

    if (type === 'sticker' || type === 'emoji') {
      return <Text style={styles.stickerText}>{content}</Text>;
    }

    // File attachment
    if (type === 'file' && file_url) {
      const fileName = decodeURIComponent(file_url.split('/').pop() || 'Tệp đính kèm');
      return (
        <TouchableOpacity
          style={styles.fileContainer}
          onPress={() => {
            const { Linking } = require('react-native');
            Linking.openURL(file_url);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.fileIconContainer}>
            {Icons.file(28, colors.primary)}
          </View>
          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={2}>
              {fileName}
            </Text>
            <Text style={styles.fileHint}>Nhấn để mở tệp</Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Voice message
    if (type === 'voice' && file_url) {
      return (
        <VoiceMessageBubble
          uri={file_url}
          duration={voiceDuration}
          isMe={isMe}
          time=""
          status={undefined}
          onLongPress={undefined}
        />
      );
    }

    // Text
    return (
      <Text
        style={[styles.messageText, isMe ? styles.textMe : styles.textOther]}
        numberOfLines={0}
      >
        {content}
      </Text>
    );
  };

  const renderFooter = () => (
    <View style={[styles.bubbleFooter, isMe ? styles.bubbleFooterMe : styles.bubbleFooterOther]}>
      <Text style={[styles.bubbleTime, isMe ? styles.timeMe : styles.timeOther]}>
        {time}
      </Text>
      {isMe && status && (
        <View style={styles.statusWrapper}>
          <StatusIcons status={status} />
        </View>
      )}
    </View>
  );

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      delayLongPress={500}
      activeOpacity={0.85}
      style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowOther]}
    >
      {/* Avatar for received messages */}
      {!isMe && (
        <View style={styles.avatarContainer}>
          <Avatar
            uri={senderAvatar ?? undefined}
            name={senderName || defaultName || 'User'}
            size="xs"
          />
        </View>
      )}

      {/* Bubble content */}
      <View style={[styles.bubbleInner, isMe && styles.bubbleInnerMe]}>
        {senderName && !isMe && (
          <Text style={styles.senderName}>{senderName}</Text>
        )}
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleMe : styles.bubbleOther,
            isFocused && styles.focusedBubble,
          ]}
        >
          {renderBubbleContent()}
          {renderFooter()}
        </View>
      </View>
    </TouchableOpacity>
  );
}, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.content === next.content &&
    prev.time === next.time &&
    prev.status === next.status &&
    prev.isMe === next.isMe &&
    prev.isDeleted === next.isDeleted &&
    prev.isRevoked === next.isRevoked &&
    prev.isFocused === next.isFocused &&
    prev.file_url === next.file_url &&
    prev.voiceDuration === next.voiceDuration
  );
});

const styles = StyleSheet.create({
  // ── Time Divider ────────────────────────────────────────────────────────
  timeDividerContainer: {
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  timeDividerPill: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  timeDividerText: {
    ...typography.caption,
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },

  // ── Delivered Pill ──────────────────────────────────────────────────────
  deliveredContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  deliveredTime: {
    ...typography.caption,
    fontSize: 11,
    color: '#999',
    marginRight: spacing.xs,
  },
  deliveredPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#999',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 3,
  },
  deliveredText: {
    ...typography.caption,
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },

  // ── Call History ────────────────────────────────────────────────────────
  callWrapper: {
    marginBottom: spacing.sm,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
  },
  callRowMe: {
    justifyContent: 'flex-end',
  },
  callRowOther: {
    justifyContent: 'flex-start',
  },
  callAvatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  callBubble: {
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: MAX_BUBBLE_WIDTH,
    minWidth: 160,
  },
  callBubbleMe: {
    backgroundColor: '#DDF1FF',
    alignItems: 'flex-end',
  },
  callBubbleOther: {
    backgroundColor: colors.background.chatBubbleOther,
    alignItems: 'flex-start',
  },
  callTitle: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  callTitleMe: {
    color: '#000',
    textAlign: 'right',
  },
  callTitleOther: {
    color: colors.text.primary,
    textAlign: 'left',
  },
  callTitleMissed: {
    color: colors.status.error,
  },
  callMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  callDuration: {
    ...typography.caption,
    fontSize: 12,
    color: '#666',
  },
  callDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.1)',
    width: '100%',
    marginBottom: 6,
  },
  callActionBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  callActionText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  callMetaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: spacing.md,
    marginTop: 2,
    gap: 4,
  },
  callMetaFooterMe: {
    justifyContent: 'flex-end',
  },
  callFooterTime: {
    ...typography.caption,
    fontSize: 10,
    color: '#999',
  },
  callFooterTimeMe: {
    color: '#999',
  },

  // ── Main Bubble Layout ─────────────────────────────────────────────────
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  bubbleRowMe: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 2,
  },
  bubbleInner: {
    maxWidth: MAX_BUBBLE_WIDTH,
  },
  bubbleInnerMe: {
    alignItems: 'flex-end',
  },
  senderName: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 2,
    marginLeft: 4,
  },
  bubble: {
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 60,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  bubbleMe: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: colors.background.chatBubbleOther,
    borderBottomLeftRadius: 4,
  },
  focusedBubble: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },

  // ── Bubble Content ────────────────────────────────────────────────────
  messageText: {
    ...typography.body,
    fontSize: 15,
  },
  textMe: {
    color: colors.text.inverse,
  },
  textOther: {
    color: colors.text.primary,
  },

  // ── Image Bubble ───────────────────────────────────────────────────────
  imageWrapper: {
    position: 'relative',
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
  },
  messageImage: {
    width: IMAGE_BUBBLE_WIDTH,
    height: IMAGE_BUBBLE_WIDTH * 0.75,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.tertiary,
  },
  imageActionBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  imageActionBtnInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  imageHeartBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  imageHeartBtnInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // ── Sticker ────────────────────────────────────────────────────────────
  stickerText: {
    fontSize: 64,
    textAlign: 'center',
  },

  // ── Footer: time + status ─────────────────────────────────────────────
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  bubbleFooterMe: {
    justifyContent: 'flex-end',
  },
  bubbleFooterOther: {
    justifyContent: 'flex-start',
  },
  bubbleTime: {
    ...typography.caption,
    fontSize: 10,
  },
  timeMe: {
    color: 'rgba(255,255,255,0.65)',
  },
  timeOther: {
    color: colors.text.tertiary,
  },
  statusWrapper: {
    marginLeft: 4,
  },
  statusDoubleCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ── Revoked / Deleted ──────────────────────────────────────────────────
  revokedBubble: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
    minWidth: 120,
  },
  revokedText: {
    ...typography.caption,
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  revokedTextMe: {
    color: '#9CA3AF',
  },

  // ── File Attachment ──────────────────────────────────────────────────
  fileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    minWidth: 180,
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: 'rgba(0, 138, 243, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
  },
  fileHint: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 2,
  },
});

export default MessageBubble;
