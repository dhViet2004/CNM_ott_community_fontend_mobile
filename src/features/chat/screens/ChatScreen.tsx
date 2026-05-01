import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize, SearchBar } from '@components/common';
import { MessageListItem } from '@features/chat/components';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setFriends } from '@store/slices/chatSlice';
import { setMyGroups } from '@store/slices/groupsSlice';
import { friendsApi, groupsApi } from '@api/endpoints';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'MainTabs'>;

interface ChatConversation {
  id: string;
  type: 'single' | 'group';
  name: string;
  avatar?: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  isOnline?: boolean;
  friendId?: string;
  groupId?: string;
}

const ChatScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const friends = useAppSelector((state) => state.chat.friends);
  const onlineUsers = useAppSelector((state) => state.chat.onlineUsers);
  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
  
  // Get groups from groupsSlice
  const groups = useAppSelector((state) => state.groups.myGroups);

  // Build DM conversations from friends list
  const dmConversations: ChatConversation[] = friends.map((friend) => {
    const friendId = friend.friend_id || friend.userId || '';
    const myId = currentUserId || '';
    const sortedIds = [myId, friendId].sort();
    return {
      id: `dm:${sortedIds.join(':')}`,
      type: 'single' as const,
      name: friend.display_name || friend.friend_display_name || '',
      avatar: friend.avatar_url || friend.friend_avatar_url || undefined,
      lastMessage: friend.status || '',
      time: friend.friends_since || '',
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isOnline: !!onlineUsers[friendId],
      friendId,
    };
  });

  // Build group conversations from groups list
  const groupConversations: ChatConversation[] = groups.map((group) => ({
    id: `group:${group.groupId}`,
    type: 'group' as const,
    name: group.name || '',
    avatar: group.avatar_url || undefined,
    lastMessage: group.description || `${group.member_count || 0} thành viên`,
    time: group.created_at || '',
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    groupId: group.groupId,
  }));

  // Combine DM and group conversations
  const allConversations = [...dmConversations, ...groupConversations];

  const loadFriends = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await friendsApi.getFriends().catch(() => []);
      dispatch(setFriends(list));
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  const loadGroups = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const groupsList = await groupsApi.getMyGroups(currentUserId);
      dispatch(setMyGroups(groupsList));
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  }, [currentUserId, dispatch]);

  useEffect(() => {
    loadFriends();
    loadGroups();
  }, [loadFriends, loadGroups]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadFriends(), loadGroups()]);
    setIsRefreshing(false);
  };

  const filteredConversations = allConversations.filter(
    (conv) =>
      conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const normalConversations = filteredConversations.filter(
    (c) => !c.isPinned && !c.isMuted
  );
  const mutedConversations = filteredConversations.filter((c) => c.isMuted);

  const handleConversationPress = useCallback(
    (conv: ChatConversation) => {
      if (conv.type === 'single') {
        // DM conversation
        const friendId = conv.friendId;
        const myId = currentUserId || '';
        const sortedIds = [myId, friendId].sort();
        const conversationId = `dm:${sortedIds.join(':')}`;
        navigation.navigate('Chat', {
          conversationId,
          title: conv.name || 'Chat',
        });
      } else {
        // Group conversation
        navigation.navigate('GroupChat', {
          groupId: conv.groupId || conv.id.replace('group:', ''),
          title: conv.name || 'Nhóm',
        });
      }
    },
    [navigation, currentUserId]
  );

  const handleConversationLongPress = useCallback((conv: ChatConversation) => {
    const title = conv.type === 'group' ? 'Tùy chọn nhóm' : 'Tùy chọn cuộc trò chuyện';
    Alert.alert(
      conv.name || title,
      conv.type === 'group' ? 'Chọn thao tác với nhóm' : 'Chọn thao tác với cuộc trò chuyện',
      [
        { text: 'Ghim', onPress: () => {} },
        { text: 'Tắt thông báo', onPress: () => {} },
        { text: conv.type === 'group' ? 'Rời nhóm' : 'Xóa', onPress: () => {}, style: 'destructive' },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  }, []);

  const handleAddFriend = useCallback(() => {
    navigation.navigate('ContactsList');
  }, [navigation]);

  const handleGroups = useCallback(() => {
    navigation.navigate('Groups');
  }, [navigation]);

  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Tin nhắn</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleGroups}
            style={styles.headerIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.headerIconContainer}>
              {Icons.people(IconSize.lg)}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAddFriend}
            style={styles.headerIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={styles.headerIconContainer}>
              {Icons.add(IconSize.lg)}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconContainer}>
            {Icons.search(IconSize.sm)}
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm"
            placeholderTextColor={colors.text.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.clearIconContainer}>
                {Icons.close(IconSize.sm)}
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderConversation = ({ item }: { item: ChatConversation }) => (
    <MessageListItem
      avatarUri={item.avatar}
      name={item.name || 'Người dùng'}
      lastMessage={item.lastMessage || 'Bắt đầu trò chuyện'}
      time={item.time}
      unreadCount={item.unreadCount}
      isOnline={item.isOnline}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => handleConversationLongPress(item)}
      isGroup={item.type === 'group'}
    />
  );

  const renderSeparator = () => <View style={styles.separator} />;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        {Icons.chatbubbles(64)}
      </View>
      <Text style={styles.emptyText}>Chưa có cuộc trò chuyện nào</Text>
      <Text style={styles.emptySubtext}>Bắt đầu trò chuyện với bạn bè</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={[...pinnedConversations, ...normalConversations, ...mutedConversations]}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Đang tải...</Text>
            </View>
          ) : (
            renderEmpty()
          )
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 60 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
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
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  headerIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 22,
    color: colors.text.inverse,
    fontWeight: '300',
    lineHeight: 24,
  },
  searchBarContainer: {
    marginTop: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 38,
  },
  searchIconContainer: {
    marginRight: spacing.sm,
    opacity: 0.7,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.inverse,
    paddingVertical: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  listContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.xs,
  },
  sectionHeaderText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
  },
  separator: {
    height: 0,
    backgroundColor: colors.border.light,
    marginLeft: spacing.screenPadding + spacing.iconSize.avatar + spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.4,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.subtitle,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
});

export default ChatScreen;