import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setFriends } from '@store/slices/chatSlice';
import {
  removePendingRequest,
  decrementPendingCount,
  setRawPendingRequests,
} from '@store/slices/contactSlice';
import { friendsApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';
import { Avatar, Icons, IconSize } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'FriendRequests'>;
type TabType = 'received' | 'sent';

// ─── Types ────────────────────────────────────────────────────────────────────
type RequestItem = {
  id: string;
  userId: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  requestId?: string;
  friendshipId?: string;
  requested_at?: string;
};

// ─── MOCK: Sent requests (thay bằng API backend khi có endpoint) ─────────────
const MOCK_SENT_REQUESTS: RequestItem[] = [
  {
    id: 'sent_1',
    userId: 'user_10',
    requestId: 'req_sent_1',
    username: 'nguyen_van_b',
    display_name: 'Nguyễn Văn B',
    avatar_url: null,
    requested_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'sent_2',
    userId: 'user_11',
    requestId: 'req_sent_2',
    username: 'tran_thi_c',
    display_name: 'Trần Thị C',
    avatar_url: null,
    requested_at: '2024-01-14T08:15:00Z',
  },
  {
    id: 'sent_3',
    userId: 'user_12',
    requestId: 'req_sent_3',
    username: 'le_van_d',
    display_name: 'Lê Văn D',
    avatar_url: null,
    requested_at: '2024-01-12T14:00:00Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) return `${diffDay} ngày trước`;
  if (diffHour > 0) return `${diffHour} giờ trước`;
  if (diffMin > 0) return `${diffMin} phút trước`;
  return 'Vừa xong';
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: RequestItemRow
// ═══════════════════════════════════════════════════════════════════════════
interface RequestItemRowProps {
  item: RequestItem;
  type: 'received' | 'sent';
  onAccept?: (item: RequestItem) => void;
  onReject?: (item: RequestItem) => void;
  onCancel?: (item: RequestItem) => void;
  isProcessing?: boolean;
}

const RequestItemRow: React.FC<RequestItemRowProps> = ({
  item,
  type,
  onAccept,
  onReject,
  onCancel,
  isProcessing = false,
}) => (
  <View style={styles.requestItem}>
    <Avatar
      name={item.display_name || item.username}
      uri={item.avatar_url || undefined}
      size="md"
    />
    <View style={styles.requestInfo}>
      <Text style={styles.requestName} numberOfLines={1}>
        {item.display_name || item.username}
      </Text>
      {type === 'received' ? (
        <Text style={styles.requestSubtitle}>
          @{item.username} · {formatTimeAgo(item.requested_at)}
        </Text>
      ) : (
        <Text style={styles.requestSubtitle}>
          Đã gửi lời mời · {formatTimeAgo(item.requested_at)}
        </Text>
      )}
    </View>
    <View style={styles.requestActions}>
      {type === 'received' ? (
        <>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => onReject?.(item)}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            <Text style={styles.rejectBtnText}>Từ chối</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAccept?.(item)}
            disabled={isProcessing}
            activeOpacity={0.7}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.acceptBtnText}>Đồng ý</Text>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => onCancel?.(item)}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelBtnText}>Hủy</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: SectionHeader
// ═══════════════════════════════════════════════════════════════════════════
const SectionHeader: React.FC = () => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Cũ hơn</Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: EmptyState
// ═══════════════════════════════════════════════════════════════════════════
interface EmptyStateProps {
  type: TabType;
  isLoading: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ type, isLoading }) => (
  <View style={styles.emptyContainer}>
    {isLoading ? (
      <>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.emptyLoadingText}>Đang tải...</Text>
      </>
    ) : (
      <>
        <View style={styles.emptyIconContainer}>
          {Icons.people(64)}
        </View>
        <Text style={styles.emptyTitle}>
          {type === 'received' ? 'Không có lời mời nào' : 'Không có lời mời đã gửi'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {type === 'received'
            ? 'Lời mời kết bạn sẽ xuất hiện tại đây'
            : 'Lời mời bạn đã gửi sẽ xuất hiện tại đây'}
        </Text>
      </>
    )}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: FriendRequestsScreen
// ═══════════════════════════════════════════════════════════════════════════
const FriendRequestsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // Redux
  const pendingRequests = useAppSelector((state) => state.contacts.pendingRequests);

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>('received');
  const [receivedList, setReceivedList] = useState<RequestItem[]>([]);
  const [sentList, setSentList] = useState<RequestItem[]>(MOCK_SENT_REQUESTS);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load received requests từ API ─────────────────────────────────────────
  const loadReceivedRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const raw = await friendsApi.getPendingRequests();
      const mapped: RequestItem[] = raw.map((p: any) => ({
        id: p.userId || p.id || '',
        userId: p.userId || p.id || '',
        username: p.username || '',
        display_name: p.display_name || p.name || '',
        avatar_url: p.avatar_url ?? null,
        requestId: p.requestId || p.friendshipId,
        friendshipId: p.friendshipId,
        requested_at: p.requested_at || p.created_at,
      }));
      setReceivedList(mapped);
      dispatch(setRawPendingRequests(raw));
    } catch (err: any) {
      setError(err?.message || 'Không tải được danh sách');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    loadReceivedRequests();
  }, [loadReceivedRequests]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const setProcessing = (id: string, loading: boolean) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const reloadFriends = useCallback(async () => {
    try {
      const friends = await friendsApi.getFriends();
      dispatch(setFriends(friends));
    } catch {
      // ignore - friends reload is best-effort
    }
  }, [dispatch]);

  // ─── Accept ────────────────────────────────────────────────────────────────
  const handleAccept = useCallback(
    async (item: RequestItem) => {
      const reqId = item.requestId || item.friendshipId || item.userId;
      if (!reqId) return;

      setProcessing(item.id, true);
      try {
        await friendsApi.acceptRequest(reqId);

        // 1. Cập nhật Redux: bớt pending
        dispatch(decrementPendingCount());
        dispatch(removePendingRequest(item.id));

        // 2. Cập nhật local list
        setReceivedList((prev) => prev.filter((r) => r.id !== item.id));

        // 3. Reload friends list (như web)
        await reloadFriends();

        // 4. Toast
        Alert.alert('Thành công', 'Đã đồng ý kết bạn');
      } catch (err: any) {
        Alert.alert('Lỗi', err?.message || 'Không thể đồng ý lời mời');
      } finally {
        setProcessing(item.id, false);
      }
    },
    [dispatch, reloadFriends]
  );

  // ─── Reject ────────────────────────────────────────────────────────────────
  const handleReject = useCallback(
    async (item: RequestItem) => {
      const reqId = item.requestId || item.friendshipId || item.userId;
      if (!reqId) return;

      setProcessing(item.id, true);
      try {
        await friendsApi.rejectRequest(reqId);

        // 1. Cập nhật Redux
        dispatch(decrementPendingCount());
        dispatch(removePendingRequest(item.id));

        // 2. Cập nhật local list
        setReceivedList((prev) => prev.filter((r) => r.id !== item.id));

        // 3. Toast
        Alert.alert('Đã từ chối', 'Đã từ chối lời mời kết bạn');
      } catch (err: any) {
        Alert.alert('Lỗi', err?.message || 'Không thể từ chối lời mời');
      } finally {
        setProcessing(item.id, false);
      }
    },
    [dispatch]
  );

  // ─── Cancel sent request ────────────────────────────────────────────────────
  const handleCancel = useCallback(
    async (item: RequestItem) => {
      const reqId = item.requestId || item.userId;
      if (!reqId) return;

      setProcessing(item.id, true);
      try {
        await friendsApi.cancelRequest(reqId);
        setSentList((prev) => prev.filter((r) => r.id !== item.id));
        Alert.alert('Đã hủy', 'Đã hủy lời mời kết bạn');
      } catch (err: any) {
        Alert.alert('Lỗi', err?.message || 'Không thể hủy lời mời');
      } finally {
        setProcessing(item.id, false);
      }
    },
    []
  );

  // ─── Refresh ───────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadReceivedRequests();
    setIsRefreshing(false);
  }, [loadReceivedRequests]);

  // ─── Derived data ───────────────────────────────────────────────────────────
  const currentList = activeTab === 'received' ? receivedList : sentList;
  const showFooter = currentList.length > 0;

  // ─── Render ────────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: RequestItem }) => (
    <RequestItemRow
      item={item}
      type={activeTab}
      onAccept={handleAccept}
      onReject={handleReject}
      onCancel={handleCancel}
      isProcessing={processingIds.has(item.id)}
    />
  );

  const renderSeparator = () => <View style={styles.separator} />;

  const renderHeader = () => <SectionHeader />;

  const renderFooter = () => {
    if (!showFooter) return null;
    return (
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.showMoreBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.showMoreBtnText}>XEM THÊM</Text>
          <View style={styles.showMoreChevron}>
            {Icons.chevronDown(IconSize.sm, colors.text.tertiary)}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          {Icons.arrowBack(IconSize.lg, colors.text.inverse)}
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Lời mời kết bạn</Text>

        <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
          {Icons.settings(IconSize.lg, colors.text.inverse)}
        </TouchableOpacity>
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabBar}>
        {(['received', 'sent'] as TabType[]).map((tab) => {
          const count = tab === 'received' ? receivedList.length : sentList.length;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === 'received' ? 'Đã nhận' : 'Đã gửi'}{' '}
                {count > 0 ? `(${count})` : ''}
              </Text>
              {activeTab === tab && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      <FlatList
        data={currentList}
        keyExtractor={(item, index) => String(item.id || item.requestId || item.friendshipId || item.userId || `${activeTab}-${index}`)}
        renderItem={renderItem}
        ItemSeparatorComponent={renderSeparator}
        ListHeaderComponent={activeTab === 'received' && receivedList.length > 3 ? renderHeader : null}
        ListEmptyComponent={<EmptyState type={activeTab} isLoading={isLoading} />}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          currentList.length === 0 && styles.listContentEmpty,
        ]}
      />
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // ── Header ──
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    color: colors.text.inverse,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    position: 'relative',
  },
  tabText: {
    ...typography.body,
    color: colors.text.secondary,
    fontWeight: '400',
  },
  tabTextActive: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    width: 80,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },

  // ── List ──
  listContent: {
    paddingBottom: spacing.xl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },

  // ── Request Item ──
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
  },
  requestInfo: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  requestName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  requestSubtitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // ── Action Buttons ──
  rejectBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.background.secondary,
    minWidth: 72,
    alignItems: 'center',
  },
  rejectBtnText: {
    ...typography.caption,
    color: 'rgba(0,0,0,0.5)',
    fontWeight: '600',
  },
  acceptBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: `${colors.primary}20`,
    borderWidth: 1,
    borderColor: colors.primary,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 30,
  },
  acceptBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.background.secondary,
    minWidth: 72,
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },

  // ── Separator ──
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginLeft: spacing.screenPadding + spacing.iconSize.avatar + spacing.md,
  },

  // ── Section Header ──
  sectionHeader: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.light,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  showMoreBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  showMoreChevron: {
    marginLeft: spacing.xs,
  },

  // ── Empty ──
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.3,
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyLoadingText: {
    ...typography.body,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
});

export default FriendRequestsScreen;
