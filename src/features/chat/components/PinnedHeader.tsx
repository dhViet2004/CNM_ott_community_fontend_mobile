import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Image,
} from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Icons } from '@components/common';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PinnedMessage {
  id: string;
  content: string;
  contentType?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string | null;
  file_url?: string | null;
  createdAt?: string;
  pinnedBy?: string;
}

interface PinnedHeaderProps {
  pinnedMessages: PinnedMessage[];
  currentUserId?: string;
  onUnpin: (messageId: string) => void;
  onNavigateToMessage: (messageId: string) => void;
}

const PinnedHeader: React.FC<PinnedHeaderProps> = ({
  pinnedMessages,
  currentUserId,
  onUnpin,
  onNavigateToMessage,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const latest = pinnedMessages[0];

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  const handleNavigate = (msgId: string) => {
    onNavigateToMessage(msgId);
    setIsExpanded(false);
  };

  const isImageContent = latest.contentType === 'image' || latest.file_url;
  const displayTitle = isImageContent ? '[Hình ảnh]' : latest.content;
  const displaySubtitle = latest.senderName
    ? `Tin nhắn của ${latest.senderName}`
    : 'Tin nhắn đã ghim';

  return (
    <View style={styles.container}>
      {/* Full-width white floating card */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardMainRow}
          activeOpacity={0.75}
          onPress={toggleExpand}
        >
          {/* Left: Blue circle + chat bubble icon */}
          <View style={styles.iconCircle}>
            {Icons.chatbubbles(16, '#FFFFFF')}
          </View>

          {/* Center: Two lines of text */}
          <View style={styles.textContent}>
            <Text style={styles.title} numberOfLines={1}>
              {displayTitle}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {displaySubtitle}
            </Text>
          </View>

          {/* Right: Thumbnail + Down chevron */}
          <View style={styles.rightSection}>
            {latest.file_url && (
              <Image
                source={{ uri: latest.file_url }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            )}
            <View style={styles.expandIcon}>
              {isExpanded
                ? Icons.chevronUp(18, colors.text.tertiary)
                : Icons.chevronDown(18, colors.text.tertiary)}
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded: Scrollable list of pinned messages */}
        {isExpanded && (
          <View style={styles.expandedContainer}>
            <View style={styles.expandedDivider} />
            <ScrollView
              style={styles.expandedList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {pinnedMessages.map((msg) => {
                const msgIsImage = msg.contentType === 'image' || msg.file_url;
                const msgTitle = msgIsImage ? '[Hình ảnh]' : msg.content;
                const msgSubtitle = msg.senderName
                  ? `Tin nhắn của ${msg.senderName}`
                  : 'Tin nhắn đã ghim';

                return (
                  <View key={msg.id} style={styles.pinnedItem}>
                    <TouchableOpacity
                      style={styles.pinnedItemContent}
                      activeOpacity={0.7}
                      onPress={() => handleNavigate(msg.id)}
                    >
                      {/* Small chat bubble icon */}
                      <View style={styles.pinnedItemIcon}>
                        {Icons.chatbubbles(12, colors.primary)}
                      </View>
                      <View style={styles.pinnedItemText}>
                        <Text style={styles.pinnedItemTitle} numberOfLines={1}>
                          {msgTitle}
                        </Text>
                        <Text style={styles.pinnedItemSubtitle} numberOfLines={1}>
                          {msgSubtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {(!msg.pinnedBy || String(msg.pinnedBy) === String(currentUserId)) && (
                      <TouchableOpacity
                        style={styles.unpinBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        onPress={() => onUnpin(msg.id)}
                      >
                        {Icons.close(14, colors.text.tertiary)}
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderRadius: spacing.borderRadius.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  cardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0088FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  textContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text.secondary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.tertiary,
    marginRight: spacing.sm,
  },
  expandIcon: {
    padding: 2,
  },
  expandedContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  expandedDivider: {
    height: 0,
  },
  expandedList: {
    maxHeight: 200,
  },
  pinnedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  pinnedItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedItemIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,136,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  pinnedItemText: {
    flex: 1,
  },
  pinnedItemTitle: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 1,
  },
  pinnedItemSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.tertiary,
  },
  unpinBtn: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});

export default PinnedHeader;
