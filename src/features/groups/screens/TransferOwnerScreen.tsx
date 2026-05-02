import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';
import { getGroupMembers } from '../api';

type Props = RootStackScreenProps<'TransferOwner'>;

const TransferOwnerScreen: React.FC<Props> = ({ route, navigation }) => {
  const { groupId, groupName } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [transferring, setTransferring] = useState(false);

  // Load members
  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const membersData = await getGroupMembers(groupId);
      // Filter out owner and only show MEMBER or DEPUTY
      const eligibleMembers = (membersData || []).filter(
        (m) => (m.role || '').toUpperCase() !== 'OWNER'
      );
      setMembers(eligibleMembers);
    } catch (err) {
      console.error('Failed to load members:', err);
      Alert.alert('Lỗi', 'Không thể tải danh sách thành viên');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // Filter by search
  const filteredMembers = searchQuery.trim()
    ? members.filter(
        (m) =>
          (m.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.username || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : members;

  // Handle transfer
  const handleTransfer = useCallback(async () => {
    if (!selectedMember) {
      Alert.alert('Thông báo', 'Vui lòng chọn thành viên để chuyển quyền');
      return;
    }

    Alert.alert(
      'Xác nhận chuyển quyền',
      `Bạn có chắc muốn chuyển quyền Trưởng nhóm cho "${selectedMember.displayName || selectedMember.username}"? Sau khi chuyển, bạn sẽ trở thành Phó nhóm.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setTransferring(true);
            try {
              // Use leaveGroup with newOwnerId to transfer ownership
              const { leaveGroup } = require('../api');
              await leaveGroup(groupId, selectedMember.userId || selectedMember.id);
              Alert.alert('Thành công', 'Đã chuyển quyền Trưởng nhóm', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('MainTabs'),
                },
              ]);
            } catch (err: any) {
              Alert.alert(
                'Lỗi',
                err?.response?.data?.message || 'Không thể chuyển quyền'
              );
            } finally {
              setTransferring(false);
            }
          },
        },
      ]
    );
  }, [groupId, selectedMember, navigation]);

  // Render member item
  const renderMemberItem = ({ item }: { item: any }) => {
    const memberId = String(item.userId || item.id || '');
    const isSelected = selectedMember && String(selectedMember.userId || selectedMember.id) === memberId;
    const roleLabel = (item.role || '').toUpperCase() === 'DEPUTY' ? 'Phó nhóm' : 'Thành viên';

    return (
      <TouchableOpacity
        style={[styles.memberItem, isSelected && styles.memberItemSelected]}
        onPress={() => setSelectedMember(item)}
      >
        <View style={styles.radioCircle}>
          {isSelected && <View style={styles.radioDot} />}
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.avatar}>
            {Icons.person(IconSize.lg)}
          </View>
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {item.displayName || item.username || 'Unknown'}
            </Text>
            <Text style={styles.memberMeta}>{roleLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>Không có thành viên nào để chuyển quyền</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          {Icons.arrowBack(IconSize.lg)}
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chuyển quyền Trưởng nhóm</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Chọn thành viên để chuyển quyền Trưởng nhóm "{groupName}"
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        {Icons.search(IconSize.md)}
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm thành viên..."
          placeholderTextColor={colors.text.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            {Icons.close(IconSize.sm)}
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberItem}
          keyExtractor={(item) => String(item.userId || item.id || Math.random())}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={[styles.confirmBtn, !selectedMember && styles.confirmBtnDisabled]}
          onPress={handleTransfer}
          disabled={!selectedMember || transferring}
        >
          {transferring ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <Text style={styles.confirmBtnText}>Xác nhận chuyển quyền</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  headerRight: {
    width: 40,
  },
  infoContainer: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.primary,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: 1,
    gap: spacing.md,
  },
  memberItemSelected: {
    backgroundColor: colors.primary + '10',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  memberMeta: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  footer: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: colors.border.default,
  },
  confirmBtnText: {
    ...typography.button,
    color: colors.text.inverse,
    fontWeight: '600',
  },
});

export default TransferOwnerScreen;
