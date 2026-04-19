import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import {
  setMyGroups,
  setLoading,
  setError,
} from '@store/slices/groupsSlice';
import { groupsApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';
import { Avatar } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'Groups'>;

const GroupsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const myGroups = useAppSelector((state) => state.groups.myGroups);
  const isLoading = useAppSelector((state) => state.groups.isLoading);
  const currentUserId = useAppSelector((state) => state.auth.user?.userId);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!currentUserId) return;
    dispatch(setLoading(true));
    try {
      const groups = await groupsApi.getMyGroups(currentUserId);
      dispatch(setMyGroups(groups));
    } catch (err: any) {
      dispatch(setError(err?.message || 'Không thể tải danh sách nhóm'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [currentUserId, dispatch]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadGroups();
    setIsRefreshing(false);
  };

  const filteredGroups = myGroups.filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGroupPress = useCallback(
    (group: (typeof myGroups)[0]) => {
      navigation.navigate('GroupChat', {
        groupId: group.groupId,
        title: group.name,
      });
    },
    [navigation]
  );

  const handleCreateGroup = useCallback(() => {
    navigation.navigate('CreateGroup');
  }, [navigation]);

  const handleJoinGroup = useCallback(() => {
    Alert.prompt(
      'Tham gia nhóm',
      'Nhập mã mời của nhóm',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tham gia',
          onPress: async (inviteCode?: string) => {
            if (!inviteCode?.trim()) return;
            try {
              await groupsApi.joinByCode(inviteCode.trim());
              Alert.alert('Thành công', 'Bạn đã tham gia nhóm!');
              loadGroups();
            } catch (err: any) {
              Alert.alert(
                'Lỗi',
                err?.response?.data?.message || 'Mã mời không hợp lệ'
              );
            }
          },
        },
      ],
      'plain-text'
    );
  }, [loadGroups]);

  const renderGroupItem = ({ item }: { item: (typeof myGroups)[0] }) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => handleGroupPress(item)}
      activeOpacity={0.7}
    >
      <Avatar
        name={item.name}
        uri={item.avatar_url || undefined}
        size="md"
      />
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{item.name}</Text>
        <Text style={styles.memberCount}>
          {item.member_count} thành viên
        </Text>
      </View>
      {item.is_private && <Text style={styles.privateIcon}>🔒</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Nhóm của tôi</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleJoinGroup} style={styles.headerIcon}>
              <Text style={styles.headerIconText}>↗</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreateGroup} style={styles.headerIcon}>
              <Text style={styles.headerIconText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm nhóm"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item.groupId}
        renderItem={renderGroupItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>Chưa tham gia nhóm nào</Text>
            <Text style={styles.emptySubtext}>
              Tạo nhóm mới hoặc tham gia qua mã mời
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleCreateGroup}
            >
              <Text style={styles.emptyButtonText}>Tạo nhóm</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.text.inverse}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  headerTitle: { ...typography.h2, color: colors.text.inverse },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: { fontSize: 20, color: colors.text.inverse },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 38,
    marginTop: spacing.sm,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.inverse,
    paddingVertical: 0,
  },
  clearIcon: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.listItemPadding,
  },
  groupInfo: { flex: 1, marginLeft: spacing.md },
  groupName: { ...typography.subtitle, color: colors.text.primary },
  memberCount: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  privateIcon: { fontSize: 16 },
  separator: {
    height: 0,
    backgroundColor: colors.border.light,
    marginLeft: spacing.screenPadding + spacing.iconSize.avatar + spacing.md,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: spacing.lg },
  emptyText: { ...typography.subtitle, color: colors.text.secondary },
  emptySubtext: { ...typography.caption, color: colors.text.tertiary, marginTop: spacing.xs, textAlign: 'center' },
  emptyButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  emptyButtonText: { ...typography.body, color: colors.text.inverse, fontWeight: '600' },
});

export default GroupsScreen;
