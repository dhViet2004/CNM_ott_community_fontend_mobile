import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { addFriend } from '@store/slices/chatSlice';
import { friendsApi, userApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';
import { Avatar } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'ContactsList'>;

const ContactsListScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const friends = useAppSelector((state) => state.chat.friends);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await userApi.searchUsers(query.trim());
      const filtered = results.filter(
        (u) => !friends.find((f) => (f.friend_id || f.userId) === u.userId)
      );
      setSearchResults(filtered);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [friends]);

  const handleSendRequest = useCallback(async (userId: string, name: string) => {
    try {
      await friendsApi.sendRequest(userId);
      Alert.alert('Thành công', `Đã gửi lời mời kết bạn đến ${name}`);
    } catch (err: any) {
      Alert.alert(
        'Lỗi',
        err?.response?.data?.message || 'Không thể gửi lời mời'
      );
    }
  }, []);

  const renderUserItem = ({ item }: { item: any }) => (
    <View style={styles.userItem}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => navigation.navigate('UserProfile', { userId: item.userId })}
        activeOpacity={0.7}
      >
        <Avatar
          name={item.display_name || item.username}
          uri={item.avatar_url || undefined}
          size="md"
        />
        <View style={styles.userText}>
          <Text style={styles.userName}>{item.display_name || item.username}</Text>
          <Text style={styles.userUsername}>@{item.username}</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.addBtn}
        onPress={() => handleSendRequest(item.userId, item.display_name || item.username)}
      >
        <Text style={styles.addBtnText}>Kết bạn</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thêm bạn</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo tên hoặc số điện thoại"
            placeholderTextColor={colors.text.placeholder}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.userId}
        renderItem={renderUserItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>
              {isSearching
                ? 'Đang tìm kiếm...'
                : searchQuery.length > 0
                ? 'Không tìm thấy người dùng'
                : 'Nhập tên hoặc số điện thoại để tìm bạn'}
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: colors.text.inverse, fontWeight: '300' },
  headerTitle: { flex: 1, ...typography.h3, color: colors.text.inverse, textAlign: 'center' },
  searchContainer: { padding: spacing.md, backgroundColor: colors.background.primary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchIcon: { fontSize: 16, marginRight: spacing.sm },
  searchInput: { flex: 1, ...typography.body, color: colors.text.primary, paddingVertical: 0 },
  clearIcon: { fontSize: 14, color: colors.text.tertiary },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.listItemPadding,
    backgroundColor: colors.background.primary,
  },
  userInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  userText: { marginLeft: spacing.md, flex: 1 },
  userName: { ...typography.subtitle, color: colors.text.primary },
  userUsername: { ...typography.caption, color: colors.text.tertiary },
  addBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.md,
  },
  addBtnText: { ...typography.caption, color: colors.text.inverse, fontWeight: '600' },
  separator: {
    height: 0,
    backgroundColor: colors.border.light,
    marginLeft: spacing.screenPadding + spacing.iconSize.avatar + spacing.md,
  },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyText: { ...typography.body, color: colors.text.tertiary, textAlign: 'center', paddingHorizontal: spacing.xl },
});

export default ContactsListScreen;
