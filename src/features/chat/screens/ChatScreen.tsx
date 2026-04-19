import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, shadows } from '@theme';
import { MessageListItem } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';
import type { MockConversation } from '../data/mockConversations';
import { MOCK_CONVERSATIONS } from '../data/mockConversations';

type Props = RootStackScreenProps<'MainTabs'>;

const ChatScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [conversations] = useState<MockConversation[]>(MOCK_CONVERSATIONS);

  const filteredConversations = conversations.filter((conv) =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedConversations = filteredConversations.filter((c) => c.isPinned);
  const normalConversations = filteredConversations.filter(
    (c) => !c.isPinned && !c.isMuted
  );
  const mutedConversations = filteredConversations.filter((c) => c.isMuted);

  const handleConversationPress = useCallback(
    (conv: MockConversation) => {
      navigation.navigate('Chat', {
        conversationId: conv.id,
        title: conv.name || 'Chat',
      });
    },
    [navigation]
  );

  const handleConversationLongPress = useCallback((conv: MockConversation) => {
    Alert.alert(
      conv.name || 'Tùy chọn',
      'Chọn thao tác với cuộc trò chuyện',
      [
        { text: 'Ghim', onPress: () => {} },
        { text: 'Tắt thông báo', onPress: () => {} },
        { text: 'Xóa', onPress: () => {}, style: 'destructive' },
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
            <Text style={styles.headerIconText}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleAddFriend}
            style={styles.headerIcon}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.headerIconText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
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
              <Text style={styles.clearIcon}>✕</Text>
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

  const renderConversation = ({ item }: { item: MockConversation }) => (
    <MessageListItem
      avatarUri={item.avatar}
      name={item.name || 'Người dùng'}
      lastMessage={item.lastMessage}
      time={item.time}
      unreadCount={item.unreadCount}
      isOnline={item.isOnline}
      onPress={() => handleConversationPress(item)}
      onLongPress={() => handleConversationLongPress(item)}
    />
  );

  const renderSeparator = () => <View style={styles.separator} />;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>💬</Text>
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
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 60 },
        ]}
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