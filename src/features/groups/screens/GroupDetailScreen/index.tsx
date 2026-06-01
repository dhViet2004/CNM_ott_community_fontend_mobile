import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Switch,
  Image,
} from 'react-native';
import { resolveUrl } from '@/utils/url';
import { messageApi } from '@/api/endpoints';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import {
  setSelectedGroup,
  setGroupMembers,
} from '@store/slices/groupsSlice';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import MessageSearchPanel from '@features/chat/components/MessageSearchPanel';
import type { RootStackScreenProps } from '@navigation/types';
import {
  fetchGroupById,
  getGroupMembers,
  leaveGroup,
  disbandGroup,
  fetchPendingRequests,
  handleJoinRequest,
  updateGroupSettings,
} from '@/features/groups/api';
import { styles } from './styles';
import { ProfileSection } from './ProfileSection';
import { MemberSection } from './MemberSection';

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

const ZALO_BLUE = '#008AF3';

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [fileItems, setFileItems] = useState<any[]>([]);

  // Role-based permissions
  const currentMember = members.find(
    (m) => String(m.userId) === String(currentUserId)
  );
  const currentRole = currentMember?.role?.toUpperCase() || '';
  const isOwner = !loading && currentRole === 'OWNER';
  const isAdmin = !loading && (currentRole === 'OWNER' || currentRole === 'DEPUTY');

  // Load data
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

      // Load group sent media and files
      try {
        const messageRes = await messageApi.getConversationMessages(groupId, 100);
        const msgs = messageRes.messages || [];

        // Filter images/videos
        const filteredMedia = msgs.filter((m: any) => {
          const type = m.contentType || m.type;
          const hasImgAttachment = m.attachments?.some((a: any) => a.type === 'image' || a.type === 'video');
          return type === 'image' || type === 'video' || hasImgAttachment;
        });

        // Resolve URLs for all media items
        const resolvedMedia = await Promise.all(
          filteredMedia.map(async (m: any) => {
            const attachment = m.attachments?.find((item: any) => item?.type === 'image' || item?.type === 'video') ?? m.attachments?.[0];
            const rawUrl = attachment?.url || '';
            const resolvedUrl = rawUrl ? await resolveUrl(rawUrl) : undefined;
            return {
              id: String(m.id),
              type: attachment?.type === 'video' || m.contentType === 'video' ? 'video' : 'image',
              url: resolvedUrl,
              name: attachment?.name || m.content || 'Đính kèm',
            };
          })
        );
        setMediaItems(resolvedMedia);

        // Filter files/documents
        const filteredFiles = msgs.filter((m: any) => {
          const type = m.contentType || m.type;
          const hasFileAttachment = m.attachments?.some((a: any) => a.type === 'file' || a.type === 'document');
          return type === 'file' || hasFileAttachment;
        });

        const resolvedFiles = await Promise.all(
          filteredFiles.map(async (m: any) => {
            const attachment = m.attachments?.find((item: any) => item?.type === 'file' || item?.type === 'document') ?? m.attachments?.[0];
            const rawUrl = attachment?.url || '';
            const resolvedUrl = rawUrl ? await resolveUrl(rawUrl) : undefined;
            return {
              id: String(m.id),
              name: attachment?.name || m.content || 'Tệp đính kèm',
              url: resolvedUrl,
              size: attachment?.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Chưa rõ',
            };
          })
        );
        setFileItems(resolvedFiles);
      } catch (mediaErr) {
        console.error('Failed to load group media history:', mediaErr);
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

  // Placeholder handler
  const handlePlaceholder = useCallback((label: string) => {
    Alert.alert('Thông báo', `Tính năng "${label}" đang được phát triển`);
  }, []);

  // Navigation handlers
  const handleStartChat = useCallback(() => {
    navigation.navigate('GroupChat', {
      groupId,
      title: selectedGroup?.name || 'Nhóm',
    });
  }, [groupId, selectedGroup, navigation]);

  const handleAddMembers = useCallback(() => {
    navigation.navigate('AddMembers', { groupId });
  }, [groupId, navigation]);

  const handleOpenGroupLink = useCallback(() => {
    navigation.navigate('GroupInviteLink', { groupId });
  }, [groupId, navigation]);

  // Members management
  const handleViewMembers = useCallback(() => {
    if (!members.length) {
      Alert.alert('Thành viên', 'Chưa có dữ liệu thành viên');
      return;
    }

    const preview = members
      .slice(0, 10)
      .map((m) => `• ${m.display_name || m.username} (${m.role})`)
      .join('\n');
    const remain =
      members.length > 10 ? `\n... và ${members.length - 10} thành viên khác` : '';
    Alert.alert('Danh sách thành viên', `${preview}${remain}`);
  }, [members]);

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
              Alert.alert(
                'Lỗi',
                err?.response?.data?.message || 'Không thể từ chối yêu cầu'
              );
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
              Alert.alert(
                'Lỗi',
                err?.response?.data?.message || 'Không thể duyệt yêu cầu'
              );
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
      Alert.alert(
        'Lỗi',
        err?.response?.data?.message || 'Không thể cập nhật cài đặt nhóm'
      );
    }
  }, [approvalRequired, groupId]);

  // Leave/Disband
  const handleLeaveOrDisbandGroup = useCallback(() => {
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
              Alert.alert(
                'Thành công',
                isOwner ? 'Đã giải tán nhóm' : 'Đã rời nhóm'
              );
              navigation.navigate('Groups');
            } catch (err: any) {
              Alert.alert(
                'Lỗi',
                err?.response?.data?.message || 'Thao tác thất bại'
              );
            }
          },
        },
      ]
    );
  }, [isOwner, groupId, navigation]);

  // Settings handlers
  const handleOpenGroupSettings = useCallback(() => {
    navigation.navigate('GroupSettings', { groupId });
  }, [groupId, navigation]);

  // Computed values
  const groupLink = selectedGroup?.invite_code
    ? `https://zalo.me/g/${selectedGroup.invite_code}`
    : 'https://zalo.me/g/ottcommunity';

  const mediaPreview = ['Em trai', 'Tắt thông báo', 'Cuộc gọi video', 'Desktop'];

  if (loading && !selectedGroup) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {/* Zalo-style header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            {Icons.back(IconSize.lg, colors.text.inverse)}
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedGroup?.name || 'Chi tiết nhóm'}
          </Text>
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => handlePlaceholder('Thêm')}
          >
            {Icons.more(IconSize.lg, colors.text.inverse)}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      {/* Profile Section */}
      <ProfileSection
        groupName={selectedGroup?.name || ''}
        avatarUrl={selectedGroup?.avatar_url}
        description={selectedGroup?.description}
        onEditAvatar={() => handlePlaceholder('Đổi ảnh nhóm')}
        onEditName={() => handlePlaceholder('Đổi tên nhóm')}
        onEditDescription={() => handlePlaceholder('Thêm mô tả nhóm')}
        onAddMembers={handleAddMembers}
        onSearch={() => setIsSearchOpen(true)}
        onChangeWallpaper={() => handlePlaceholder('Đổi hình nền')}
        onMute={() => handlePlaceholder('Tắt thông báo')}
      />

      {/* Media Section */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => {
            Alert.alert(
              'Kho lưu trữ truyền thông',
              `Đoạn chat này có ${mediaItems.length} ảnh/video và ${fileItems.length} tệp tin đã gửi.`
            );
          }}
        >
          <View style={styles.rowLeft}>
            {Icons.imageOutline(IconSize.xl)}
            <Text style={styles.rowTitle}>Ảnh, file, link</Text>
          </View>
          <Text style={styles.rowMutedText}>{mediaItems.length + fileItems.length} mục</Text>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>

        {mediaItems.length === 0 && fileItems.length === 0 ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
            <Text style={{ color: colors.text.tertiary, fontStyle: 'italic', fontSize: 13 }}>
              Chưa có hình ảnh hoặc file nào được chia sẻ trong nhóm
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mediaRow}
          >
            {mediaItems.slice(0, 8).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.mediaThumb}
                onPress={() => {
                  if (item.url) {
                    Alert.alert('Xem file', `Bạn muốn mở ${item.name}?`, [
                      { text: 'Hủy', style: 'cancel' },
                      { text: 'Mở link', onPress: () => Share.share({ message: item.url }) },
                    ]);
                  }
                }}
              >
                {item.url ? (
                  <Image
                    source={{ uri: item.url }}
                    style={{ width: '100%', height: '100%', borderRadius: spacing.borderRadius.md }}
                  />
                ) : (
                  <Text style={styles.mediaThumbText} numberOfLines={2}>
                    {item.name}
                  </Text>
                )}
              </TouchableOpacity>
            ))}

            {fileItems.slice(0, 4).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.mediaThumb, { backgroundColor: '#EBF3FF', borderColor: '#C8E0FF' }]}
                onPress={() => {
                  if (item.url) {
                    Share.share({ message: item.url });
                  }
                }}
              >
                <View style={{ alignItems: 'center', justifyContent: 'center', padding: 4 }}>
                  <Text style={{ fontSize: 24 }}>📄</Text>
                  <Text
                    style={{
                      ...typography.caption,
                      color: colors.primary,
                      fontSize: 10,
                      fontWeight: 'bold',
                      textAlign: 'center',
                      marginTop: 2,
                    }}
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Features Section */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => handlePlaceholder('Lịch nhóm')}
        >
          <View style={styles.rowLeft}>
            {Icons.calendar(IconSize.xl)}
            <Text style={styles.rowTitle}>Lịch nhóm</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => handlePlaceholder('Tin nhắn đã ghim')}
        >
          <View style={styles.rowLeft}>
            {Icons.pin(IconSize.xl)}
            <Text style={styles.rowTitle}>Tin nhắn đã ghim</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => handlePlaceholder('Bình chọn')}
        >
          <View style={styles.rowLeft}>
            {Icons.layers(IconSize.xl)}
            <Text style={styles.rowTitle}>Bình chọn</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>
      </View>

      {/* Member Section - Role-based visibility */}
      <MemberSection
        isAdmin={isAdmin}
        isOwner={isOwner}
        memberCount={selectedGroup?.member_count || members.length}
        pendingCount={pendingRequests.length}
        approvalRequired={approvalRequired}
        inviteCode={selectedGroup?.invite_code}
        groupLink={groupLink}
        onViewMembers={handleViewMembers}
        onReviewPending={handleReviewPendingRequests}
        onOpenGroupLink={handleOpenGroupLink}
        onOpenSettings={handleOpenGroupSettings}
        onToggleApprovalRequired={handleToggleApprovalRequired}
      />

      {/* Settings Section */}
      <View style={styles.sectionCard}>
        {/* Only Admin can toggle approval */}
        {isAdmin && (
          <View style={styles.switchRow}>
            <View style={styles.rowLeft}>
              {Icons.pin(IconSize.xl)}
              <Text style={styles.rowTitle}>Duyệt vào nhóm</Text>
            </View>
            <Switch
              value={approvalRequired}
              onValueChange={handleToggleApprovalRequired}
              trackColor={{ false: '#E3E3E3', true: '#8BC1FF' }}
              thumbColor={colors.text.inverse}
            />
          </View>
        )}

        {/* Personal settings - visible to all */}
        <View style={styles.switchRow}>
          <View style={styles.rowLeft}>
            {Icons.eyeOff(IconSize.xl)}
            <Text style={styles.rowTitle}>Ẩn trò chuyện</Text>
          </View>
          <Switch
            value={isHidden}
            onValueChange={setIsHidden}
            trackColor={{ false: '#E3E3E3', true: '#8BC1FF' }}
            thumbColor={colors.text.inverse}
          />
        </View>

        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => handlePlaceholder('Cài đặt cá nhân')}
        >
          <View style={styles.rowLeft}>
            {Icons.settingsOutline(IconSize.xl)}
            <Text style={styles.rowTitle}>Cài đặt cá nhân</Text>
          </View>
          {Icons.chevronRight(IconSize.lg)}
        </TouchableOpacity>
      </View>

      {/* Danger Zone */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => handlePlaceholder('Báo xấu')}
        >
          <View style={styles.rowLeft}>
            {Icons.alertCircle(IconSize.xl)}
            <Text style={styles.rowTitle}>Báo xấu</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => handlePlaceholder('Dung lượng trò chuyện')}
        >
          <View style={styles.rowLeft}>
            {Icons.folder(IconSize.xl)}
            <Text style={styles.rowTitle}>Dung lượng trò chuyện</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rowItem}
          onPress={() => handlePlaceholder('Xóa lịch sử trò chuyện')}
        >
          <View style={styles.rowLeft}>
            {Icons.deleteOutline(IconSize.xl)}
            <Text style={styles.rowTitle}>Xóa lịch sử trò chuyện</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.rowItem}
          onPress={handleLeaveOrDisbandGroup}
        >
          <View style={styles.rowLeft}>
            {Icons.logOut(IconSize.xl)}
            <Text style={styles.leaveText}>
              {isOwner ? 'Giải tán nhóm' : 'Rời nhóm'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Start Chat Button */}
      <TouchableOpacity
        style={styles.startChatBtn}
        onPress={handleStartChat}
      >
        <Text style={styles.startChatBtnText}>Nhắn tin nhóm</Text>
      </TouchableOpacity>

      {/* ── Search Panel ── */}
      <MessageSearchPanel
        visible={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        conversationId={groupId}
        currentUserId={currentUserId}
        onResultClick={(item) => {
          setIsSearchOpen(false);
          if (String(item.conversationId) === String(groupId)) {
            handleStartChat(); // Navigate to group chat first
            // We might need to pass focusedMessageId to handleStartChat
            navigation.navigate('GroupChat', {
              groupId,
              title: selectedGroup?.name || 'Nhóm',
              focusedMessageId: String(item.id),
            });
          } else {
            // Navigate to other conversation
            if (item.conversationId.startsWith('dm:')) {
              navigation.navigate('Chat', {
                conversationId: item.conversationId,
                title: item.senderDisplayName || 'Cuộc trò chuyện',
                focusedMessageId: String(item.id),
              });
            } else {
              navigation.navigate('GroupChat', {
                groupId: item.conversationId,
                title: 'Nhóm',
                focusedMessageId: String(item.id),
              });
            }
          }
        }}
      />
    </ScrollView>
    </View>
  );
};

export default GroupDetailScreen;
