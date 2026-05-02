import React, { useState, useEffect, useCallback } from 'react';
import { useIsFocused } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import {
  setSelectedGroup,
  setGroupMembers,
} from '@store/slices/groupsSlice';
import { colors, spacing, typography } from '@theme';
import { Avatar, Icons, IconSize } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';
import {
  fetchGroupById,
  getGroupMembers,
  addMembersToGroup,
  leaveGroup,
  disbandGroup,
  fetchPendingRequests,
  handleJoinRequest,
  updateGroupSettings,
} from '../api';

const normalizeGroupDetail = (group: any) => ({
  groupId: group.groupId,
  name: group.name,
  description: group.description || '',
  avatar_url: group.avatar_url ?? group.avatarUrl ?? null,
  is_private:
    group.is_private ??
    (group.topic === 'private' || group.topic === 'private_community' || false),
  invite_code: group.invite_code || group.inviteCode || '',
  member_count: group.member_count ?? group.memberCount ?? 0,
  created_by: group.created_by || group.createdBy || group.ownerId || '',
  created_at: group.created_at || group.createdAt || '',
  isApprovalRequired: group.isApprovalRequired ?? false,
  allowSendLinks: group.allowSendLinks || 'ALL',
  spamFilterLevel: group.spamFilterLevel ?? 1,
  members: Array.isArray(group.members)
    ? group.members.map((member: any) => ({
        userId: String(member.userId || member.id || ''),
        username: member.username || '',
        display_name: member.display_name || member.displayName || member.username || '',
        avatar_url: member.avatar_url ?? member.avatarUrl ?? null,
        role: member.role || 'MEMBER',
        joined_at: member.joined_at || member.joinedAt || null,
      }))
    : [],
});

type Props = RootStackScreenProps<'GroupDetail'>;

const GroupDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const isFocused = useIsFocused();
  const rawGroupId = route.params.groupId;
  const groupId = String(rawGroupId || '').replace(/^group:/, '').trim();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const selectedGroup = useAppSelector((state) => state.groups.selectedGroup);
  const members = useAppSelector(
    (state) => state.groups.groupMembers[groupId] || []
  );
  const currentUserId = useAppSelector((state) => state.auth.user?.userId || '');
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [approvalRequired, setApprovalRequired] = useState(false);

  const loadGroup = useCallback(async () => {
    if (!groupId || groupId === 'undefined' || groupId === 'null') {
      Alert.alert('Lỗi', 'ID nhóm không hợp lệ');
      return;
    }

    setLoading(true);
    try {
      const [group, membersData] = await Promise.all([
        fetchGroupById(groupId),
        getGroupMembers(groupId),
      ]);
      const normalizedGroup = normalizeGroupDetail(group);
      dispatch(setSelectedGroup(normalizedGroup as any));
      dispatch(setGroupMembers({ groupId, members: membersData }));
      setApprovalRequired(Boolean((normalizedGroup as any).isApprovalRequired));

      try {
        const pending = await fetchPendingRequests(groupId);
        setPendingRequests(Array.isArray(pending) ? pending : []);
      } catch {
        setPendingRequests([]);
      }
    } catch (err) {
      console.error('Failed to load group:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId, dispatch]);

  useEffect(() => {
    if (isFocused) {
      loadGroup();
    }
  }, [loadGroup, isFocused]);

  const handleShareInvite = useCallback(async () => {
    if (!selectedGroup?.invite_code) return;
    try {
      await Share.share({
        message: `Tham gia nhóm "${selectedGroup.name}" trên OTT Community!\nMã mời: ${selectedGroup.invite_code}`,
      });
    } catch {}
  }, [selectedGroup]);

  const handleStartChat = useCallback(() => {
    navigation.navigate('GroupChat', {
      groupId,
      title: selectedGroup?.name || 'Nhóm',
    });
  }, [groupId, selectedGroup, navigation]);

  const handlePlaceholderAction = useCallback((label: string) => {
    Alert.alert('Thông báo', `Tính năng "${label}" đang được phát triển`);
  }, []);

  const handleAddMembers = useCallback(() => {
    navigation.navigate('AddMembers', { groupId });
  }, [groupId, navigation]);

  const handleReviewPendingRequests = useCallback(() => {
    if (!pendingRequests.length) {
      Alert.alert('Thông báo', 'Không có yêu cầu nào đang chờ duyệt');
      return;
    }

    const request = pendingRequests[0];
    const displayName = request.displayName || request.username || request.userId;

    Alert.alert(
      'Duyệt yêu cầu',
      `${displayName} muốn tham gia nhóm`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            try {
              await handleJoinRequest(groupId, request.userId, 'REJECT');
              await loadGroup();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể từ chối yêu cầu');
            }
          },
        },
        {
          text: 'Duyệt',
          onPress: async () => {
            try {
              await handleJoinRequest(groupId, request.userId, 'APPROVE');
              await loadGroup();
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể duyệt yêu cầu');
            }
          },
        },
      ]
    );
  }, [pendingRequests, groupId, loadGroup]);

  const handleToggleApprovalRequired = useCallback(async () => {
    const next = !approvalRequired;
    setApprovalRequired(next);
    try {
      await updateGroupSettings(groupId, { isApprovalRequired: next });
    } catch (err: any) {
      setApprovalRequired(!next);
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể cập nhật cài đặt nhóm');
    }
  }, [approvalRequired, groupId]);

  const handleViewMembers = useCallback(() => {
    if (!members.length) {
      Alert.alert('Thành viên', 'Chưa có dữ liệu thành viên');
      return;
    }

    const preview = members
      .slice(0, 10)
      .map((m) => `• ${m.display_name || m.username} (${m.role})`)
      .join('\n');
    const remain = members.length > 10 ? `\n... và ${members.length - 10} thành viên khác` : '';
    Alert.alert('Danh sách thành viên', `${preview}${remain}`);
  }, [members]);

  const handleLeaveOrDisbandGroup = useCallback(() => {
    const ownerId = String((selectedGroup as any)?.created_by || '');
    const isOwner = ownerId && String(ownerId) === String(currentUserId);

    Alert.alert(
      isOwner ? 'Giải tán nhóm' : 'Rời nhóm',
      isOwner
        ? 'Bạn là chủ nhóm. Tiếp tục sẽ giải tán nhóm này cho tất cả thành viên.'
        : 'Bạn có chắc muốn rời nhóm này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: isOwner ? 'Giải tán' : 'Rời nhóm',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isOwner) {
                await disbandGroup(groupId);
              } else {
                await leaveGroup(groupId);
              }
              Alert.alert('Thành công', isOwner ? 'Đã giải tán nhóm' : 'Đã rời nhóm');
              navigation.navigate('Groups');
            } catch (err: any) {
              Alert.alert('Lỗi', err?.response?.data?.message || 'Thao tác thất bại');
            }
          },
        },
      ]
    );
  }, [selectedGroup, currentUserId, groupId, navigation]);

  const groupLink =
    selectedGroup?.invite_code
      ? `https://zalo.me/g/${selectedGroup.invite_code}`
      : 'https://zalo.me/g/ottcommunity';

  const quickActions = [
    { key: 'search', label: 'Tìm\ntin nhắn', icon: Icons.search(28), onPress: () => handlePlaceholderAction('Tìm tin nhắn') },
    { key: 'add', label: 'Thêm\nthành viên', icon: Icons.groupAdd(28), onPress: handleAddMembers },
    { key: 'wallpaper', label: 'Đổi\nhình nền', icon: Icons.imageOutline(28), onPress: () => handlePlaceholderAction('Đổi hình nền') },
    { key: 'mute', label: 'Tắt\nthông báo', icon: Icons.bellOff(28), onPress: () => handlePlaceholderAction('Tắt thông báo') },
  ];

  const mediaPreview = ['Em trai', 'Tắt thông báo', 'Cuộc gọi video', 'Desktop'];

  if (loading && !selectedGroup) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <View style={styles.profileCard}>
        <View style={styles.avatarWrap}>
          <Avatar
            name={selectedGroup?.name || 'G'}
            uri={selectedGroup?.avatar_url || undefined}
            size="xl"
          />
          <TouchableOpacity
            style={styles.avatarCameraBtn}
            onPress={() => handlePlaceholderAction('Đổi ảnh nhóm')}
          >
            {Icons.cameraOutline(IconSize.md)}
          </TouchableOpacity>
        </View>

        <View style={styles.groupTitleRow}>
          <Text style={styles.groupTitle}>{selectedGroup?.name || 'CNM Nhóm'}</Text>
          <TouchableOpacity onPress={() => handlePlaceholderAction('Đổi tên nhóm')}>
            {Icons.edit(IconSize.md)}
          </TouchableOpacity>
        </View>

        <View style={styles.quickActionsRow}>
          {quickActions.map((item) => (
            <TouchableOpacity key={item.key} style={styles.quickActionItem} onPress={item.onPress}>
              <View style={styles.quickActionIcon}>{item.icon}</View>
              <Text style={styles.quickActionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.rowItem} onPress={() => handlePlaceholderAction('Thêm mô tả nhóm')}>
          <View style={styles.rowLeft}>
            {Icons.informationCircle(IconSize.xl)}
            <Text style={styles.rowMutedText}>Thêm mô tả nhóm</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.rowItem} onPress={() => handlePlaceholderAction('Ảnh, file, link')}>
          <View style={styles.rowLeft}>
            {Icons.imageOutline(IconSize.xl)}
            <Text style={styles.rowTitle}>Ảnh, file, link</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mediaRow}>
          {mediaPreview.map((item, idx) => (
            <View key={`${item}-${idx}`} style={styles.mediaThumb}>
              <Text style={styles.mediaThumbText}>{item}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.mediaArrow} onPress={() => handlePlaceholderAction('Xem thêm media')}>
            {Icons.arrowForward(IconSize.lg)}
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.rowItem} onPress={() => handlePlaceholderAction('Lịch nhóm')}>
          <View style={styles.rowLeft}>
            {Icons.calendar(IconSize.xl)}
            <Text style={styles.rowTitle}>Lịch nhóm</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>

        <TouchableOpacity style={styles.rowItem} onPress={() => handlePlaceholderAction('Tin nhắn đã ghim')}>
          <View style={styles.rowLeft}>
            {Icons.pin(IconSize.xl)}
            <Text style={styles.rowTitle}>Tin nhắn đã ghim</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>

        <TouchableOpacity style={styles.rowItem} onPress={() => handlePlaceholderAction('Bình chọn')}>
          <View style={styles.rowLeft}>
            {Icons.layers(IconSize.xl)}
            <Text style={styles.rowTitle}>Bình chọn</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        {!!pendingRequests.length && (
          <TouchableOpacity style={styles.rowItem} onPress={handleReviewPendingRequests}>
            <View style={styles.rowLeft}>
              {Icons.people(IconSize.xl)}
              <Text style={styles.rowTitle}>Duyệt yêu cầu vào nhóm ({pendingRequests.length})</Text>
            </View>
            {Icons.chevronRight(IconSize.lg)}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.rowItem} onPress={handleViewMembers}>
          <View style={styles.rowLeft}>
            {Icons.userGroup(IconSize.xl)}
            <Text style={styles.rowTitle}>Xem thành viên ({selectedGroup?.member_count || members.length})</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>

        <TouchableOpacity style={styles.rowItem} onPress={handleShareInvite}>
          <View style={styles.rowLeft}>
            {Icons.link(IconSize.xl)}
            <View>
              <Text style={styles.rowTitle}>Link nhóm</Text>
              <Text style={styles.rowSubTitle}>{groupLink}</Text>
            </View>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.switchRow}>
          <View style={styles.rowLeft}>
            {Icons.pin(IconSize.xl)}
            <Text style={styles.rowTitle}>Duyệt vào nhóm</Text>
          </View>
          <Switch value={approvalRequired} onValueChange={handleToggleApprovalRequired} trackColor={{ false: '#E3E3E3', true: '#8BC1FF' }} thumbColor={colors.text.inverse} />
        </View>

        <View style={styles.switchRow}>
          <View style={styles.rowLeft}>
            {Icons.eyeOff(IconSize.xl)}
            <Text style={styles.rowTitle}>Ẩn trò chuyện</Text>
          </View>
          <Switch value={isHidden} onValueChange={setIsHidden} trackColor={{ false: '#E3E3E3', true: '#8BC1FF' }} thumbColor={colors.text.inverse} />
        </View>

        <TouchableOpacity style={styles.rowItem} onPress={() => handlePlaceholderAction('Cài đặt cá nhân')}>
          <View style={styles.rowLeft}>
            {Icons.settingsOutline(IconSize.xl)}
            <Text style={styles.rowTitle}>Cài đặt cá nhân</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>
      </View>

      <View style={styles.sectionCard}>
        <TouchableOpacity style={styles.rowItem} onPress={() => handlePlaceholderAction('Báo xấu')}>
          <View style={styles.rowLeft}>
            {Icons.alertCircle(IconSize.xl)}
            <Text style={styles.rowTitle}>Báo xấu</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rowItem} onPress={() => handlePlaceholderAction('Dung lượng trò chuyện')}>
          <View style={styles.rowLeft}>
            {Icons.folder(IconSize.xl)}
            <Text style={styles.rowTitle}>Dung lượng trò chuyện</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rowItem} onPress={() => handlePlaceholderAction('Xóa lịch sử trò chuyện')}>
          <View style={styles.rowLeft}>
            {Icons.deleteOutline(IconSize.xl)}
            <Text style={styles.rowTitle}>Xóa lịch sử trò chuyện</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.rowItem} onPress={handleLeaveOrDisbandGroup}>
          <View style={styles.rowLeft}>
            {Icons.logOut(IconSize.xl)}
            <Text style={styles.leaveText}>{String((selectedGroup as any)?.created_by || '') === String(currentUserId) ? 'Giải tán nhóm' : 'Rời nhóm'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.startChatBtn} onPress={handleStartChat}>
        <Text style={styles.startChatBtnText}>Nhắn tin nhóm</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.secondary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary },
  profileCard: {
    backgroundColor: colors.background.primary,
    paddingTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraBtn: {
    position: 'absolute',
    right: '38%',
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  groupTitle: {
    ...typography.h1,
    color: colors.text.primary,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  quickActionItem: {
    alignItems: 'center',
    width: 74,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F1F1',
    marginBottom: spacing.sm,
  },
  quickActionLabel: {
    ...typography.bodySmall,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.background.primary,
    marginBottom: spacing.sm,
  },
  rowItem: {
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontSize: 20,
  },
  rowMutedText: {
    ...typography.h3,
    color: colors.text.tertiary,
    fontSize: 20,
  },
  rowSubTitle: {
    ...typography.body,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  mediaRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  mediaThumb: {
    width: 92,
    height: 92,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#F3F3F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  mediaThumbText: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  mediaArrow: {
    width: 92,
    height: 92,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#EDF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  switchRow: {
    minHeight: 68,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  leaveText: {
    ...typography.h3,
    color: colors.status.error,
    fontSize: 20,
  },
  startChatBtn: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
  startChatBtnText: {
    ...typography.button,
    color: colors.text.inverse,
  },
});

export default GroupDetailScreen;
