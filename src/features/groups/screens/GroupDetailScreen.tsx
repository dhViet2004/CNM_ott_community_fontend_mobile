import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import {
  setSelectedGroup,
  setGroupMembers,
} from '@store/slices/groupsSlice';
import { groupsApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';
import { Avatar } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'GroupDetail'>;

const GroupDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const selectedGroup = useAppSelector((state) => state.groups.selectedGroup);
  const members = useAppSelector(
    (state) => state.groups.groupMembers[groupId] || []
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadGroup = async () => {
      setLoading(true);
      try {
        const [group, membersData] = await Promise.all([
          groupsApi.getGroupById(groupId),
          groupsApi.getMembers(groupId),
        ]);
        dispatch(setSelectedGroup(group));
        dispatch(setGroupMembers({ groupId, members: membersData }));
      } catch (err) {
        console.error('Failed to load group:', err);
      } finally {
        setLoading(false);
      }
    };
    loadGroup();
  }, [groupId, dispatch]);

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
      {/* Header */}
      <View style={styles.header}>
        <Avatar
          name={selectedGroup?.name || 'G'}
          uri={selectedGroup?.avatar_url || undefined}
          size="xl"
        />
        <Text style={styles.groupName}>{selectedGroup?.name}</Text>
        {selectedGroup?.description && (
          <Text style={styles.groupDesc}>{selectedGroup.description}</Text>
        )}
        <Text style={styles.memberCount}>
          {selectedGroup?.member_count || members.length} thành viên
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleStartChat}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Nhắn tin nhóm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleShareInvite}>
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionText}>Mời thành viên</Text>
        </TouchableOpacity>
      </View>

      {/* Invite Code */}
      {selectedGroup?.invite_code && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mã mời</Text>
          <View style={styles.inviteCodeBox}>
            <Text style={styles.inviteCode}>{selectedGroup.invite_code}</Text>
            <TouchableOpacity onPress={handleShareInvite}>
              <Text style={styles.shareBtn}>Chia sẻ</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Members */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danh sách thành viên</Text>
        {members.map((member) => (
          <TouchableOpacity
            key={member.userId}
            style={styles.memberItem}
            onPress={() =>
              navigation.navigate('UserProfile', { userId: member.userId })
            }
          >
            <Avatar
              name={member.display_name}
              uri={member.avatar_url || undefined}
              size="sm"
            />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.display_name}</Text>
              <Text style={styles.memberUsername}>@{member.username}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary },
  header: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: colors.primary },
  groupName: { ...typography.h2, color: colors.text.inverse, marginTop: spacing.md },
  groupDesc: { ...typography.body, color: 'rgba(255,255,255,0.8)', marginTop: spacing.xs, textAlign: 'center', paddingHorizontal: spacing.xl },
  memberCount: { ...typography.caption, color: 'rgba(255,255,255,0.7)', marginTop: spacing.sm },
  actions: { flexDirection: 'row', padding: spacing.md, gap: spacing.md },
  actionButton: { flex: 1, alignItems: 'center', backgroundColor: colors.background.secondary, padding: spacing.md, borderRadius: spacing.borderRadius.md },
  actionIcon: { fontSize: 24, marginBottom: spacing.xs },
  actionText: { ...typography.caption, color: colors.text.primary, fontWeight: '500' },
  section: { padding: spacing.md },
  sectionTitle: { ...typography.subtitle, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.md },
  inviteCodeBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.background.secondary, padding: spacing.md, borderRadius: spacing.borderRadius.md },
  inviteCode: { ...typography.h3, color: colors.primary, letterSpacing: 2 },
  shareBtn: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.border.light },
  memberInfo: { marginLeft: spacing.md, flex: 1 },
  memberName: { ...typography.subtitle, color: colors.text.primary },
  memberUsername: { ...typography.caption, color: colors.text.tertiary },
});

export default GroupDetailScreen;
