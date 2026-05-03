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
} from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PinnedHeaderProps {
  pinnedMessages: any[];
  onUnpin: (messageId: string) => void;
  onNavigateToMessage: (messageId: string) => void;
}

const PinnedHeader: React.FC<PinnedHeaderProps> = ({
  pinnedMessages,
  onUnpin,
  onNavigateToMessage,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (pinnedMessages.length === 0) return null;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  return (
    <View style={styles.container}>
      {isExpanded && (
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={() => setIsExpanded(false)} 
        />
      )}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.mainContent}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <View style={styles.pinIconWrapper}>
            {Icons.pushPin(IconSize.sm, colors.primary)}
          </View>
          <View style={styles.textWrapper}>
            <Text style={styles.title} numberOfLines={1}>
              Tin nhắn đã ghim ({pinnedMessages.length})
            </Text>
            {!isExpanded && (
              <Text style={styles.preview} numberOfLines={1}>
                {pinnedMessages[0].senderName}: {pinnedMessages[0].content}
              </Text>
            )}
          </View>
          <View style={styles.expandIcon}>
            {isExpanded ? Icons.chevronUp(IconSize.sm, colors.text.secondary) : Icons.chevronDown(IconSize.sm, colors.text.secondary)}
          </View>
        </TouchableOpacity>
      </View>

      {isExpanded && (
        <ScrollView style={styles.expandedList} maxHeight={200}>
          {pinnedMessages.map((msg, index) => (
            <View key={msg.id} style={styles.pinnedItem}>
              <TouchableOpacity
                style={styles.pinnedItemContent}
                onPress={() => {
                  onNavigateToMessage(msg.id);
                  setIsExpanded(false);
                }}
              >
                <Text style={styles.pinnedSender}>{msg.senderName}: </Text>
                <Text style={styles.pinnedText} numberOfLines={1}>
                  {msg.content}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onUnpin(msg.id)} style={styles.unpinButton}>
                {Icons.close(IconSize.xs)}
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F7FF', // Light blue background for better contrast
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    zIndex: 10,
  },
  backdrop: {
    position: 'absolute',
    top: 50, // Height of header row
    left: 0,
    right: 0,
    height: 1000, // Large enough to cover screen
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: -1,
  },
  headerRow: {
    flexDirection: 'row',
    height: 50,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: '#F0F7FF',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinIconWrapper: {
    marginRight: spacing.sm,
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: 'bold',
  },
  preview: {
    ...typography.caption,
    color: colors.text.secondary,
    fontSize: 11,
  },
  expandIcon: {
    padding: spacing.xs,
  },
  iconContainer: {
    marginRight: spacing.sm,
    transform: [{ rotate: '45deg' }],
  },
  contentContainer: {
    flex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  latestMessage: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.xs,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 10,
    fontWeight: '700',
  },
  expandedList: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingHorizontal: spacing.md,
  },
  pinnedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  pinnedItemContent: {
    flex: 1,
    flexDirection: 'row',
  },
  pinnedSender: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text.primary,
  },
  pinnedText: {
    ...typography.caption,
    color: colors.text.secondary,
    flex: 1,
  },
  unpinButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
});

export default PinnedHeader;
