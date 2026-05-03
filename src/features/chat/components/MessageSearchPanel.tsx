import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme';
import { Icons } from '@components/common';
import { messageApi } from '@api/endpoints';

interface MessageSearchRow {
  id: string | number;
  senderId: string | number;
  senderDisplayName?: string;
  senderAvatarUrl?: string | null;
  content: string;
  contentType?: string;
  createdAt: string;
  conversationId: string;
}

interface MessageSearchPanelProps {
  visible: boolean;
  onClose: () => void;
  conversationId: string;
  currentUserId: string;
  onResultClick: (item: MessageSearchRow) => void;
}

const MessageSearchPanel: React.FC<MessageSearchPanelProps> = ({
  visible,
  onClose,
  conversationId,
  currentUserId,
  onResultClick,
}) => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<MessageSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scope, setScope] = useState<'conversation' | 'global'>('conversation');

  const handleSearch = async () => {
    if (!keyword.trim()) return;

    setLoading(true);
    setError('');
    try {
      const response = scope === 'conversation'
        ? await messageApi.searchMessages({
            conversationId,
            keyword: keyword.trim(),
            limit: 50,
          })
        : await messageApi.searchGlobalMessages({
            keyword: keyword.trim(),
            limit: 50,
          });
      
      setResults(response.data || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tìm kiếm tin nhắn');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: MessageSearchRow }) => {
    const date = new Date(item.createdAt);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => onResultClick(item)}
      >
        <View style={styles.resultHeader}>
          <Text style={styles.senderName}>{item.senderDisplayName || `ID: ${item.senderId}`}</Text>
          <Text style={styles.resultTime}>{dateStr}</Text>
        </View>
        <Text style={styles.resultContent} numberOfLines={2}>
          {item.content || '[Không có nội dung]'}
        </Text>
        {scope === 'global' && (
          <Text style={styles.contextText}>
            Trong: {item.conversationId.startsWith('dm:') ? 'Cuộc trò chuyện cá nhân' : 'Nhóm'}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tìm kiếm tin nhắn</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.searchBox}>
          <View style={styles.inputContainer}>
            <Ionicons name="search" size={20} color={colors.text.tertiary} style={styles.searchIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nhập từ khóa..."
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoFocus
            />
            {keyword.length > 0 && (
              <TouchableOpacity onPress={() => setKeyword('')}>
                <Ionicons name="close-circle" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.scopeContainer}>
            <TouchableOpacity
              style={[styles.scopeBtn, scope === 'conversation' && styles.scopeBtnActive]}
              onPress={() => setScope('conversation')}
            >
              <Ionicons 
                name="chatbubble-outline" 
                size={16} 
                color={scope === 'conversation' ? colors.primary : colors.text.secondary} 
              />
              <Text style={[styles.scopeBtnText, scope === 'conversation' && styles.scopeBtnTextActive]}>
                Trong chat này
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeBtn, scope === 'global' && styles.scopeBtnActive]}
              onPress={() => setScope('global')}
            >
              <Ionicons 
                name="globe-outline" 
                size={16} 
                color={scope === 'global' ? colors.primary : colors.text.secondary} 
              />
              <Text style={[styles.scopeBtnText, scope === 'global' && styles.scopeBtnTextActive]}>
                Toàn bộ tin nhắn
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helpText}>
            {scope === 'conversation' 
              ? 'Chỉ tìm kiếm tin nhắn trong cuộc hội thoại hiện tại.' 
              : 'Tìm kiếm tin nhắn từ tất cả bạn bè và các nhóm bạn đã tham gia.'}
          </Text>

          <TouchableOpacity
            style={[styles.searchBtn, !keyword.trim() && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={loading || !keyword.trim()}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.searchBtnText}>Tìm kiếm</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : results.length === 0 && !loading ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>
              {keyword ? 'Không tìm thấy kết quả' : 'Nhập từ khóa để bắt đầu tìm kiếm'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.conversationId}-${item.id}`}
            renderItem={renderItem}
            contentContainerStyle={styles.resultsList}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: '#FFF',
  },
  headerTitle: {
    ...typography.subtitle,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 8,
  },
  searchBox: {
    padding: spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: colors.text.primary,
  },
  scopeContainer: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  scopeBtn: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3F4',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  scopeBtnActive: {
    backgroundColor: 'rgba(0,136,255,0.1)',
    borderColor: colors.primary,
  },
  scopeBtnText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  scopeBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
    paddingHorizontal: 4,
  },
  searchBtn: {
    marginTop: spacing.md,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  resultsList: {
    paddingVertical: spacing.sm,
  },
  resultItem: {
    padding: spacing.md,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  resultTime: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  resultContent: {
    fontSize: 15,
    color: colors.text.primary,
    lineHeight: 20,
  },
  contextText: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
});

export default MessageSearchPanel;
