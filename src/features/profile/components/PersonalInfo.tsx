import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Feather } from '@expo/vector-icons';

interface PersonalInfoProps {
  username: string;
  gender?: string;
  birthday?: string;
  phone?: string;
}

const PersonalInfo: React.FC<PersonalInfoProps> = ({ username, gender, birthday, phone }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thông tin cá nhân</Text>
      
      <View style={styles.infoList}>
        <View style={styles.infoItem}>
          <Text style={styles.label}>Tên đăng nhập</Text>
          <Text style={styles.value}>@{username}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.label}>Giới tính</Text>
          <Text style={styles.value}>{gender || 'Chưa thiết lập'}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.label}>Ngày sinh</Text>
          <Text style={styles.value}>{birthday || 'Chưa thiết lập'}</Text>
        </View>

        {phone && (
          <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>Điện thoại</Text>
            <Text style={styles.value}>{phone}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  infoList: {
    backgroundColor: colors.background.secondary,
    borderRadius: spacing.borderRadius.lg,
    paddingHorizontal: spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
  },
  value: {
    ...typography.bodySmall,
    color: colors.text.primary,
    fontWeight: '500',
  },
});

export default PersonalInfo;
