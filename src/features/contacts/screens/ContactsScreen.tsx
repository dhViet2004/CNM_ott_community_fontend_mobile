import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setFriends } from '@store/slices/chatSlice';
import { setContacts, setPendingRequests as setRawPendingRequests, setLoading as setContactsLoading } from '@store/slices/contactSlice';
import { friendsApi, userApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';
import { Avatar } from '@components/common';
import type { MainTabScreenProps } from '@navigation/types';

type Props = MainTabScreenProps<'ContactsTab'>;

const ContactsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const friends = useAppSelector((state) => state.chat.friends);
  const pendingRequests = useAppSelector((state) => state.contacts.pendingRequests);
  const isLoading = useAppSelector((state) => state.contacts.isLoading);
  const onlineUsers = useAppSelector((state) => state.chat.onlineUsers);

  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  // ─── Load Data ────────────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    dispatch(setContactsLoading(true));
    try {
      const [friendsList, pendingList, usersList] = await Promise.all([
        friendsApi.getFriends().catch(() => []),
        friendsApi.getPendingRequests().catch(() => []),
        userApi.searchUsers('').catch(() => []),
      ]);

      dispatch(setFriends(friendsList));
      dispatch(setRawPendingRequests(pendingList as any));
      setAllUsers(usersList);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      dispatch(setContactsLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadContacts();
    setIsRefreshing(false);
  };

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filteredFriends = friends.filter(
    (f) =>
      (f.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineFriends = filteredFriends.filter(
    (f) => !!onlineUsers[f.friend_id || f.userId]
  );
  const offlineFriends = filteredFriends.filter(
    (f) => !onlineUsers[f.friend_id || f.userId]
  );

  // ─── Navigate ──────────────────────────────────────────────────────────────
  const handleFriendPress = useCallback(
    (friend: (typeof friends)[0]) => {
      // Backend uses dm:{smallerId}:{largerId} for DM conversation IDs
      const myId = currentUserId || '';
      const otherId = friend.userId;
      const sortedIds = [myId, otherId].sort();
      const conversationId = `dm:${sortedIds.join(':')}`;
      navigation.navigate('Chat', {
        conversationId,
        title: friend.display_name,
        userId: friend.userId,
      });
    },
    [navigation, currentUserId]
  );

  const handleUserPress = useCallback(
    (user: any) => {
      navigation.navigate('UserProfile', { userId: user.userId });
    },
    [navigation]
  );

  const handlePendingPress = useCallback(
    (req: (typeof pendingRequests)[0]) => {
      navigation.navigate('UserProfile', { userId: req.userId ?? '' });
    },
    [navigation]
  );

  const handleAddFriend = useCallback(() => {
    navigation.navigate('ContactsList');
  }, [navigation]);

  // ─── Render ────────────────────────────────────────────────────────────────
  const renderFriendItem = ({ item }: { item: (typeof friends)[0] }) => {
    const friendId = item.friend_id || item.userId || '';
    const isOnline = !!onlineUsers[friendId];
    return (
      <TouchableOpacity
        style={styles.contactItem}
        onPress={() => handleFriendPress(item)}
        activeOpacity={0.7}
      >
        <Avatar
          name={item.display_name || ''}
          uri={item.avatar_url || undefined}
          size="md"
          showOnlineIndicator
          online={isOnline}
        />
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{item.display_name}</Text>
          {item.username && (
            <Text style={styles.contactUsername}>@{item.username}</Text>
          )}
        </View>
        {isOnline && <View style={styles.onlineDot} />}
      </TouchableOpacity>
    );
  };

  const renderPendingItem = ({ item }: { item: (typeof pendingRequests)[0] }) => (
    <TouchableOpacity
      style={styles.pendingItem}
      onPress={() => handlePendingPress(item)}
      activeOpacity={0.7}
    >
      <Avatar name={item.display_name} uri={item.avatar_url || undefined} size="sm" />
      <View style={styles.pendingInfo}>
        <Text style={styles.pendingName}>{item.display_name}</Text>
        <Text style={styles.pendingLabel}>Lời mời kết bạn</Text>
      </View>
    </TouchableOpacity>
  );

  const renderUserItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.contactItem}
      onPress={() => handleUserPress(item)}
      activeOpacity={0.7}
    >
      <Avatar name={item.display_name || item.username} uri={item.avatar_url || undefined} size="md" />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.display_name || item.username}</Text>
        {item.username && <Text style={styles.contactUsername}>@{item.username}</Text>}
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      {pendingRequests.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Lời mời kết bạn ({pendingRequests.length})
            </Text>
          </View>
          <FlatList
            data={pendingRequests}
            keyExtractor={(item) => `pending_${item.userId}`}
            renderItem={renderPendingItem}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pendingList}
          />
        </>
      )}

      {searchQuery.length > 0 && allUsers.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Người dùng khác</Text>
          </View>
          {allUsers
            .filter(
              (u) =>
                !friends.find((f) => f.userId === u.userId) &&
                (u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  u.username?.toLowerCase().includes(searchQuery.toLowerCase()))
            )
            .map((user) => (
              <View key={user.userId}>{renderUserItem({ item: user })}</View>
            ))}
        </>
      )}

      {onlineFriends.length > 0 && !searchQuery && (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Đang hoạt động ({onlineFriends.length})
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Danh bạ</Text>
          <TouchableOpacity onPress={handleAddFriend} style={styles.headerIcon}>
            <Text style={styles.headerIconText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm"
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
        data={searchQuery.length === 0 ? [...onlineFriends, ...offlineFriends] : filteredFriends}
        keyExtractor={(item) => item.userId}
        renderItem={renderFriendItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Không tìm thấy người dùng' : 'Chưa có bạn bè nào'}
            </Text>
            {!searchQuery && (
              <Text style={styles.emptySubtext}>
                Thêm bạn bè để bắt đầu trò chuyện
              </Text>
            )}
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.inverse,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 22,
    color: colors.text.inverse,
    fontWeight: '300',
  },
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
  sectionHeader: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  pendingList: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginRight: spacing.sm,
    width: 160,
  },
  pendingInfo: { marginLeft: spacing.sm, flex: 1 },
  pendingName: { ...typography.bodySmall, color: colors.text.primary, fontWeight: '600' },
  pendingLabel: { ...typography.caption, color: colors.primary, marginTop: 2 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.listItemPadding,
  },
  contactInfo: { flex: 1, marginLeft: spacing.md },
  contactName: { ...typography.subtitle, color: colors.text.primary },
  contactUsername: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.badge.online,
  },
  separator: {
    height: 0,
    backgroundColor: colors.border.light,
    marginLeft: spacing.screenPadding + spacing.iconSize.avatar + spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 64, marginBottom: spacing.lg },
  emptyText: { ...typography.subtitle, color: colors.text.secondary },
  emptySubtext: { ...typography.bodySmall, color: colors.text.tertiary, marginTop: spacing.xs },
});

export default ContactsScreen;
