import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { Icons, IconSize } from '@components/common';
import { styles } from './styles';

interface PendingRequest {
  userId: string;
  displayName?: string;
  username?: string;
  avatarUrl?: string | null;
  status: string;
  createdAt?: string;
}

interface MemberSectionProps {
  isAdmin: boolean;
  isOwner: boolean;
  memberCount: number;
  pendingCount: number;
  approvalRequired: boolean;
  inviteCode?: string;
  groupLink: string;
  onViewMembers: () => void;
  onReviewPending: () => void;
  onOpenGroupLink: () => void;
  onOpenSettings: () => void;
  onToggleApprovalRequired: (value: boolean) => void;
}

export const MemberSection: React.FC<MemberSectionProps> = ({
  isAdmin,
  isOwner,
  memberCount,
  pendingCount,
  approvalRequired,
  inviteCode,
  groupLink,
  onViewMembers,
  onReviewPending,
  onOpenGroupLink,
  onOpenSettings,
  onToggleApprovalRequired,
}) => {
  return (
    <>
      {/* Section: Member Management - only for Admin */}
      {isAdmin && (
        <View style={styles.sectionCard}>
          {/* Group Settings - only for Owner */}
          {isOwner && (
            <TouchableOpacity
              style={styles.rowItem}
              onPress={onOpenSettings}
            >
              <View style={styles.rowLeft}>
                {Icons.settingsOutline(IconSize.xl)}
                <Text style={styles.rowTitle}>Cài đặt nhóm</Text>
              </View>
              {Icons.chevronRight(IconSize.lg)}
            </TouchableOpacity>
          )}

          {/* View Members */}
          <TouchableOpacity style={styles.rowItem} onPress={onViewMembers}>
            <View style={styles.rowLeft}>
              {Icons.userGroup(IconSize.xl)}
              <Text style={styles.rowTitle}>Xem thành viên ({memberCount})</Text>
            </View>
            {Icons.chevronRight(IconSize.lg)}
          </TouchableOpacity>

          {/* Review Pending Requests - only for Admin */}
          <TouchableOpacity style={styles.rowItem} onPress={onReviewPending}>
            <View style={styles.rowLeft}>
              {Icons.userCheck(IconSize.xl)}
              <Text style={styles.rowTitle}>Phê duyệt thành viên</Text>
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
            {Icons.chevronRight(IconSize.lg)}
          </TouchableOpacity>

          {/* Share Link */}
          <TouchableOpacity style={styles.rowItem} onPress={onOpenGroupLink}>
            <View style={styles.rowLeft}>
              {Icons.link(IconSize.xl)}
              <View>
                <Text style={styles.rowTitle}>Link nhóm</Text>
                {inviteCode && (
                  <Text style={styles.rowSubTitle}>{groupLink}</Text>
                )}
              </View>
            </View>
            {Icons.chevronRight(IconSize.lg)}
          </TouchableOpacity>
        </View>
      )}

      {/* Section: Settings - only for non-admin members */}
      {!isAdmin && (
        <View style={styles.sectionCard}>
          {/* View Members - visible to all */}
          <TouchableOpacity style={styles.rowItem} onPress={onViewMembers}>
            <View style={styles.rowLeft}>
              {Icons.userGroup(IconSize.xl)}
              <Text style={styles.rowTitle}>Xem thành viên ({memberCount})</Text>
            </View>
            {Icons.chevronRight(IconSize.lg)}
          </TouchableOpacity>

          {/* Share Link - visible to all */}
          <TouchableOpacity style={styles.rowItem} onPress={onOpenGroupLink}>
            <View style={styles.rowLeft}>
              {Icons.link(IconSize.xl)}
              <View>
                <Text style={styles.rowTitle}>Link nhóm</Text>
                {inviteCode && (
                  <Text style={styles.rowSubTitle}>{groupLink}</Text>
                )}
              </View>
            </View>
            {Icons.chevronRight(IconSize.lg)}
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};
