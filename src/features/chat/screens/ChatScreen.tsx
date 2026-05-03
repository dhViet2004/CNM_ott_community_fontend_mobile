import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import { MessageListItem, AddMenuModal } from '@features/chat/components';
import { shallowEqual } from 'react-redux';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { setFriends } from '@store/slices/chatSlice';
import { setMyGroups } from '@store/slices/groupsSlice';
import { friendsApi, groupsApi } from '@api/endpoints';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'MainTabs'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const buildDmConversationId = (myId: string, otherId: string): string => {
  const sortedIds = [myId, otherId].sort();
  return `dm:${sortedIds.join(':')}`;
};

interface ChatConversation {
  id: string;
  type: 'single' | 'group';
  name: string;
  originalName?: string;
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

const EMPTY_ARRAY: any[] = [];

const AVATAR_LEFT_MARGIN = spacing.screenPadding;
const AVATAR_SIZE = spacing.iconSize.avatar;

const ChatScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const friends = useAppSelector((state) => state.chat.friends, shallowEqual);
  const onlineUsers = useAppSelector((state) => state.chat.onlineUsers, shallowEqual);
  const currentUserId = useAppSelector((state) => state.auth.user?.userId);
  const groups = useAppSelector((state) => state.groups.myGroups, shallowEqual);

  const dmConversations: ChatConversation[] = useMemo(() => friends.map((friend) => {
    const friendId = friend.friend_id || friend.userId || '';
    const myId = currentUserId || '';
    const sortedIds = [myId, friendId].sort();
    return {
      id: `dm:${sortedIds.join(':')}`,
      type: 'single' as const,
      name: friend.display_name || friend.friend_display_name || '',
      originalName: friend.friend_original_name || friend.display_name || '',
      avatar: friend.avatar_url || friend.friend_avatar_url || undefined,
      lastMessage: friend.status || '',
      time: friend.friends_since || '',
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      isOnline: !!onlineUsers[friendId],
      friendId,
    };
  }), [friends, onlineUsers, currentUserId]);

  const groupConversations: ChatConversation[] = useMemo(() => groups.map((group: any) => ({
    id: `group:${group.groupId}`,
    type: 'group' as const,
    name: group.groupName || 'Nhóm',
    originalName: group.groupName || 'Nhóm',
    avatar: group.groupAvatar || undefined,
    lastMessage: group.lastMessage?.content || 'Nhóm mới tạo',
    time: group.lastMessage?.createdAt || group.createdAt || '',
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isOnline: false,
    groupId: group.groupId,
  })), [groups]);

  // AI Bot conversation item
  const aiBotConversation: ChatConversation = {
    id: 'bot:ai',
    type: 'single',
    name: 'AI Bot',
    lastMessage: 'Trợ lý thông minh, trả lời nhanh cho bạn',
    time: '',
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    isOnline: true,
    friendId: 'bot:ai',
  };

  const allConversations = useMemo(
    () => [aiBotConversation, ...dmConversations, ...groupConversations],
    [aiBotConversation, dmConversations, groupConversations]
  );

  const loadFriends = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await friendsApi.getFriends().catch(() => []);
      dispatch(setFriends(list));

