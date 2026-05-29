import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  SectionList,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setFriends } from '@store/slices/chatSlice';
import { setPendingRequests as setRawPendingRequests, setLoading as setContactsLoading } from '@store/slices/contactSlice';
import { setLoading as setGroupsLoading } from '@store/slices/groupsSlice';
import { fetchMyGroupsAsync } from '@store/slices/groupsSlice';
import { friendsApi, userApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';
import { Avatar, Icons, IconSize } from '@components/common';
import type { MainTabScreenProps } from '@navigation/types';

type Props = MainTabScreenProps<'ContactsTab'>;

// ─── Types ────────────────────────────────────────────────────────────────────
type TabType = 'friends' | 'groups' | 'oa';
type FilterType = 'all' | 'recent';

type Friend = {
  userId: string;
  friendshipId?: string;
  friend_id?: string;
  display_name: string;
  username?: string;
  avatar_url?: string | null;
  friends_since?: string;
  friend_original_name?: string;
};

type PendingRequest = {
  userId: string;
  display_name: string;
  avatar_url?: string | null;
};

type Group = {
  groupId: string;
  name: string;
  description?: string;
  avatar_url?: string | null;
  member_count?: number;
  is_private?: boolean;
};

type OA = {
  oaId: string;
  name: string;
  avatar_url?: string | null;
  description?: string;
};

interface FriendSection {
  title: string;
  data: Friend[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');
const FRIEND_MODAL_WIDTH = Math.min(Dimensions.get('window').width - 48, 360);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getSectionLetter = (name: string): string => {
  const first = (name.trim()[0] || '').toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  return '#';
};

const groupFriendsByLetter = (friends: Friend[]): FriendSection[] => {
  const grouped: Record<string, Friend[]> = {};
  friends.forEach((f) => {
    const letter = getSectionLetter(f.display_name);
    if (!grouped[letter]) grouped[letter] = [];
    grouped[letter].push(f);
  });
  return ALPHABET
    .filter((l) => grouped[l]?.length > 0)
    .map((l) => ({ title: l, data: grouped[l] }));
};

const buildDmConversationId = (myId: string, otherId: string): string => {
  const sortedIds = [myId, otherId].sort();
  return `dm:${sortedIds.join(':')}`;
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// Dữ liệu OA giả lập – thay bằng API thực tế khi có backend
const MOCK_OA_LIST: OA[] = [
  { oaId: 'oa_1', name: 'Zalo Official', avatar_url: null, description: 'Ứng dụng Zalo' },
  { oaId: 'oa_2', name: 'Zalo PC', avatar_url: null, description: 'Zalo trên máy tính' },
  { oaId: 'oa_3', name: 'Zalo Me', avatar_url: null, description: 'Trang cá nhân Zalo' },
];

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ContactsHeader
// Thanh header màu xanh Zalo: icon thêm bạn + search bar giả lập
// ═══════════════════════════════════════════════════════════════════════════
interface ContactsHeaderProps {
  insets: number;
  onAddFriend: () => void;
}

const ContactsHeader: React.FC<ContactsHeaderProps> = ({ insets, onAddFriend }) => (
  <View style={[styles.zaloHeader, { paddingTop: insets + spacing.sm }]}>
    <View style={styles.headerTopRow}>
      <Text style={styles.headerPlaceholder}>Danh bạ</Text>
      <TouchableOpacity
        style={styles.headerIconBtn}
        onPress={onAddFriend}
        activeOpacity={0.7}
      >
        {Icons.userPlus(IconSize.lg, colors.text.inverse)}
      </TouchableOpacity>
    </View>

    <TouchableOpacity style={styles.fakeSearchBar} activeOpacity={0.8}>
      <View style={styles.searchLeft}>
        {Icons.search(IconSize.sm, 'rgba(255,255,255,0.7)')}
        <Text style={styles.searchPlaceholder}>Tìm kiếm</Text>
      </View>
    </TouchableOpacity>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ContactsTabs
// Tab navigation: Bạn bè / Nhóm / OA với underline active
// ═══════════════════════════════════════════════════════════════════════════
interface ContactsTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const ContactsTabs: React.FC<ContactsTabsProps> = ({ activeTab, onTabChange }) => (
  <View style={styles.tabsRow}>
    {(['friends', 'groups', 'oa'] as TabType[]).map((tab) => (
      <TouchableOpacity
        key={tab}
        style={styles.tab}
        onPress={() => onTabChange(tab)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
          {tab === 'friends' ? 'Bạn bè' : tab === 'groups' ? 'Nhóm' : 'OA'}
        </Text>
        {activeTab === tab && <View style={styles.tabUnderline} />}
      </TouchableOpacity>
    ))}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: AlphabetSidebar
// Thanh chữ cái A-Z cố định bên phải để scroll nhanh
// ═══════════════════════════════════════════════════════════════════════════
interface AlphabetSidebarProps {
  sections: FriendSection[];
  sectionIndexMap: Record<string, number>;
  sectionListRef: React.RefObject<any>;
}

const AlphabetSidebar: React.FC<AlphabetSidebarProps> = ({
  sections,
  sectionIndexMap,
  sectionListRef,
}) => {
  const availableLetters = sections.map((s) => s.title);

  const handlePress = (letter: string) => {
    const idx = sectionIndexMap[letter];
    if (idx !== undefined) {
      sectionListRef.current?.scrollToLocation({
        sectionIndex: idx,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  };

  return (
    <View style={styles.alphabetSidebar}>
      {ALPHABET.map((letter) => {
        const isAvailable = availableLetters.includes(letter);
        return (
          <TouchableOpacity
            key={letter}
            style={styles.alphabetLetter}
            onPress={() => handlePress(letter)}
            disabled={!isAvailable}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.alphabetLetterText,
                !isAvailable && styles.alphabetLetterDisabled,
              ]}
            >
              {letter}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: FriendItem
// Mỗi dòng bạn bè: avatar + tên + icon gọi thoại/video
// ═══════════════════════════════════════════════════════════════════════════
interface FriendItemProps {
  friend: Friend;
  isOnline: boolean;
  onPress: (f: Friend) => void;
  onLongPress: (f: Friend) => void;
}

const FriendItem: React.FC<FriendItemProps> = ({ friend, isOnline, onPress, onLongPress }) => (
  <TouchableOpacity
    style={styles.friendItem}
    onPress={() => onPress(friend)}
    onLongPress={() => onLongPress(friend)}
    delayLongPress={350}
    activeOpacity={0.7}
  >
    <Avatar
      name={friend.display_name || ''}
      uri={friend.avatar_url || undefined}
      size="md"
      showOnlineIndicator
      online={isOnline}
    />
    <Text style={styles.friendName} numberOfLines={1}>
      {friend.display_name}
    </Text>
    <View style={styles.actionIcons}>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
        {Icons.call(IconSize.md, colors.primary)}
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionBtn} activeOpacity={0.6}>
        {Icons.videocam(IconSize.md, colors.primary)}
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
);

interface FriendActionModalProps {
  friend: Friend | null;
  visible: boolean;
  isUnfriending: boolean;
  onClose: () => void;
  onViewProfile: (friend: Friend) => void;
  onMessage: (friend: Friend) => void;
  onUnfriend: (friend: Friend) => void;
}

const FriendActionModal: React.FC<FriendActionModalProps> = ({
  friend,
  visible,
  isUnfriending,
  onClose,
  onViewProfile,
  onMessage,
  onUnfriend,
}) => {
  if (!friend) return null;

  const displayName = friend.friend_original_name || friend.display_name || friend.username || 'Người dùng';
  const username = friend.username || friend.display_name || displayName;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.friendModalCard}>
          <Avatar
            name={displayName}
            uri={friend.avatar_url || undefined}
            size="xl"
          />
          <Text style={styles.friendModalName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.friendModalSubtitle} numberOfLines={1}>
            Tên Zalo: {username}
          </Text>

          <View style={styles.friendModalQuickActions}>
            <TouchableOpacity
              style={styles.friendModalQuickAction}
              activeOpacity={0.75}
              onPress={() => onViewProfile(friend)}
            >
              {Icons.person(IconSize.xl, colors.primary)}
              <Text style={styles.friendModalQuickActionText}>Xem trang cá nhân</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.friendModalQuickAction} activeOpacity={0.75}>
              {Icons.userX(IconSize.xl, colors.primary)}
              <Text style={styles.friendModalQuickActionText}>Quản lý chặn</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.friendModalInfoRow}>
            {Icons.person(IconSize.md, colors.text.tertiary)}
            <Text style={styles.friendModalInfoText}>Đã kết bạn qua số điện thoại</Text>
          </View>
          <View style={styles.friendModalDivider} />
          <View style={styles.friendModalInfoRow}>
            {Icons.people(IconSize.md, colors.text.tertiary)}
            <Text style={styles.friendModalInfoText}>Xem nhóm chung</Text>
            {Icons.chevronRight(IconSize.md, colors.text.tertiary)}
          </View>
          <View style={styles.friendModalDivider} />
          <View style={styles.friendModalInfoRow}>
            {Icons.time(IconSize.md, colors.text.tertiary)}
            <Text style={styles.friendModalInfoText}>Xem nhật ký chung</Text>
            {Icons.chevronRight(IconSize.md, colors.text.tertiary)}
          </View>
          <View style={styles.friendModalDivider} />

          <View style={styles.friendModalActions}>
            <TouchableOpacity
              style={[styles.friendModalBottomButton, styles.friendModalDeleteButton]}
              activeOpacity={0.75}
              onPress={() => onUnfriend(friend)}
              disabled={isUnfriending}
            >
              <Text style={styles.friendModalDeleteText}>
                {isUnfriending ? 'Đang xóa...' : 'Xóa bạn'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.friendModalBottomButton, styles.friendModalMessageButton]}
              activeOpacity={0.75}
              onPress={() => onMessage(friend)}
            >
              <Text style={styles.friendModalMessageText}>Nhắn tin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: FriendsListHeader
// Header của danh sách bạn bè: quick actions + pending + filter pills
// ═══════════════════════════════════════════════════════════════════════════
interface FriendsListHeaderProps {
  pendingRequests: any[];
  totalFriends: number;
  onlineCount: number;
  activeFilter: FilterType;
  onFilterChange: (f: FilterType) => void;
  onPendingPress: (req: any) => void;
  onFriendRequestsPress: () => void;
}

const FriendsListHeader: React.FC<FriendsListHeaderProps> = ({
  pendingRequests,
  totalFriends,
  onlineCount,
  activeFilter,
  onFilterChange,
  onPendingPress,
  onFriendRequestsPress,
}) => (
  <View style={styles.listHeader}>
    {/* Quick actions */}
    <View style={styles.quickActions}>
      <TouchableOpacity
        style={styles.quickActionBtn}
        activeOpacity={0.7}
        onPress={onFriendRequestsPress}
      >
        <View style={styles.quickActionIconBg}>
          {Icons.people(IconSize.md, colors.primary)}
        </View>
        <Text style={styles.quickActionLabel}>Lời mời kết bạn</Text>
        {pendingRequests.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pendingRequests.length}</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.quickActionBtn} activeOpacity={0.7}>
        <View style={styles.quickActionIconBg}>
          {Icons.gift(IconSize.md, colors.primary)}
        </View>
        <Text style={styles.quickActionLabel}>Sinh nhật</Text>
      </TouchableOpacity>
    </View>

    {/* Pending requests horizontal scroll */}
    {pendingRequests.length > 0 && (
      <View style={styles.pendingSection}>
        <Text style={styles.pendingSectionTitle}>
          Lời mời kết bạn ({pendingRequests.length})
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pendingScrollContent}
        >
          {pendingRequests.map((req, index) => (
            <TouchableOpacity
              key={String(req.userId || req.id || req.requestId || req.friendshipId || `pending-${index}`)}
              style={styles.pendingCard}
              onPress={() => onPendingPress(req)}
              activeOpacity={0.7}
            >
              <Avatar
                name={req.display_name}
                uri={req.avatar_url || undefined}
                size="md"
              />
              <Text style={styles.pendingName} numberOfLines={2}>
                {req.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    )}

    {/* Filter pills */}
    <View style={styles.filterPills}>
      <TouchableOpacity
        style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
        onPress={() => onFilterChange('all')}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
          Tất cả ({totalFriends})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterPill, activeFilter === 'recent' && styles.filterPillActive]}
        onPress={() => onFilterChange('recent')}
        activeOpacity={0.7}
      >
        <Text style={[styles.filterPillText, activeFilter === 'recent' && styles.filterPillTextActive]}>
          Mới truy cập ({onlineCount})
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: GroupItem
// Mỗi dòng nhóm: avatar + tên nhóm + số thành viên
// ═══════════════════════════════════════════════════════════════════════════
interface GroupItemProps {
  group: Group;
  onPress: (g: Group) => void;
}

const GroupItem: React.FC<GroupItemProps> = ({ group, onPress }) => (
  <TouchableOpacity
    style={styles.groupItem}
    onPress={() => onPress(group)}
    activeOpacity={0.7}
  >
    <Avatar
      name={group.name}
      uri={group.avatar_url || undefined}
      size="md"
      variant="group"
    />
    <View style={styles.groupInfo}>
      <Text style={styles.groupName} numberOfLines={1}>
        {group.name}
      </Text>
      {group.description ? (
        <Text style={styles.groupDesc} numberOfLines={1}>
          {group.description}
        </Text>
      ) : null}
    </View>
    <View style={styles.groupMeta}>
      {typeof group.member_count === 'number' && (
        <Text style={styles.groupMemberCount}>
          {group.member_count} thành viên
        </Text>
      )}
      <View style={styles.groupChevron}>
        {Icons.chevronRight(IconSize.sm, colors.text.tertiary)}
      </View>
    </View>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: OAItem
// Mỗi dòng OA (Official Account)
// ═══════════════════════════════════════════════════════════════════════════
interface OAItemProps {
  oa: OA;
  onPress: (oa: OA) => void;
}

const OAItem: React.FC<OAItemProps> = ({ oa, onPress }) => (
  <TouchableOpacity
    style={styles.oaItem}
    onPress={() => onPress(oa)}
    activeOpacity={0.7}
  >
    <Avatar
      name={oa.name}
      uri={oa.avatar_url || undefined}
      size="md"
    />
    <View style={styles.oaInfo}>
      <Text style={styles.oaName} numberOfLines={1}>
        {oa.name}
      </Text>
      {oa.description ? (
        <Text style={styles.oaDesc} numberOfLines={1}>
          {oa.description}
        </Text>
      ) : null}
    </View>
    <View style={styles.oaChevron}>
      {Icons.chevronRight(IconSize.sm, colors.text.tertiary)}
    </View>
  </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENT: EmptyState
// Trạng thái trống cho mỗi tab
// ═══════════════════════════════════════════════════════════════════════════
interface EmptyStateProps {
  tab: TabType;
}

const EmptyState: React.FC<EmptyStateProps> = ({ tab }) => {
  const configs = {
    friends: {
      icon: Icons.people(64),
      title: 'Chưa có bạn bè nào',
      subtitle: 'Thêm bạn bè để bắt đầu trò chuyện',
    },
    groups: {
      icon: Icons.userGroup(IconSize.xxl, colors.text.tertiary),
      title: 'Chưa có nhóm nào',
      subtitle: 'Tạo nhóm hoặc tham gia nhóm để trò chuyện cùng bạn bè',
    },
    oa: {
      icon: Icons.book(64),
      title: 'Chưa có OA nào',
      subtitle: 'Danh sách Official Account sẽ hiển thị tại đây',
    },
  };

  const config = configs[tab];

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>{config.icon}</View>
      <Text style={styles.emptyText}>{config.title}</Text>
      <Text style={styles.emptySubtext}>{config.subtitle}</Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT: ContactsScreen
// ═══════════════════════════════════════════════════════════════════════════
const SectionListRef = React.createRef<any>();

const ContactsScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  // ─── Redux State ─────────────────────────────────────────────────────────
  const friends = useAppSelector((state) => state.chat.friends);
  const pendingRequests = useAppSelector((state) => state.contacts.pendingRequests);
  const isContactsLoading = useAppSelector((state) => state.contacts.isLoading);
  const onlineUsers = useAppSelector((state) => state.chat.onlineUsers);

  // Groups state
  const myGroups = useAppSelector((state) => state.groups.myGroups);
  const isGroupsLoading = useAppSelector((state) => state.groups.isLoading);

  // ─── Local State ─────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [isUnfriending, setIsUnfriending] = useState(false);
  const currentUserId = useAppSelector((state) => state.auth.user?.userId);

  // ─── Load Data ────────────────────────────────────────────────────────────
  const loadContacts = useCallback(async () => {
    dispatch(setContactsLoading(true));
    dispatch(setGroupsLoading(true));
    try {
      const [friendsList, pendingList] = await Promise.all([
        friendsApi.getFriends().catch(() => []),
        friendsApi.getPendingRequests().catch(() => []),
      ]);

      dispatch(setFriends(friendsList));
      dispatch(setRawPendingRequests(pendingList as any));
      dispatch(fetchMyGroupsAsync());
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      dispatch(setContactsLoading(false));
      dispatch(setGroupsLoading(false));
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

  // ─── Filter Friends ────────────────────────────────────────────────────────
  const onlineFriends = useMemo(() =>
    friends.filter((f) => !!onlineUsers[f.friend_id || f.userId]),
    [friends, onlineUsers]
  );

  const displayFriends = useMemo(() =>
    activeFilter === 'recent' ? onlineFriends : friends,
    [activeFilter, friends, onlineFriends]
  );

  const sections = useMemo(() =>
    groupFriendsByLetter(displayFriends),
    [displayFriends]
  );

  const sectionIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    sections.forEach((s, i) => { map[s.title] = i; });
    return map;
  }, [sections]);

  const onlineCount = useMemo(() =>
    friends.filter((f) => !!onlineUsers[f.friend_id || f.userId]).length,
    [friends, onlineUsers]
  );

  // ─── Navigation Handlers ─────────────────────────────────────────────────
  const handleFriendPress = useCallback(
    (friend: Friend) => {
      const myId = currentUserId || '';
      const otherId = friend.userId;
      const conversationId = buildDmConversationId(myId, otherId);
      navigation.navigate('Chat', {
        conversationId,
        title: friend.display_name,
        userId: friend.userId,
      });
    },
    [navigation, currentUserId]
  );

  const handleFriendLongPress = useCallback((friend: Friend) => {
    setSelectedFriend(friend);
  }, []);

  const closeFriendModal = useCallback(() => {
    if (!isUnfriending) {
      setSelectedFriend(null);
    }
  }, [isUnfriending]);

  const handleViewFriendProfile = useCallback(
    (friend: Friend) => {
      setSelectedFriend(null);
      navigation.navigate('UserProfile', { userId: friend.userId || friend.friend_id || '' });
    },
    [navigation]
  );

  const handleMessageFriend = useCallback(
    (friend: Friend) => {
      setSelectedFriend(null);
      handleFriendPress(friend);
    },
    [handleFriendPress]
  );

  const handleUnfriend = useCallback(
    (friend: Friend) => {
      const friendshipId = friend.friendshipId;
      if (!friendshipId) {
        Alert.alert('Không thể hủy kết bạn', 'Thiếu mã quan hệ bạn bè.');
        return;
      }

      Alert.alert(
        'Xóa bạn',
        `Bạn có chắc muốn hủy kết bạn với ${friend.display_name || friend.username || 'người này'}?`,
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Xóa bạn',
            style: 'destructive',
            onPress: async () => {
              setIsUnfriending(true);
              try {
                await friendsApi.unfriend(friendshipId);
                const targetUserId = friend.userId || friend.friend_id;
                dispatch(
                  setFriends(
                    friends.filter(
                      (item) =>
                        item.friendshipId !== friendshipId &&
                        String(item.userId || item.friend_id) !== String(targetUserId)
                    )
                  )
                );
                setSelectedFriend(null);
              } catch (err: any) {
                Alert.alert(
                  'Lỗi',
                  err?.response?.data?.message || 'Không thể hủy kết bạn. Vui lòng thử lại.'
                );
              } finally {
                setIsUnfriending(false);
              }
            },
          },
        ]
      );
    },
    [dispatch, friends]
  );

  const handlePendingPress = useCallback(
    (req: PendingRequest) => {
      navigation.navigate('UserProfile', { userId: req.userId ?? '' });
    },
    [navigation]
  );

  const handleAddFriend = useCallback(() => {
    navigation.navigate('ContactsList');
  }, [navigation]);

  const handleFriendRequests = useCallback(() => {
    navigation.navigate('FriendRequests');
  }, [navigation]);

  const handleGroupPress = useCallback(
    (group: Group) => {
      navigation.navigate('GroupDetail', { groupId: group.groupId });
    },
    [navigation]
  );

  const handleOAPress = useCallback(
    (_oa: OA) => {
      // TODO: navigate to OA detail when available
    },
    []
  );

  // ─── Render Helpers ────────────────────────────────────────────────────────
  const renderSectionHeader = ({ section }: { section: FriendSection }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLetter}>{section.title}</Text>
    </View>
  );

  const renderFriendItem = ({ item }: { item: Friend }) => {
    const friendId = item.friend_id || item.userId || '';
    const isOnline = !!onlineUsers[friendId];
    return (
      <FriendItem
        friend={item}
        isOnline={isOnline}
        onPress={handleFriendPress}
        onLongPress={handleFriendLongPress}
      />
    );
  };

  const renderFriendSeparator = () => <View style={styles.separator} />;

  const renderGroupItem = ({ item }: { item: Group }) => (
    <GroupItem group={item} onPress={handleGroupPress} />
  );

  const renderGroupSeparator = () => <View style={styles.separatorGroup} />;

  const renderOAItem = ({ item }: { item: OA }) => (
    <OAItem oa={item} onPress={handleOAPress} />
  );

  const renderOASeparator = () => <View style={styles.separatorGroup} />;

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={handleRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  // ─── Tab Content Renderers ─────────────────────────────────────────────────
  const renderFriendsTab = () => (
    <View style={styles.listContainer}>
      <SectionList
        ref={SectionListRef}
        sections={sections}
        keyExtractor={(item, index) => String(item.userId || item.friend_id || item.friendshipId || `friend-${index}`)}
        renderItem={renderFriendItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={
          <FriendsListHeader
            pendingRequests={pendingRequests}
            totalFriends={friends.length}
            onlineCount={onlineCount}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onPendingPress={handlePendingPress}
            onFriendRequestsPress={handleFriendRequests}
          />
        }
        ListEmptyComponent={<EmptyState tab="friends" />}
        ItemSeparatorComponent={renderFriendSeparator}
        refreshControl={refreshControl}
        stickySectionHeadersEnabled
        onScrollToIndexFailed={() => {}}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      />
      {sections.length > 0 && (
        <AlphabetSidebar
          sections={sections}
          sectionIndexMap={sectionIndexMap}
          sectionListRef={SectionListRef}
        />
      )}
    </View>
  );

  const renderGroupsTab = () => (
    <FlatList
      data={myGroups}
      keyExtractor={(item) => item.groupId}
      renderItem={renderGroupItem}
      ItemSeparatorComponent={renderGroupSeparator}
      ListEmptyComponent={
        isGroupsLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <EmptyState tab="groups" />
        )
      }
      refreshControl={refreshControl}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 16,
        paddingTop: spacing.sm,
      }}
    />
  );

  const renderOATab = () => (
    <FlatList
      data={MOCK_OA_LIST}
      keyExtractor={(item) => item.oaId}
      renderItem={renderOAItem}
      ItemSeparatorComponent={renderOASeparator}
      ListEmptyComponent={<EmptyState tab="oa" />}
      refreshControl={refreshControl}
      contentContainerStyle={{
        paddingBottom: insets.bottom + 16,
        paddingTop: spacing.sm,
      }}
    />
  );

  // ─── Main Render ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Fixed header + tabs */}
      <ContactsHeader
        insets={insets.top}
        onAddFriend={handleAddFriend}
      />
      <ContactsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      <View style={styles.tabContent}>
        {activeTab === 'friends' && renderFriendsTab()}
        {activeTab === 'groups' && renderGroupsTab()}
        {activeTab === 'oa' && renderOATab()}
      </View>
      <FriendActionModal
        friend={selectedFriend}
        visible={!!selectedFriend}
        isUnfriending={isUnfriending}
        onClose={closeFriendModal}
        onViewProfile={handleViewFriendProfile}
        onMessage={handleMessageFriend}
        onUnfriend={handleUnfriend}
      />
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  // ── Zalo-style Header ──
  zaloHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerPlaceholder: {
    ...typography.h3,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fakeSearchBar: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchPlaceholder: {
    ...typography.body,
    color: 'rgba(255,255,255,0.65)',
    marginLeft: spacing.sm,
  },

  // ── Tabs ──
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screenPadding,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: spacing.md,
  },
  tabText: {
    ...typography.body,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '400',
  },
  tabTextActive: {
    color: colors.text.inverse,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    width: 32,
    height: 3,
    backgroundColor: colors.text.inverse,
    borderRadius: 1.5,
  },

  // ── Tab Content ──
  tabContent: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContainer: {
    flex: 1,
    flexDirection: 'row',
  },

  // ── List Header (Friends) ──
  listHeader: {
    backgroundColor: colors.background.secondary,
    paddingBottom: spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quickActionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  quickActionLabel: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '500',
    flex: 1,
  },
  badge: {
    backgroundColor: colors.badge.unread,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...typography.caption,
    color: colors.text.inverse,
    fontWeight: '700',
    fontSize: 10,
  },

  // ── Pending section ──
  pendingSection: {
    marginTop: spacing.md,
  },
  pendingSectionTitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
  },
  pendingScrollContent: {
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
  },
  pendingCard: {
    alignItems: 'center',
    width: 72,
    marginRight: spacing.sm,
  },
  pendingName: {
    ...typography.caption,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // ── Filter pills ──
  filterPills: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.primary,
  },
  filterPillActive: {
    backgroundColor: 'rgba(0, 140, 243, 0.08)',
    borderColor: colors.primary,
  },
  filterPillText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  // ── Section header ──
  sectionHeader: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.xs,
  },
  sectionLetter: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '700',
  },

  // ── Friend Item ──
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.background.primary,
  },
  friendName: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
    marginLeft: spacing.md,
  },
  actionIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Friend long-press modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  friendModalCard: {
    width: FRIEND_MODAL_WIDTH,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  friendModalName: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: spacing.md,
    maxWidth: '100%',
  },
  friendModalSubtitle: {
    ...typography.body,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    maxWidth: '100%',
  },
  friendModalQuickActions: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  friendModalQuickAction: {
    flex: 1,
    minHeight: 86,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  friendModalQuickActionText: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  friendModalInfoRow: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  friendModalInfoText: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  friendModalDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
  },
  friendModalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  friendModalBottomButton: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendModalDeleteButton: {
    backgroundColor: colors.background.secondary,
  },
  friendModalMessageButton: {
    backgroundColor: colors.primary,
  },
  friendModalDeleteText: {
    ...typography.subtitle,
    color: colors.text.primary,
    fontWeight: '700',
  },
  friendModalMessageText: {
    ...typography.subtitle,
    color: colors.text.inverse,
    fontWeight: '700',
  },

  // ── Group Item ──
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.listItemPadding,
    backgroundColor: colors.background.primary,
  },
  groupInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  groupName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  groupDesc: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupMemberCount: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginRight: spacing.xs,
  },
  groupChevron: {
    marginLeft: spacing.xs,
  },

  // ── OA Item ──
  oaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.listItemPadding,
    backgroundColor: colors.background.primary,
  },
  oaInfo: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  oaName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  oaDesc: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  oaChevron: {
    marginLeft: spacing.xs,
  },

  // ── Separators ──
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginLeft: spacing.screenPadding + spacing.iconSize.avatar + spacing.md,
  },
  separatorGroup: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginLeft: spacing.screenPadding + spacing.iconSize.avatar + spacing.md,
  },

  // ── Alphabet Sidebar ──
  alphabetSidebar: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  alphabetLetter: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 15,
  },
  alphabetLetterText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  alphabetLetterDisabled: {
    color: colors.text.tertiary,
  },

  // ── Empty / Loading ──
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconContainer: {
    marginBottom: spacing.lg,
    opacity: 0.3,
  },
  emptyText: {
    ...typography.subtitle,
    color: colors.text.secondary,
  },
  emptySubtext: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
});

export default ContactsScreen;
