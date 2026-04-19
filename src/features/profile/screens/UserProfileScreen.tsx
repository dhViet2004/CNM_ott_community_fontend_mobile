import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Avatar, Button } from '@components/common';
import { useProfile } from '../hooks';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'UserProfile'>;

const UserProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();

  const { user, isLoading, friendStatus, friendshipId, sendFriendRequest, cancelFriendRequest, acceptFriendRequest, unfriend } =
    useProfile({ userId, autoLoad: true });

  useEffect(() => {
    if (user) {
      navigation.setOptions({ title: user.fullName });
    }
  }, [user, navigation]);

  const handleBack = () => navigation.goBack();
  const handleSendMessage = () => {
    navigation.navigate('Chat', {
      conversationId: `dm:${[userId].sort().join(':')}`,
      title: user?.fullName || 'Người dùng',
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.errorText}>Không tìm thấy người dùng</Text>
        <Button title="Quay lại" onPress={handleBack} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{user.fullName}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <Avatar
            uri={user.avatarUrl}
            name={user.fullName}
            size="xl"
            showOnlineIndicator={!isLoading}
            online={user.isOnline}
          />
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userStatus}>
            {user.isOnline ? 'Đang hoạt động' : 'Offline'}
          </Text>
        </View>

        <View style={styles.actions}>
          {friendStatus === 'friends' && (
            <>
              <Button title="Nhắn tin" onPress={handleSendMessage} />
              <Button
                title="Bạn bè"
                variant="outline"
                style={{ marginLeft: spacing.md }}
                onPress={() => {
                  // TODO: navigate to unfriend action
                }}
              />
            </>
          )}
          {friendStatus === 'pending_sent' && (
            <Button
              title="Hủy lời mời"
              variant="outline"
              onPress={() => cancelFriendRequest(friendshipId ?? '')}
            />
          )}
          {friendStatus === 'pending_received' && (
            <>
              <Button title="Chấp nhận" onPress={() => acceptFriendRequest(friendshipId ?? '')} />
              <Button
                title="Từ chối"
                variant="outline"
                style={{ marginLeft: spacing.md }}
                onPress={() => cancelFriendRequest(friendshipId ?? '')}
              />
            </>
          )}
          {friendStatus === 'none' && (
            <Button title="Kết bạn" onPress={sendFriendRequest} />
          )}
          <Button
            title="Chặn"
            variant="outline"
            style={{ marginLeft: spacing.md }}
          />
        </View>

        <View style={styles.infoSection}>
          {user.phoneNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>
              <Text style={styles.infoValue}>{user.phoneNumber}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bio</Text>
            <Text style={styles.infoValue}>{user.bio || 'Chưa cập nhật'}</Text>
          </View>
          {user.lastSeen && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hoạt động</Text>
              <Text style={styles.infoValue}>{user.lastSeen}</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    height: 56,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: colors.text.inverse, fontWeight: '300' },
  headerTitle: { flex: 1, ...typography.h3, color: colors.text.inverse, textAlign: 'center' },
  content: { paddingBottom: spacing.xxl },
  profileHeader: { alignItems: 'center', paddingVertical: spacing.xxl },
  userName: { ...typography.h2, color: colors.text.primary, marginTop: spacing.md },
  userStatus: { ...typography.bodySmall, color: colors.text.tertiary, marginTop: spacing.xs },
  actions: { flexDirection: 'row', paddingHorizontal: spacing.screenPadding, marginBottom: spacing.xl },
  infoSection: { backgroundColor: colors.background.secondary, marginTop: spacing.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.listItemPadding,
    paddingHorizontal: spacing.screenPadding,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  infoLabel: { ...typography.body, color: colors.text.secondary },
  infoValue: { ...typography.body, color: colors.text.primary },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { ...typography.body, color: colors.text.secondary, textAlign: 'center' },
});

export default UserProfileScreen;