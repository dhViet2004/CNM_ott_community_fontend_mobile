import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setMyGroups } from '@store/slices/groupsSlice';
import { setFriends } from '@store/slices/chatSlice';
import { friendsApi, groupsApi, messageApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  messageContent: string;
  sourceConversationId: string;
}

interface RecipientItem {
  id: string;
  type: 'friend' | 'group';
  displayName: string;
  avatarUrl: string | null;
  conversationId: string;
  friendId?: string;
  groupId?: string;
}

// ─── Helper: build conversation IDs ──────────────────────────────────────────

function buildDmConversationId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `dm:${sorted.join(':')}`;
}

function buildGroupConversationId(groupId: string): string {
  return groupId;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  isOpen,
  onClose,
  messageId,
  messageContent,
  sourceConversationId,
}) => {
  const dispatch = useAppDispatch();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // ── Load friends & groups ──────────────────────────────────────────────────

  const currentUserId = useAppSelector((s) => s.auth?.user?.userId ?? '');
  const storeFriends = useAppSelector((s) => s.chat?.friends ?? []);
  const storeGroups = useAppSelector((s) => s.groups?.myGroups ?? []);

  useEffect(() => {
    if (!isOpen) return;

    async function load() {
      setIsLoadingData(true);
      try {
        const friends = await friendsApi.getFriends().catch(() => []);
        dispatch(setFriends(friends));

        if (!storeGroups || storeGroups.length === 0) {
          const groups = await groupsApi.getMyGroups(currentUserId).catch(() => []);
          dispatch(setMyGroups(groups));
        }
      } catch {
        // non-critical
      } finally {
        setIsLoadingData(false);
      }
    }

    load();
  }, [isOpen, currentUserId, dispatch, storeGroups]);

  // ── Build recipient list ───────────────────────────────────────────────────

  const allRecipients: RecipientItem[] = useMemo(() => {
    const friendItems: RecipientItem[] = (storeFriends || []).map((f) => {
      const friendId = f.friend_id || f.userId || '';
      return {
        id: `friend:${friendId}`,
        type: 'friend' as const,
        displayName: f.display_name || f.friend_display_name || '',
        avatarUrl: f.avatar_url || f.friend_avatar_url || null,
        conversationId: buildDmConversationId(currentUserId, friendId),
        friendId,
      };
    });

    const groupItems: RecipientItem[] = (storeGroups || [])
      .filter((g) => {
        const convId = buildGroupConversationId(g.groupId);
        return convId !== sourceConversationId;
      })
      .map((g) => ({
        id: g.groupId,
        type: 'group' as const,
        displayName: g.name || '',
        avatarUrl: g.avatar_url || null,
        conversationId: buildGroupConversationId(g.groupId),
        groupId: g.groupId,
      }));

    return [...friendItems, ...groupItems];
  }, [storeFriends, storeGroups, currentUserId, sourceConversationId]);

  // ── Filter by search ───────────────────────────────────────────────────────

  const filteredRecipients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allRecipients;
    return allRecipients.filter((r) =>
      r.displayName.toLowerCase().includes(q)
    );
  }, [allRecipients, searchQuery]);

  // ── Toggle selection ───────────────────────────────────────────────────────

  const toggleRecipient = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;

  // ── Send handler ───────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (selectedCount === 0) return;

    const targets = allRecipients
      .filter((r) => selectedIds.has(r.id))
      .map((r) => r.conversationId);

    setIsSending(true);
    try {
      const result = await messageApi.forwardMessage(
        messageId,
        sourceConversationId,
        targets
      );

      if (result.success) {
        Alert.alert(
          'Thành công',
          `Đã chuyển tiếp đến ${result.data.forwardedCount} cuộc trò chuyện`
        );
        handleClose();
      } else {
        Alert.alert('Lỗi', result.message || 'Không thể chuyển tiếp tin nhắn');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Không thể chuyển tiếp tin nhắn';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSending(false);
    }
  }, [selectedCount, allRecipients, selectedIds, messageId, sourceConversationId]);

  // ── Close & reset ──────────────────────────────────────────────────────────

  const handleClose = useCallback(() => {
    onClose();
    setSelectedIds(new Set());
    setSearchQuery('');
  }, [onClose]);

  // ── Preview snippet ────────────────────────────────────────────────────────

  const previewContent =
    messageContent.length > 80
      ? `${messageContent.slice(0, 80)}...`
      : messageContent || '[Không có nội dung]';

  // ── Render item ────────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: RecipientItem }) => {
      const isSelected = selectedIds.has(item.id);
      const initials = item.displayName.charAt(0)?.toUpperCase() || '?';

      return (
        <TouchableOpacity
          style={[
            styles.recipientItem,
            isSelected && styles.recipientItemSelected,
          ]}
          activeOpacity={0.7}
          onPress={() => toggleRecipient(item.id)}
        >
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            {item.type === 'group' ? (
              <View style={styles.groupAvatar}>
                <Ionicons name="people" size={20} color="#FFFFFF" />
              </View>
            ) : item.avatarUrl ? (
              <View style={styles.avatarImage}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>

          {/* Name & type */}
          <View style={styles.recipientInfo}>
            <Text style={styles.recipientName} numberOfLines={1}>
              {item.displayName}
            </Text>
            <Text style={styles.recipientType}>
              {item.type === 'group' ? 'Nhóm' : 'Bạn bè'}
            </Text>
          </View>

          {/* Checkbox */}
          <View
            style={[
              styles.checkbox,
              isSelected ? styles.checkboxSelected : styles.checkboxUnselected,
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [selectedIds, toggleRecipient]
  );

  const keyExtractor = useCallback((item: RecipientItem) => item.id, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              {/* ── Header ─────────────────────────────────────────────────── */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.headerCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color={colors.text.secondary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                  <Text style={styles.headerTitle}>Chuyển tiếp tin nhắn</Text>
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {previewContent}
                  </Text>
                </View>

                <View style={styles.headerSpacer} />
              </View>

              {/* ── Search ─────────────────────────────────────────────────── */}
              <View style={styles.searchWrapper}>
                <Ionicons
                  name="search"
                  size={18}
                  color={colors.text.tertiary}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm bạn bè hoặc nhóm..."
                  placeholderTextColor={colors.text.tertiary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={colors.text.tertiary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* ── Recipients list ────────────────────────────────────────── */}
              <View style={styles.listContainer}>
                {isLoadingData ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                  </View>
                ) : filteredRecipients.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={48}
                      color={colors.text.tertiary}
                    />
                    <Text style={styles.emptyText}>
                      {searchQuery
                        ? 'Không tìm thấy kết quả'
                        : 'Không có người nhận'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredRecipients}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                )}
              </View>

              {/* ── Footer ─────────────────────────────────────────────────── */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  activeOpacity={0.6}
                  onPress={handleClose}
                >
                  <Text style={styles.cancelBtnText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    (selectedCount === 0 || isSending) && styles.sendBtnDisabled,
                  ]}
                  activeOpacity={0.8}
                  onPress={handleSend}
                  disabled={selectedCount === 0 || isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.sendBtnText}>
                      Gửi{selectedCount > 0 ? ` (${selectedCount})` : ''}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 44;

const MODAL_WIDTH = '90%';
const MODAL_MAX_HEIGHT = 560;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
    width: MODAL_WIDTH,
    maxHeight: MODAL_MAX_HEIGHT,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  headerCloseBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 36,
  },

  // ── Search ───────────────────────────────────────────────────────────────
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    paddingVertical: 0,
    fontSize: 15,
  },

  // ── List ────────────────────────────────────────────────────────────────
  listContainer: {
    flexShrink: 1,
    minHeight: 80,
  },
  listContent: {
    paddingVertical: spacing.xs,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginLeft: spacing.md + AVATAR_SIZE + spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
  },

  // ── Recipient Item ─────────────────────────────────────────────────────
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  recipientItemSelected: {
    backgroundColor: `${colors.primary}10`,
  },
  avatarWrapper: {
    marginRight: spacing.md,
  },
  groupAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  recipientInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  recipientName: {
    ...typography.body,
    fontWeight: '500',
    color: colors.text.primary,
  },
  recipientType: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnselected: {
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: 'transparent',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderWidth: 0,
  },

  // ── Footer ─────────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.lg,
  },
  cancelBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    ...typography.body,
    color: colors.text.tertiary,
    fontSize: 14,
  },
  sendBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: '#B0D4F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendIcon: {
    marginRight: spacing.xs,
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

export default ForwardMessageModal;
