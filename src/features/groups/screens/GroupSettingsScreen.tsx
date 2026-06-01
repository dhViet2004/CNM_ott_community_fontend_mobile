import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setSelectedGroup } from '@store/slices/groupsSlice';
import { removeConversationById } from '@store/slices/chatSlice';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';
import {
  fetchGroupById,
  updateGroupSettings,
  getGroupMembers,
  removeMemberFromGroup,
  updateMemberRole,
  leaveGroup,
  disbandGroup,
  handleJoinRequest,
  fetchPendingRequests,
  getUserIdFromStorage,
  fetchGroupInvite,
  type InviteInfo,
} from '../api';

type Props = RootStackScreenProps<'GroupSettings'>;

const ZALO_BLUE = '#008AF3';

const GroupSettingsScreen: React.FC<Props> = ({ route, navigation }) => {
  const groupId = route.params.groupId;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // Settings state
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [allowSendLinks, setAllowSendLinks] = useState<'ALL' | 'ADMINS_ONLY'>('ALL');
  const [spamFilterLevel, setSpamFilterLevel] = useState<0 | 1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Member management state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load current settings
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [userId, group, membersData, pendingData] = await Promise.all([
        getUserIdFromStorage(),
        fetchGroupById(groupId),
        getGroupMembers(groupId),
        fetchPendingRequests(groupId).catch(() => []),
      ]);

      const userIdStr = String(userId || '');
      setCurrentUserId(userIdStr);
      const g = group as any;
      setGroupName(g.name || '');
      setGroupDescription(g.description || '');
      setApprovalRequired(Boolean(g.isApprovalRequired));
      setAllowSendLinks(
        g.allowSendLinks === 'ADMINS_ONLY' ? 'ADMINS_ONLY' : 'ALL'
      );
      setSpamFilterLevel(
        g.spamFilterLevel === 0
          ? 0
          : g.spamFilterLevel === 2
          ? 2
          : 1
      );
      setMembers(membersData || []);
      setPendingRequests(pendingData || []);

      // Backend dùng UPPERCASE: OWNER, DEPUTY, MEMBER
      const currentMember = (membersData || []).find(
        (m: any) => String(m.userId || m.id || '') === userIdStr
      );
      const currentRole = currentMember?.role?.toUpperCase() || '';
      setIsOwner(currentRole === 'OWNER');
      setIsAdmin(currentRole === 'OWNER' || currentRole === 'DEPUTY');
      dispatch(setSelectedGroup(group as any));

      setInviteLoading(true);
      try {
        const invite = await fetchGroupInvite(groupId);
        setInviteInfo(invite);
      } catch (inviteErr) {
        console.error('[GroupSettings] fetchGroupInvite error:', inviteErr);
        setInviteInfo(null);
      } finally {
        setInviteLoading(false);
      }
    } catch (err) {
      console.error('Failed to load group settings:', err);
      Alert.alert('Lỗi', 'Không thể tải cài đặt nhóm');
    } finally {
      setLoading(false);
    }
  }, [groupId, dispatch]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await updateGroupSettings(groupId, {
        isApprovalRequired: approvalRequired,
        allowSendLinks,
        spamFilterLevel,
      });
      Alert.alert('Thành công', 'Đã lưu cài đặt nhóm');
    } catch (err: any) {
      console.error('[GroupSettings] updateGroupSettings error:', err?.response?.data, err?.message);
      Alert.alert(
        'Lỗi',
        err?.response?.data?.message || err?.message || 'Không thể lưu cài đặt'
      );
    } finally {
      setSaving(false);
    }
  }, [groupId, approvalRequired, allowSendLinks, spamFilterLevel]);

  // Toggle approval required
  const handleToggleApproval = useCallback(async () => {
    const next = !approvalRequired;
    setApprovalRequired(next);
    try {
      await updateGroupSettings(groupId, { isApprovalRequired: next });
    } catch (err: any) {
      setApprovalRequired(!next);
      console.error('[GroupSettings] toggleApproval error:', err?.response?.data, err?.message);
      Alert.alert(
        'Lỗi',
        err?.response?.data?.message || err?.message || 'Không thể cập nhật'
      );
    }
  }, [approvalRequired, groupId]);

  // Kick member
  const handleKickMember = useCallback(
    async (memberId: string | number, memberName: string) => {
      const uId = String(memberId || '').trim();
      if (!uId) {
        console.error('[GroupSettings] handleKickMember: memberId is empty:', memberId);
        Alert.alert('Lỗi', 'Không xác định được ID thành viên để xóa');
        return;
      }
      Alert.alert(
        'Xác nhận',
        `Bạn có chắc muốn xóa ${memberName} khỏi nhóm?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeMemberFromGroup(groupId, uId);
                setMembers((prev) =>
                  prev.filter((m) => String(m.userId || m.id) !== uId)
                );
                Alert.alert('Thành công', 'Đã xóa thành viên');
              } catch (err: any) {
                console.error('[GroupSettings] kickMember error:', err?.response?.data, err?.message);
                Alert.alert(
                  'Lỗi',
                  err?.response?.data?.message || err?.message || 'Không thể xóa thành viên'
                );
              }
            },
          },
        ]
      );
    },
    [groupId]
  );

  // Update member role
  const handleUpdateRole = useCallback(
    async (memberId: string | number, newRole: string) => {
      try {
        await updateMemberRole(groupId, memberId, newRole);
        setMembers((prev) =>
          prev.map((m) =>
            String(m.userId || m.id) === String(memberId)
              ? { ...m, role: newRole }
              : m
          )
        );
        Alert.alert('Thành công', `Đã cập nhật vai trò thành viên`);
      } catch (err: any) {
        console.error('[GroupSettings] updateRole error:', err?.response?.data, err?.message);
        Alert.alert(
          'Lỗi',
          err?.response?.data?.message || err?.message || 'Không thể cập nhật vai trò'
        );
      }
    },
    [groupId]
  );

  // Handle join request (approve/reject)
  const handleRequest = useCallback(
    async (userId: string | number, action: 'APPROVE' | 'REJECT') => {
      try {
        await handleJoinRequest(groupId, userId, action);
        setPendingRequests((prev) =>
          prev.filter((r) => String(r.userId || r.id) !== String(userId))
        );
        Alert.alert(
          'Thành công',
          action === 'APPROVE' ? 'Đã phê duyệt yêu cầu' : 'Đã từ chối yêu cầu'
        );
      } catch (err: any) {
        console.error('[GroupSettings] handleRequest error:', err?.response?.data, err?.message);
        Alert.alert(
          'Lỗi',
          err?.response?.data?.message || err?.message || 'Không thể xử lý yêu cầu'
        );
      }
    },
    [groupId]
  );

  // Leave group - Owner must transfer first, others can leave directly
  const handleLeaveGroupConfirm = useCallback(
    async (newOwnerId?: string | number) => {
      // If owner and no newOwnerId, navigate to transfer screen
      if (isOwner && !newOwnerId) {
        navigation.navigate('TransferOwner', { groupId, groupName });
        return;
      }

      Alert.alert(
        'Xác nhận',
        'Bạn có chắc muốn rời nhóm?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Rời nhóm',
            style: 'destructive',
            onPress: async () => {
              try {
                await leaveGroup(groupId, newOwnerId);
                // Nhiệm vụ 3: Dispatch Redux khi rời nhóm thành công
                dispatch(removeConversationById(String(groupId)));
                Alert.alert('Thành công', 'Bạn đã rời nhóm', [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('MainTabs'),
                  },
                ]);
              } catch (err: any) {
                console.error('[GroupSettings] leaveGroup error:', err?.response?.data, err?.message);
                Alert.alert(
                  'Lỗi',
                  err?.response?.data?.message || err?.message || 'Không thể rời nhóm'
                );
              }
            },
          },
        ]
      );
    },
    [groupId, groupName, isOwner, navigation, dispatch]
  );

  // Disband group
  const handleDisbandGroupConfirm = useCallback(async () => {
    Alert.alert(
      'Cảnh báo',
      'Bạn có chắc muốn giải tán nhóm này? Hành động này không thể hoàn tác!',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Giải tán',
          style: 'destructive',
          onPress: async () => {
            try {
              await disbandGroup(groupId);
              // Nhiệm vụ 3: Dispatch Redux khi giải tán nhóm thành công
              dispatch(removeConversationById(String(groupId)));
              Alert.alert('Thành công', 'Nhóm đã bị giải tán', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('MainTabs'),
                },
              ]);
            } catch (err: any) {
              console.error('[GroupSettings] disbandGroup error:', err?.response?.data, err?.message);
              Alert.alert(
                'Lỗi',
                err?.response?.data?.message || err?.message || 'Không thể giải tán nhóm'
              );
            }
          },
        },
      ]
    );
  }, [groupId, navigation, dispatch]);

  // Spam filter options
  const spamFilterOptions = [
    { value: 0 as const, label: 'Tắt', description: 'Không lọc tin nhắn' },
    { value: 1 as const, label: 'Vừa', description: 'Lọc một số nội dung' },
    { value: 2 as const, label: 'Gắt gao', description: 'Lọc hầu hết nội dung' },
  ];

  // Allow links options
  const linkOptions = [
    { value: 'ALL' as const, label: 'Tất cả thành viên', description: 'Mọi người đều có thể gửi link' },
    { value: 'ADMINS_ONLY' as const, label: 'Chỉ quản trị viên', description: 'Chỉ admin được gửi link' },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Zalo-style header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            {Icons.back(IconSize.lg, colors.text.inverse)}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cài đặt nhóm</Text>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Text style={styles.saveBtnText}>Lưu</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        {/* Group Name */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin nhóm</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Tên nhóm</Text>
            <TextInput
              style={styles.textInput}
              value={groupName}
              onChangeText={setGroupName}
              placeholder="Nhập tên nhóm"
              placeholderTextColor={colors.text.placeholder}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Mô tả</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder="Nhập mô tả nhóm"
              placeholderTextColor={colors.text.placeholder}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Group Invite QR */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mã QR nhóm</Text>
          <View style={styles.qrInviteBox}>
            {inviteLoading ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : inviteInfo?.inviteLink ? (
              <>
                <View style={styles.qrBox}>
                  <QRCode value={inviteInfo.inviteLink} size={210} quietZone={8} />
                </View>
                <Text style={styles.inviteCode}>Mã mời: {inviteInfo.inviteCode}</Text>
                <Text style={styles.qrHint}>
                  Thành viên khác quét mã này để gửi yêu cầu hoặc tham gia nhóm.
                </Text>
              </>
            ) : (
              <TouchableOpacity style={styles.secondaryAction} onPress={loadSettings}>
                <Text style={styles.secondaryActionText}>Tải lại mã QR</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Quyền riêng tư</Text>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={handleToggleApproval}
          >
            <View style={styles.toggleLeft}>
              {Icons.shield(IconSize.lg)}
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>Duyệt vào nhóm</Text>
                <Text style={styles.toggleDesc}>
                  Yêu cầu admin phê duyệt trước khi tham gia
                </Text>
              </View>
            </View>
            <Switch
              value={approvalRequired}
              onValueChange={handleToggleApproval}
              trackColor={{ false: '#E3E3E3', true: '#8BC1FF' }}
              thumbColor={colors.text.inverse}
            />
          </TouchableOpacity>
        </View>

        {/* Link Settings */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Gửi link</Text>
          {linkOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.radioRow}
              onPress={() => setAllowSendLinks(option.value)}
            >
              <View style={styles.radioLeft}>
                <View
                  style={[
                    styles.radioCircle,
                    allowSendLinks === option.value && styles.radioCircleActive,
                  ]}
                >
                  {allowSendLinks === option.value && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View style={styles.radioText}>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                  <Text style={styles.radioDesc}>{option.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Spam Filter */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Lọc tin nhắn</Text>
          {spamFilterOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={styles.radioRow}
              onPress={() => setSpamFilterLevel(option.value)}
            >
              <View style={styles.radioLeft}>
                <View
                  style={[
                    styles.radioCircle,
                    spamFilterLevel === option.value && styles.radioCircleActive,
                  ]}
                >
                  {spamFilterLevel === option.value && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View style={styles.radioText}>
                  <Text style={styles.radioLabel}>{option.label}</Text>
                  <Text style={styles.radioDesc}>{option.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Member Management */}
        {(isOwner || isAdmin) && (
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => navigation.navigate('ManageMembers', { groupId })}
            >
              <View style={styles.menuItemLeft}>
                {Icons.people(IconSize.lg)}
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemLabel}>Quản lý thành viên</Text>
                  <Text style={styles.menuItemDesc}>{members.length} thành viên</Text>
                </View>
              </View>
              {Icons.chevronRight(IconSize.lg)}
            </TouchableOpacity>
          </View>
        )}

        {/* Pending Requests */}
        {approvalRequired && pendingRequests.length > 0 && (isOwner || isAdmin) && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Yêu cầu tham gia</Text>
            <Text style={styles.pendingCount}>{pendingRequests.length} yêu cầu chờ duyệt</Text>
            {pendingRequests.map((request) => {
              const requestId = String(request.userId || request.id || '');
              return (
                <View key={requestId} style={styles.requestRow}>
                  <View style={styles.requestInfo}>
                    {Icons.person(IconSize.md)}
                    <Text style={styles.requestName}>{request.displayName || request.username || 'Unknown'}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleRequest(requestId, 'APPROVE')}
                    >
                      <Text style={styles.approveBtnText}>Duyệt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleRequest(requestId, 'REJECT')}
                    >
                      <Text style={styles.rejectBtnText}>Từ chối</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Danger Zone */}
        <View style={[styles.sectionCard, styles.dangerCard]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>
            Vùng nguy hiểm
          </Text>

          {isOwner && (
            <TouchableOpacity
              style={styles.dangerRow}
              onPress={() => navigation.navigate('TransferOwner', { groupId, groupName })}
            >
              <View style={styles.dangerLeft}>
                {Icons.userPlus(IconSize.lg)}
                <Text style={styles.dangerLabel}>Chuyển quyền Trưởng nhóm</Text>
              </View>
              {Icons.chevronRight(IconSize.lg)}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.dangerRow} onPress={() => handleLeaveGroupConfirm()}>
            <View style={styles.dangerLeft}>
              {Icons.exitToApp(IconSize.lg)}
              <Text style={styles.dangerLabel}>Rời nhóm</Text>
            </View>
            {Icons.chevronRight(IconSize.lg)}
          </TouchableOpacity>

          {isOwner && (
            <TouchableOpacity style={styles.dangerRow} onPress={handleDisbandGroupConfirm}>
              <View style={styles.dangerLeft}>
                {Icons.deleteOutline(IconSize.lg)}
                <Text style={styles.dangerLabel}>Xóa nhóm</Text>
              </View>
              {Icons.chevronRight(IconSize.lg)}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    backgroundColor: ZALO_BLUE,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  backBtn: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  saveBtn: {
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: colors.background.primary,
    marginBottom: spacing.sm,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  inputRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  qrInviteBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  qrBox: {
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#FFFFFF',
    marginBottom: spacing.md,
  },
  inviteCode: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  qrHint: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  secondaryAction: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  toggleDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  radioRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  radioLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioText: {
    flex: 1,
  },
  radioLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  radioDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  menuItemDesc: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  dangerCard: {
    marginTop: spacing.md,
  },
  dangerTitle: {
    color: colors.status.error,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  dangerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dangerLabel: {
    ...typography.body,
    color: colors.status.error,
    fontWeight: '500',
  },
  // Member management styles
  memberCount: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  memberText: {
    flex: 1,
  },
  memberName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  memberRole: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
    backgroundColor: colors.background.secondary,
  },
  actionBtnText: {
    ...typography.caption,
    color: colors.primary,
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
  showMore: {
    ...typography.bodySmall,
    color: colors.primary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  // Pending requests styles
  pendingCount: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  requestName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.xs,
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
});

export default GroupSettingsScreen;
