import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Feather } from '@expo/vector-icons';

export interface ProfileUser {
  id: string;
  fullName: string;
  avatarUrl?: string;
  coverUrl?: string;
  phoneNumber?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  friendStatus?: 'none' | 'friends' | 'pending_sent' | 'pending_received';
  totalFriends?: number;
  totalPhotos?: number;
  totalPosts?: number;
}

interface UserInfoProps {
  user: ProfileUser;
  isMyProfile: boolean;
  friendStatus: ProfileUser['friendStatus'];
  friendshipId?: string;
  onSendMessage?: () => void;
  onSendFriendRequest?: () => void;
  onCancelRequest?: (friendshipId: string) => void;
  onAcceptRequest?: (friendshipId: string) => void;
  onUnfriend?: (friendshipId: string) => void;
  onEditProfile?: () => void;
  onUpdateStatus?: (status: string) => void;
}

const UserInfo: React.FC<UserInfoProps> = ({
  user,
  isMyProfile,
  friendStatus,
  friendshipId,
  onSendMessage,
  onSendFriendRequest,
  onCancelRequest,
  onAcceptRequest,
  onUnfriend,
  onEditProfile,
  onUpdateStatus,
}) => {
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusText, setStatusText] = useState(user.bio || '');

  const handleSaveStatus = () => {
    if (statusText.trim()) {
      onUpdateStatus?.(statusText.trim());
    }
    setIsEditingStatus(false);
  };

  const handleUnfriend = () => {
    if (!friendshipId) return;
    Alert.alert(
      'Hủy kết bạn',
      `Bạn có chắc muốn hủy kết bạn với ${user.fullName}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Hủy kết bạn', style: 'destructive', onPress: () => onUnfriend?.(friendshipId) },
      ]
    );
  };

  const getFriendButtonContent = () => {
    switch (friendStatus) {
      case 'friends':
        return (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.messageButton]}
              onPress={onSendMessage}
              activeOpacity={0.75}
            >
              <Feather name="message-circle" size={18} color={colors.text.inverse} style={{ marginRight: 4 }} />
              <Text style={styles.messageButtonText}>Nhắn tin</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.outlineButton]}
              onPress={handleUnfriend}
              activeOpacity={0.75}
            >
              <Text style={styles.outlineButtonText}>Bạn bè</Text>
            </TouchableOpacity>
          </>
        );
      case 'pending_sent':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.outlineButton]}
            onPress={() => onCancelRequest?.(friendshipId ?? '')}
            activeOpacity={0.75}
          >
            <Text style={styles.outlineButtonText}>Hủy lời mời</Text>
          </TouchableOpacity>
        );
      case 'pending_received':
        return (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => onAcceptRequest?.(friendshipId ?? '')}
              activeOpacity={0.75}
            >
              <Text style={styles.primaryButtonText}>Chấp nhận</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.outlineButton]}
              onPress={() => onCancelRequest?.(friendshipId ?? '')}
              activeOpacity={0.75}
            >
              <Text style={styles.outlineButtonText}>Từ chối</Text>
            </TouchableOpacity>
          </>
        );
      default:
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.addFriendButton]}
            onPress={onSendFriendRequest}
            activeOpacity={0.75}
          >
            <Feather name="user-plus" size={18} color={colors.text.inverse} style={{ marginRight: 4 }} />
            <Text style={styles.addFriendText}>Kết bạn</Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Tên người dùng */}
      <Text style={styles.userName}>{user.fullName}</Text>

      {/* Tiểu sử / Trạng thái */}
      <View style={styles.bioSection}>
        {isEditingStatus ? (
          <View style={styles.statusEditContainer}>
            <TextInput
              style={styles.statusInput}
              placeholder="Cập nhật trạng thái..."
              placeholderTextColor={colors.text.placeholder}
              value={statusText}
              onChangeText={setStatusText}
              autoFocus
              multiline
              maxLength={120}
            />
            <View style={styles.statusActions}>
              <TouchableOpacity
                onPress={() => setIsEditingStatus(false)}
                style={styles.statusCancelBtn}
              >
                <Text style={styles.statusCancelText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveStatus}
                style={styles.statusSaveBtn}
              >
                <Text style={styles.statusSaveText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={isMyProfile ? () => setIsEditingStatus(true) : undefined}
            activeOpacity={isMyProfile ? 0.7 : 1}
          >
            <Text style={styles.bioText}>
              {user.bio || (isMyProfile ? 'Nhấn để cập nhật trạng thái' : '')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Thống kê (bạn bè, ảnh, bài viết) */}
      <View style={styles.statsRow}>
        <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
          <Text style={styles.statNumber}>{user.totalFriends || 0}</Text>
          <Text style={styles.statLabel}>Bạn bè</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
          <Text style={styles.statNumber}>{user.totalPhotos || 0}</Text>
          <Text style={styles.statLabel}>Ảnh</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
          <Text style={styles.statNumber}>{user.totalPosts || 0}</Text>
          <Text style={styles.statLabel}>Bài viết</Text>
        </TouchableOpacity>
      </View>

      {/* Nút hành động */}
      <View style={styles.actionsSection}>
        {isMyProfile ? (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryButton]}
              onPress={onEditProfile}
              activeOpacity={0.75}
            >
              <Feather name="edit-2" size={16} color={colors.text.inverse} style={{ marginRight: 4 }} />
              <Text style={styles.primaryButtonText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.outlineButton]}
              onPress={() => setIsEditingStatus(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.outlineButtonText}>Cập nhật trạng thái</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.friendActions}>{getFriendButtonContent()}</View>
        )}
      </View>

      {/* Thông tin bổ sung */}
      <View style={styles.infoSection}>
        {user.phoneNumber && (
          <View style={styles.infoRow}>
            <Feather name="smartphone" size={18} color={colors.text.tertiary} style={styles.infoIcon} />
            <Text style={styles.infoText}>{user.phoneNumber}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.lg,
  },
  userName: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bioSection: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  bioText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  statusEditContainer: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  statusInput: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  statusCancelBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  statusCancelText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  statusSaveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.md,
  },
  statusSaveText: {
    ...typography.bodySmall,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.border.light,
    marginHorizontal: -spacing.screenPadding,
    paddingHorizontal: spacing.screenPadding,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
  actionsSection: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  friendActions: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    gap: spacing.xs,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    ...typography.bodySmall,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  outlineButton: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  outlineButtonText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  messageButton: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  messageButtonText: {
    ...typography.bodySmall,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  addFriendButton: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  addFriendText: {
    ...typography.bodySmall,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  infoSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoIcon: {
    marginRight: spacing.md,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
});

export default UserInfo;