      list.forEach((f: any) => {
        if (f.pinnedMessages && Array.isArray(f.pinnedMessages)) {
          const friendId = f.friend_id || f.userId;
          const myId = currentUserId || '';
          const sortedIds = [myId, friendId].sort();
          const conversationId = `dm:${sortedIds.join(':')}`;
          dispatch({
            type: 'chat/setPinnedMessages',
            payload: { conversationId, pinnedMessages: f.pinnedMessages },
          });
        }
      });
    } catch (err) {
      console.error('Failed to load friends:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, currentUserId]);

  const loadGroups = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const groupsList = await groupsApi.getMyGroups(currentUserId);
      dispatch(setMyGroups(groupsList));

      groupsList.forEach((g: any) => {
        if (g.pinnedMessages && Array.isArray(g.pinnedMessages)) {
          dispatch({
            type: 'chat/setPinnedMessages',
            payload: { conversationId: `group:${g.groupId}`, pinnedMessages: g.pinnedMessages },
          });
        }
      });
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
      // Handle AI Bot conversation
      if (conv.id === 'bot:ai') {
        navigation.navigate('BotChat');
        return;
      }

      if (conv.type === 'single') {
        const friendId = conv.friendId;
        const myId = currentUserId || '';
        const sortedIds = [myId, friendId].sort();
        const conversationId = `dm:${sortedIds.join(':')}`;
        navigation.navigate('Chat', {
          conversationId,
          title: conv.name || 'Chat',
          originalName: conv.originalName,
          userId: friendId,
        });
      } else {
        const resolvedGroupId = String(conv.groupId ?? conv.id ?? '')
          .replace(/^group:/, '')
          .trim();

        if (!resolvedGroupId || resolvedGroupId === 'undefined' || resolvedGroupId === 'null') {
          Alert.alert('Lỗi', 'Không tìm thấy ID nhóm hợp lệ để mở đoạn chat');
          return;
        }

        navigation.navigate('GroupChat', {
          groupId: resolvedGroupId,
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

  const handleGroups = useCallback(() => {
    navigation.navigate('Groups');
  }, [navigation]);

  const handleQRScanner = useCallback(() => {
    Alert.alert('Thông báo', 'Tính năng quét mã QR đang được phát triển');
  }, []);

  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);

  const handleAddNew = useCallback(() => {
    setIsAddMenuVisible(true);
  }, []);

  // Zalo-style header: title row + search bar on the blue background
  const renderHeader = () => (
    <View style={[styles.zaloHeader, { paddingTop: insets.top + spacing.sm }]}>
      <StatusBar barStyle="light-content" backgroundColor="#008AF3" />

      {/* Row 1: Search bar + Action Icons */}
      <View style={styles.headerRow}>
        <View style={styles.zaloSearchBar}>
          <View style={styles.zaloSearchIcon}>
            {Icons.search(18, 'rgba(255,255,255,0.7)')}
          </View>
          <TextInput
            style={styles.zaloSearchInput}
            placeholder="Tìm kiếm"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.zaloClearBtn}
            >
              {Icons.close(16, 'rgba(255,255,255,0.7)')}
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleQRScanner}
            style={styles.headerActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {Icons.qrCode(22, '#FFFFFF')}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAddNew}
            style={styles.headerActionBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {Icons.add(26, '#FFFFFF')}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Zalo-style separator: light gray, left offset for avatar
  const separatorLeftMargin = AVATAR_LEFT_MARGIN + AVATAR_SIZE + spacing.md;
  const renderSeparator = () => (
    <View style={[styles.zaloSeparator, { marginLeft: separatorLeftMargin }]} />
  );

  const renderConversation = ({ item }: { item: ChatConversation }) => (
    <MessageListItem
      avatarUri={item.avatar}
      name={item.name || 'Người dùng'}
      lastMessage={item.lastMessage || 'Bắt đầu trò chuyện'}
      time={item.time}
      unreadCount={item.unreadCount}
      isOnline={item.isOnline}
      isPinned={item.isPinned}
      isMuted={item.isMuted}
      isGroup={item.type === 'group'}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => handleConversationLongPress(item)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.zaloEmpty}>
      <View style={styles.zaloEmptyIcon}>
        {Icons.chatbubbles(60, colors.text.tertiary)}
      </View>
      <Text style={styles.zaloEmptyText}>Chưa có cuộc trò chuyện nào</Text>
      <Text style={styles.zaloEmptySubtext}>Bắt đầu trò chuyện với bạn bè</Text>
    </View>
  );

  return (
    <View style={styles.zaloContainer}>
      {renderHeader()}

      <FlatList
        data={[...pinnedConversations, ...normalConversations, ...mutedConversations]}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.zaloLoading}>
              <Text style={styles.zaloLoadingText}>Đang tải...</Text>
            </View>
          ) : (
            renderEmpty()
          )
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.zaloListContent,
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
      <AddMenuModal
        visible={isAddMenuVisible}
        onClose={() => setIsAddMenuVisible(false)}
      />
    </View>
  );
};

const HEADER_BLUE = '#008AF3';

const styles = StyleSheet.create({
  zaloContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  /* ── Header ──────────────────────────────────────────────── */
  zaloHeader: {
    backgroundColor: HEADER_BLUE,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    gap: spacing.sm,
  },
  zaloTitle: {
    ...typography.h2,
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 28,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionBtn: {
    padding: spacing.xs,
  },

  /* ── Search Bar ─────────────────────────────────────────── */
  zaloSearchContainer: {
    marginTop: spacing.sm,
  },
  zaloSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 36,
  },
  zaloSearchIcon: {
    marginRight: spacing.sm,
  },
  zaloSearchInput: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text.inverse,
    paddingVertical: 0,
    fontSize: 15,
  },
  zaloClearBtn: {
    marginLeft: spacing.xs,
  },

  /* ── List Content ───────────────────────────────────────── */
  zaloListContent: {
    flexGrow: 1,
  },

  /* ── Separator ──────────────────────────────────────────── */
  zaloSeparator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginRight: spacing.screenPadding,
  },

  /* ── Empty / Loading ────────────────────────────────────── */
  zaloEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  zaloEmptyIcon: {
    marginBottom: spacing.lg,
    opacity: 0.35,
  },
  zaloEmptyText: {
    ...typography.subtitle,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  zaloEmptySubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  zaloLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  zaloLoadingText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
});

export default ChatScreen;
