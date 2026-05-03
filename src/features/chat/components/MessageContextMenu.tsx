import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MessageContextMenuProps {
  message: {
    id: string | number;
    content: string;
    type: string;
    isMe: boolean;
    senderName?: string;
  } | null;
  visible: boolean;
  onClose: () => void;
  isOwn?: boolean;
  onReply?: () => void;
  onForward?: () => void;
  onSave?: () => void;
  onRecall?: () => void;
  onCopy?: () => void;
  onPin?: () => void;
  onReminder?: () => void;
  onSelectMultiple?: () => void;
  onQuickMessage?: () => void;
  onTranslate?: () => void;
  onReadText?: () => void;
  onDetails?: () => void;
  onDelete?: () => void;
}

// ─── Action Definitions ───────────────────────────────────────────────────────

interface ActionItem {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  badge?: string;
  isDestructive?: boolean;
  onPress: () => void;
}

const REACTION_EMOJIS = ['❤️', '👍', '🤣', '😲', '😭', '😡'];

const buildActionItems = (props: MessageContextMenuProps): ActionItem[] => {
  const { onReply, onForward, onSave, onRecall, onCopy, onPin, onReminder, onSelectMultiple, onQuickMessage, onTranslate, onReadText, onDetails, onDelete, isOwn } = props;

  return [
    // Row 1
    { key: 'reply', label: 'Trả lời', icon: 'arrow-undo-outline', iconColor: '#8B5CF6', onPress: () => { onReply?.(); props.onClose(); } },
    { key: 'forward', label: 'Chuyển tiếp', icon: 'arrow-redo-outline', iconColor: '#10B981', onPress: () => { onForward?.(); props.onClose(); } },
    { key: 'save', label: 'Lưu', icon: 'folder-open-outline', iconColor: '#6366F1', onPress: () => { onSave?.(); props.onClose(); } },
    // Row 1 – Recall: only for own messages
    ...(isOwn ? [{ key: 'recall', label: 'Thu hồi', icon: 'refresh-outline', iconColor: '#F59E0B', onPress: () => { onRecall?.(); props.onClose(); } }] : []),
    // Row 2
    { key: 'copy', label: 'Sao chép', icon: 'copy-outline', iconColor: '#6B7280', onPress: () => { onCopy?.(); props.onClose(); } },
    { key: 'pin', label: 'Ghim', icon: 'pin-outline', iconColor: '#F59E0B', onPress: () => { onPin?.(); props.onClose(); } },
    { key: 'reminder', label: 'Nhắc hẹn', icon: 'time-outline', iconColor: '#EF4444', onPress: () => { onReminder?.(); props.onClose(); } },
    { key: 'selectMultiple', label: 'Chọn nhiều', icon: 'checkbox-outline', iconColor: '#6B7280', onPress: () => { onSelectMultiple?.(); props.onClose(); } },
    // Row 3
    { key: 'quickMessage', label: 'Tạo tin nhắn nhanh', icon: 'flash-outline', iconColor: '#8B5CF6', onPress: () => { onQuickMessage?.(); props.onClose(); } },
    { key: 'translate', label: 'Dịch', icon: 'language-outline', iconColor: '#6B7280', badge: 'MỚI', onPress: () => { onTranslate?.(); props.onClose(); } },
    { key: 'readText', label: 'Đọc văn bản', icon: 'megaphone-outline', iconColor: '#6B7280', badge: 'MỚI', onPress: () => { onReadText?.(); props.onClose(); } },
    { key: 'details', label: 'Chi tiết', icon: 'information-circle-outline', iconColor: '#6B7280', onPress: () => { onDetails?.(); props.onClose(); } },
    // Row 4
    { key: 'delete', label: 'Xóa', icon: 'trash-outline', iconColor: colors.status.error, isDestructive: true, onPress: () => { onDelete?.(); props.onClose(); } },
  ];
};

// ─── Sub-components ────────────────────────────────────────────────────────────

interface ReactionBarProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const ReactionBar: React.FC<ReactionBarProps> = ({ onSelect, onClose }) => (
  <View style={styles.reactionBarContainer}>
    {REACTION_EMOJIS.map((emoji) => (
      <Pressable
        key={emoji}
        style={({ pressed }) => [
          styles.reactionBtn,
          pressed && styles.reactionBtnPressed,
        ]}
        onPress={() => onSelect(emoji)}
      >
        <Text style={styles.reactionEmoji}>{emoji}</Text>
      </Pressable>
    ))}
  </View>
);

interface ActionGridItemProps {
  item: ActionItem;
}

const ActionGridItem: React.FC<ActionGridItemProps> = ({ item }) => (
  <Pressable
    style={({ pressed }) => [
      styles.actionItem,
      pressed && styles.actionItemPressed,
    ]}
    onPress={item.onPress}
  >
    <View style={styles.iconWrapper}>
      <Ionicons name={item.icon as any} size={22} color={item.iconColor} />
      {item.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
    </View>
    <Text
      style={[
        styles.actionLabel,
        item.isDestructive && styles.actionLabelDestructive,
      ]}
      numberOfLines={2}
    >
      {item.label}
    </Text>
  </Pressable>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  message,
  visible,
  onClose,
  isOwn,
  ...actionHandlers
}) => {
  const insets = useSafeAreaInsets();
  const actionItems = buildActionItems({ message, visible, onClose, isOwn, ...actionHandlers });

  const handleReactionSelect = useCallback((emoji: string) => {
    Alert.alert('Phản ứng', `Bạn đã chọn ${emoji}`);
    onClose();
  }, [onClose]);

  // Row chunks (4 per row)
  const rows = [
    actionItems.slice(0, 4),
    actionItems.slice(4, 8),
    actionItems.slice(8, 12),
    actionItems.slice(12, 16),
  ].filter((row) => row.length > 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.menuWrapper, { paddingBottom: insets.bottom || spacing.md }]}>
              {/* ── Reaction Bar (floating above sheet) ── */}
              <ReactionBar onSelect={handleReactionSelect} onClose={onClose} />

              {/* ── Bottom Sheet ── */}
              <View style={styles.sheet}>
                {rows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.actionRow}>
                    {row.map((item) => (
                      <ActionGridItem key={item.key} item={item} />
                    ))}
                    {/* Fill empty cells to maintain 4-column grid */}
                    {row.length < 4 &&
                      Array.from({ length: 4 - row.length }).map((_, idx) => (
                        <View key={`empty-${idx}`} style={styles.actionItem} />
                      ))}
                  </View>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  menuWrapper: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },

  // ── Reaction Bar ─────────────────────────────────────────────────────────
  reactionBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  reactionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionBtnPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  reactionEmoji: {
    fontSize: 26,
  },

  // ── Bottom Sheet ──────────────────────────────────────────────────────────
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 12,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  actionItemPressed: {
    opacity: 0.65,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 12,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 16,
  },
  actionLabelDestructive: {
    color: colors.status.error,
  },

  // ── Badge ─────────────────────────────────────────────────────────────────
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#10B981',
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default MessageContextMenu;
