import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Avatar, Button } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'UserProfile'>;

const UserProfileScreen: React.FC<Props> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { userId } = route.params;

  const handleBack = () => navigation.goBack();
  const handleSendMessage = () => {
    navigation.navigate('Chat', { conversationId: userId, title: 'Người dùng' });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trang cá nhân</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <Avatar name="Người dùng" size="xl" />
          <Text style={styles.userName}>Người dùng Zalo</Text>
          <Text style={styles.userStatus}>Đang hoạt động</Text>
        </View>

        <View style={styles.actions}>
          <Button title="Nhắn tin" onPress={handleSendMessage} />
          <Button title="Chặn" variant="outline" style={{ marginLeft: spacing.md }} />
        </View>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Số điện thoại</Text>
            <Text style={styles.infoValue}>0842 xxx xxx</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bio</Text>
            <Text style={styles.infoValue}>Chưa cập nhật</Text>
          </View>
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
});

export default UserProfileScreen;