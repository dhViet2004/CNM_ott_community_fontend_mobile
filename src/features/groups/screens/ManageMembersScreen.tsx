import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';
import {
  getGroupMembers,
  removeMemberFromGroup,
  updateMemberRole,
  handleJoinRequest,
  fetchPendingRequests,
  getUserIdFromStorage,
} from '../api';
import { useAppDispatch } from '@store/hooks';
import { removeMemberAsync } from '@store/slices/groupsSlice';

type Props = RootStackScreenProps<'ManageMembers'>;

type TabType = 'all' | 'deputy' | 'member' | 'pending';

const ManageMembersScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // State
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isOwner = currentUserRole === 'OWNER';
  const isDeputy = currentUserRole === 'DEPUTY';
  const canManage = isOwner || isDeputy;

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [userId, membersData, pendingData] = await Promise.all([
        getUserIdFromStorage(),
        getGroupMembers(groupId),
        fetchPendingRequests(groupId).catch(() => []),
      ]);

      const userIdStr = String(userId || '');
      setCurrentUserId(userIdStr);
      setMembers(membersData || []);
      setPendingRequests(pendingData || []);

      const currentMember = (membersData || []).find(
        (m: any) => String(m.userId || m.id || '') === userIdStr
      );
      setCurrentUserRole((currentMember?.role || '').toUpperCase());
    } catch (err) {
      console.error('[ManageMembers] loadData error:', (err as any)?.response?.data, (err as any)?.message);
      Alert.alert('Lỗi', 'Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter members by tab and search
  const filteredMembers = useMemo(() => {
    let filtered = members;

    // Filter by tab
    switch (activeTab) {
      case 'deputy':
        filtered = filtered.filter(
          (m) => (m.role || '').toUpperCase() === 'DEPUTY'
        );
        break;
      case 'member':
        filtered = filtered.filter(
          (m) => (m.role || '').toUpperCase() === 'MEMBER'
        );
        break;
      case 'pending':
        filtered = pendingRequests;
        break;
      default:
        // 'all' - show all
        break;
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          (m.displayName || '').toLowerCase().includes(query) ||
          (m.username || '').toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [members, pendingRequests, activeTab, searchQuery]);

  // Tab counts
  const tabCounts = useMemo(() => ({
    all: members.length,
    deputy: members.filter((m) => (m.role || '').toUpperCase() === 'DEPUTY').length,
    member: members.filter((m) => (m.role || '').toUpperCase() === 'MEMBER').length,
    pending: pendingRequests.length,
  }), [members, pendingRequests]);

  // Handle kick member
  const handleKick = useCallback(async (member: any) => {
    const memberId = String(member.userId || member.id || '').trim();
    if (!memberId) {
      console.error('[ManageMembers] handleKick: member.userId and member.id are both empty. member object:', JSON.stringify(member));
      Alert.alert('Lỗi', 'Không xác định được ID thành viên để xóa');
      return;
    }
    Alert.alert(
      'Xác nhận',
      `Bạn có chắc muốn xóa ${member.displayName || member.username} khỏi nhóm?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(memberId);
            try {
              await removeMemberFromGroup(groupId, memberId);
              setMembers((prev) =>
                prev.filter((m) => String(m.userId || m.id) !== memberId)
              );
              // Nhiệm vụ 3: Dispatch Redux khi kick thành công
              dispatch(removeMemberAsync({ groupId, targetUserId: memberId }));
              Alert.alert('Thành công', 'Đã xóa thành viên');
            } catch (err: any) {
              console.error('[ManageMembers] kickMember error:', err?.response?.data, err?.message);
              Alert.alert(
                'Lỗi',
                err?.response?.data?.message || err?.message || 'Không thể xóa thành viên'
              );
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, [groupId, dispatch]);

  // Handle promote to deputy
  const handlePromote = useCallback(async (member: any) => {
    const memberId = String(member.userId || member.id || '');
    setActionLoading(memberId);
    try {
      await updateMemberRole(groupId, memberId, 'DEPUTY');
      setMembers((prev) =>
        prev.map((m) =>
          String(m.userId || m.id) === memberId ? { ...m, role: 'DEPUTY' } : m
        )
      );
      Alert.alert('Thành công', 'Đã thăng thành Phó nhóm');
    } catch (err: any) {
      console.error('[ManageMembers] promoteMember error:', err?.response?.data, err?.message);
      Alert.alert(
        'Lỗi',
        err?.response?.data?.message || err?.message || 'Không thể thăng vai trò'
      );
    } finally {
      setActionLoading(null);
    }
  }, [groupId]);

  // Handle demote to member
  const handleDemote = useCallback(async (member: any) => {
    const memberId = String(member.userId || member.id || '');
    setActionLoading(memberId);
    try {
      await updateMemberRole(groupId, memberId, 'MEMBER');
      setMembers((prev) =>
        prev.map((m) =>
          String(m.userId || m.id) === memberId ? { ...m, role: 'MEMBER' } : m
        )
      );
      Alert.alert('Thành công', 'Đã hạ xuống Thành viên');
    } catch (err: any) {
      console.error('[ManageMembers] demoteMember error:', err?.response?.data, err?.message);
      Alert.alert(
        'Lỗi',
        err?.response?.data?.message || err?.message || 'Không thể hạ vai trò'
      );
    } finally {
      setActionLoading(null);
    }
  }, [groupId]);

  // Handle approve/reject request
  const handleRequest = useCallback(async (request: any, action: 'APPROVE' | 'REJECT') => {
    const userId = String(request.userId || request.id || '');
    setActionLoading(userId);
    try {
      await handleJoinRequest(groupId, userId, action);
      setPendingRequests((prev) =>
        prev.filter((r) => String(r.userId || r.id) !== userId)
      );
      Alert.alert(
        'Thành công',
        action === 'APPROVE' ? 'Đã phê duyệt yêu cầu' : 'Đã từ chối yêu cầu'
      );
    } catch (err: any) {
      console.error('[ManageMembers] handleRequest error:', err?.response?.data, err?.message);
      Alert.alert(
        'Lỗi',
        err?.response?.data?.message || err?.message || 'Không thể xử lý yêu cầu'
      );
    } finally {
      setActionLoading(null);
    }
  }, [groupId]);

  // Render member item
  const renderMemberItem = ({ item }: { item: any }) => {
    const memberId = String(item.userId || item.id || '');
    const memberRole = (item.role || 'MEMBER').toUpperCase();
    const isSelf = memberId === currentUserId;
    const isOwnerMember = memberRole === 'OWNER';
    const isDeputyMember = memberRole === 'DEPUTY';
    const isMember = memberRole === 'MEMBER';

    // Permission checks
    const canKick = canManage && !isSelf && !isOwnerMember;
    const canPromote = isOwner && !isSelf && !isOwnerMember && !isDeputyMember;
    const canDemote = isOwner && !isSelf && isDeputyMember;

    const isLoading = actionLoading === memberId;

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberInfo}>
          <View style={styles.avatar}>
            {Icons.person(IconSize.lg)}
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {item.displayName || item.username || 'Unknown'}
            </Text>
            <Text style={styles.memberMeta}>
              {isOwnerMember
                ? 'Trưởng nhóm'
                : isDeputyMember
                ? 'Phó nhóm'
                : 'Thành viên'}
              {isSelf && ' (bạn)'}
            </Text>
          </View>
        </View>

        {(canKick || canPromote || canDemote) && (
          <View style={styles.memberActions}>
            {canPromote && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.promoteBtn]}
                onPress={() => handlePromote(item)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.promoteBtnText}>Thăng P</Text>
                )}
              </TouchableOpacity>
            )}
            {canDemote && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.demoteBtn]}
                onPress={() => handleDemote(item)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.text.secondary} />
                ) : (
                  <Text style={styles.demoteBtnText}>Hạ TV</Text>
                )}
              </TouchableOpacity>
            )}
            {canKick && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.kickBtn]}
                onPress={() => handleKick(item)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.status.error} />
                ) : (
                  <Text style={styles.kickBtnText}>Xóa</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // Render pending request item
  const renderPendingItem = ({ item }: { item: any }) => {
    const requestId = String(item.userId || item.id || '');
    const isLoading = actionLoading === requestId;

    return (
      <View style={styles.memberItem}>
        <View style={styles.memberInfo}>
          <View style={styles.avatar}>
            {Icons.person(IconSize.lg)}
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {item.displayName || item.username || 'Unknown'}
            </Text>
            <Text style={styles.memberMeta}>Yêu cầu tham gia</Text>
          </View>
        </View>

        {canManage && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleRequest(item, 'APPROVE')}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.status.success} />
              ) : (
                <Text style={styles.approveBtnText}>Duyệt</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleRequest(item, 'REJECT')}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.status.error} />
              ) : (
                <Text style={styles.rejectBtnText}>Từ chối</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {activeTab === 'pending'
          ? 'Không có yêu cầu nào'
          : 'Không có thành viên nào'}
      </Text>
    </View>
  );

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'deputy', label: 'Phó nhóm' },
    { key: 'member', label: 'Thành viên' },
    { key: 'pending', label: 'Chờ duyệt' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          {Icons.arrowBack(IconSize.lg)}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quản lý thành viên</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.label}
            </Text>
            <View
              style={[
                styles.tabBadge,
                activeTab === tab.key && styles.activeTabBadge,
              ]}
            >
              <Text
                style={[
                  styles.tabBadgeText,
                  activeTab === tab.key && styles.activeTabBadgeText,
                ]}
              >
                {tabCounts[tab.key]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      {activeTab !== 'pending' && (
        <View style={styles.searchContainer}>
          {Icons.search(IconSize.md)}
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm thành viên..."
            placeholderTextColor={colors.text.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              {Icons.close(IconSize.sm)}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={activeTab === 'pending' ? renderPendingItem : renderMemberItem}
          keyExtractor={(item) => String(item.userId || item.id || Math.random())}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  activeTabBadge: {
    backgroundColor: colors.primary,
  },
  tabBadgeText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.secondary,
  },
  activeTabBadgeText: {
    color: colors.text.inverse,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: 1,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  memberMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  promoteBtn: {
    backgroundColor: colors.primary + '20',
  },
  promoteBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  demoteBtn: {
    backgroundColor: colors.background.secondary,
  },
  demoteBtnText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  kickBtn: {
    backgroundColor: colors.status.error + '20',
  },
  kickBtnText: {
    ...typography.caption,
    color: colors.status.error,
    fontWeight: '600',
  },
  approveBtn: {
    backgroundColor: colors.status.success + '20',
  },
  approveBtnText: {
    ...typography.caption,
    color: colors.status.success,
    fontWeight: '600',
  },
  rejectBtn: {
    backgroundColor: colors.status.error + '20',
  },
  rejectBtnText: {
    ...typography.caption,
    color: colors.status.error,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
  },
});

export default ManageMembersScreen;
