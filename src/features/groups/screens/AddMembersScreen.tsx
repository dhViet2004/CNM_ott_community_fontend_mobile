import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  SectionList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Avatar, Icons, IconSize } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';
import { friendsApi } from '@api/endpoints';
import { getGroupMembers, addMembersToGroup } from '../api';
import { useAppDispatch } from '@store/hooks';
import { addMemberToGroup } from '@store/slices/groupsSlice';

type Props = RootStackScreenProps<'AddMembers'>;

const AddMembersScreen: React.FC<Props> = ({ route, navigation }) => {
  const groupId = route.params.groupId;
  const insets = useSafeAreaInsets();
  const sectionListRef = useRef<SectionList>(null);
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load Data
  const loadFriendsAndMembers = useCallback(async () => {
    setLoading(true);
    try {
      const [friendsList, groupMembers] = await Promise.all([
        friendsApi.getFriends().catch(() => []),
        getGroupMembers(groupId).catch(() => []),
      ]);

      const memberIds = new Set(
        groupMembers.map((m: any) => String(m.userId || m.id || m.friend_id || '').trim())
      );

      // Filter out those already in group
      const nonMembers = friendsList.filter((f: any) => {
        const uid = String(f.userId || f.friend_id || f.id || '').trim();
        return uid && !memberIds.has(uid);
      });

      setFriends(nonMembers);
    } catch (err) {
      console.error('Failed to load add members data:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadFriendsAndMembers();
  }, [loadFriendsAndMembers]);

  // Group by first letter for SectionList
  const sections = useMemo(() => {
    const filtered = friends.filter((f) => {
      const name = (f.display_name || f.username || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      return name.includes(q);
    });

    // Grouping by character
    const groups: { [key: string]: any[] } = {};
    filtered.forEach((f) => {
      const name = f.display_name || f.username || 'Unknown';
      let firstChar = name.charAt(0).toUpperCase();
      // If first char is not a letter, use '#'
      if (!/^[A-Z]$/.test(firstChar)) {
        firstChar = '#';
      }
      if (!groups[firstChar]) {
        groups[firstChar] = [];
      }
      groups[firstChar].push(f);
    });

    // Sort sections alphabetically, with '#' at the end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((key) => ({
      title: key,
      data: groups[key].sort((a, b) =>
        (a.display_name || a.username || '').localeCompare(
          b.display_name || b.username || ''
        )
      ),
    }));
  }, [friends, searchQuery]);

  const toggleSelect = (userId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedIds(newSelected);
  };

  const handleInviteByLink = useCallback(() => {
    Alert.alert('Mời vào nhóm bằng link', 'Đã sao chép link mời nhóm!');
  }, []);

  const handleAddMembers = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const uids = Array.from(selectedIds);
      await addMembersToGroup(groupId, uids);
      // Nhiệm vụ 3: Dispatch Redux để cập nhật group members
      uids.forEach((userId) => {
        dispatch(addMemberToGroup({
          groupId: String(groupId),
          member: {
            userId: String(userId),
            username: '',
            display_name: '',
            avatar_url: null,
            role: 'MEMBER',
            joined_at: new Date().toISOString(),
          },
        }));
      });
      Alert.alert('Thành công', 'Đã thêm thành viên vào nhóm');
      navigation.goBack();
    } catch (err: any) {
      console.error('[AddMembers] addMembersToGroup error:', err?.response?.data, err?.message);
      Alert.alert('Lỗi', err?.response?.data?.message || err?.message || 'Không thể thêm thành viên');
    } finally {
      setSaving(false);
    }
  }, [selectedIds, groupId, navigation, dispatch]);

  const onLetterPress = useCallback((index: number) => {
    sectionListRef.current?.scrollToLocation({
      sectionIndex: index,
      itemIndex: 0,
      animated: true,
      viewOffset: 0,
    });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
          {Icons.close(IconSize.lg, colors.text.primary)}
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Thêm vào nhóm</Text>
          <Text style={styles.headerSubtitle}>Đã chọn: {selectedIds.size}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, selectedIds.size === 0 && styles.disabledBtn]}
          onPress={handleAddMembers}
          disabled={selectedIds.size === 0 || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={styles.addBtnText}>Thêm</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchIconContainer}>{Icons.search(IconSize.sm)}</View>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm tên hoặc số điện thoại"
            placeholderTextColor={colors.text.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              {Icons.close(IconSize.sm)}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Invite By Link */}
      <TouchableOpacity style={styles.linkRow} onPress={handleInviteByLink}>
        <View style={styles.linkLeft}>
          <View style={styles.linkIconBg}>{Icons.link(IconSize.md, colors.primary)}</View>
          <Text style={styles.linkText}>Mời vào nhóm bằng link</Text>
        </View>
        {Icons.chevronRight(IconSize.md, colors.text.tertiary)}
      </TouchableOpacity>

      {/* Content & Sidebar */}
      <View style={styles.contentWrapper}>
        {loading ? (
          <View style={styles.loadingWrapper}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <SectionList
            ref={sectionListRef}
            sections={sections}
            keyExtractor={(item) => String(item.userId || item.friend_id || item.id)}
            renderSectionHeader={({ section: { title } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
              </View>
            )}
            renderItem={({ item }) => {
              const userId = String(item.userId || item.friend_id || item.id);
              const isSelected = selectedIds.has(userId);
              return (
                <TouchableOpacity
                  style={styles.userRow}
                  activeOpacity={0.7}
                  onPress={() => toggleSelect(userId)}
                >
                  <View style={styles.rowLeftWrapper}>
                    {/* Radio button / Circle checkbox */}
                    <View
                      style={[
                        styles.circleCheck,
                        isSelected && styles.circleCheckSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.circleCheckDot} />}
                    </View>

                    <Avatar
                      name={item.display_name || item.username || 'U'}
                      uri={item.avatar_url || undefined}
                      size="md"
                    />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>
                        {item.display_name || item.username}
                      </Text>
                      {item.username && (
                        <Text style={styles.userHandle}>@{item.username}</Text>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>Không tìm thấy bạn bè nào</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
          />
        )}

        {/* Vertical Alphabet Index Sidebar */}
        {!loading && sections.length > 0 && (
          <View style={styles.alphabetSidebar}>
            {sections.map((section, idx) => (
              <TouchableOpacity
                key={section.title}
                style={styles.alphabetLetterBtn}
                onPress={() => onLetterPress(idx)}
              >
                <Text style={styles.alphabetLetterText}>{section.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Bottom Sticky Foot Note */}
      <View style={[styles.footerNote, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.footerNoteText}>
          Thành viên mới xem được tin gửi gần đây
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: { flex: 1, marginLeft: spacing.sm },
  headerTitle: { ...typography.h3, color: colors.text.primary },
  headerSubtitle: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    backgroundColor: colors.border.default,
  },
  addBtnText: {
    ...typography.button,
    color: colors.text.inverse,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchIconContainer: {
    marginRight: spacing.sm,
    opacity: 0.6,
  },
  searchInput: { flex: 1, ...typography.body, color: colors.text.primary, paddingVertical: 0 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  linkLeft: { flexDirection: 'row', alignItems: 'center' },
  linkIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  linkText: { ...typography.body, color: colors.text.primary },
  contentWrapper: { flex: 1, flexDirection: 'row' },
  loadingWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: {
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowLeftWrapper: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  circleCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  circleCheckSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  circleCheckDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.inverse,
  },
  userInfo: { marginLeft: spacing.md, flex: 1 },
  userName: { ...typography.subtitle, color: colors.text.primary },
  userHandle: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  separator: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: 110,
  },
  emptyWrap: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { ...typography.bodySmall, color: colors.text.tertiary },
  alphabetSidebar: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  alphabetLetterBtn: {
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alphabetLetterText: {
    ...typography.caption,
    fontSize: 10,
    color: colors.text.tertiary,
    fontWeight: '700',
  },
  footerNote: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  footerNoteText: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default AddMembersScreen;
