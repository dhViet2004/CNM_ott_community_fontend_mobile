import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import { messageApi } from '@api/endpoints';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'MessageSearch'>;

const MessageSearchScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, title } = route.params;
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    try {
      const res = await messageApi.searchMessages({
        conversationId,
        keyword: query.trim(),
      });
      setResults(res.data || []);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => {
        // Navigate back to Chat and focus on message
        navigation.navigate('Chat', {
          conversationId,
          title,
          focusedMessageId: String(item.id),
        } as any);
      }}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.senderName}>{item.senderDisplayName || 'Người dùng'}</Text>
        <Text style={styles.resultTime}>
          {new Date(item.createdAt).toLocaleDateString('vi-VN')}
        </Text>
      </View>
      <Text style={styles.resultContent} numberOfLines={2}>
        {item.content}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.searchBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            {Icons.back(IconSize.md, colors.text.secondary)}
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder={`Tìm tin nhắn trong ${title}`}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              {Icons.close(IconSize.sm)}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {query ? 'Không tìm thấy kết quả' : 'Nhập từ khóa để tìm kiếm'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  backButton: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    paddingVertical: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.tertiary,
  },
  listContent: {
    padding: spacing.md,
  },
  resultItem: {
    backgroundColor: colors.background.primary,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderBottomColor: colors.border.light,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  senderName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text.primary,
  },
  resultTime: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
  resultContent: {
    ...typography.body,
    color: colors.text.secondary,
  },
});

export default MessageSearchScreen;
