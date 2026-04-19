import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Ionicons } from '@expo/vector-icons';

interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  badge?: string;
  showArrow?: boolean;
  onPress: () => void;
  destructive?: boolean;
}

interface ProfileMenuProps {
  isMyProfile: boolean;
  onChangeCover?: () => void;
  onChangeAvatar?: () => void;
  onPrivacySettings?: () => void;
  onQRCode?: () => void;
  onCloud?: () => void;
  onSecurity?: () => void;
  onSettings?: () => void;
  onTimeline?: () => void;
  onPhotos?: () => void;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  isMyProfile,
  onChangeCover,
  onChangeAvatar,
  onPrivacySettings,
  onQRCode,
  onCloud,
  onSecurity,
  onSettings,
  onTimeline,
  onPhotos,
}) => {
  const handlePress = (item: MenuItem) => {
    if (item.destructive) {
      Alert.alert('Xác nhận', 'Bạn có chắc muốn thực hiện?', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đồng ý', onPress: item.onPress },
      ]);
    } else {
      item.onPress();
    }
  };

  const iconColor = colors.primary;

  const buildMenuItems = (): MenuItem[] => {
    if (isMyProfile) {
      return [
        {
          id: 'timeline',
          icon: <Ionicons name="document-text-outline" size={24} color={iconColor} />,
          label: 'Bài viết',
          description: 'Xem tất cả bài viết của bạn',
          onPress: onTimeline || (() => {}),
        },
        {
          id: 'photos',
          icon: <Ionicons name="images-outline" size={24} color={iconColor} />,
          label: 'Ảnh',
          description: 'Những khoảnh khắc đáng nhớ',
          onPress: onPhotos || (() => {}),
        },
        {
          id: 'qr',
          icon: <Ionicons name="qr-code-outline" size={24} color={iconColor} />,
          label: 'Ví QR của tôi',
          description: 'Mã QR cá nhân để chia sẻ',
          onPress: onQRCode || (() => {}),
          showArrow: true,
        },
        {
          id: 'cloud',
          icon: <Ionicons name="cloud-outline" size={24} color={iconColor} />,
          label: 'Cloud của tôi',
          description: 'Lưu trữ đám mây',
          onPress: onCloud || (() => {}),
          showArrow: true,
        },
        {
          id: 'cover',
          icon: <Ionicons name="image-outline" size={24} color={iconColor} />,
          label: 'Đổi ảnh bìa',
          description: 'Cập nhật ảnh bìa trang cá nhân',
          onPress: onChangeCover || (() => {}),
          showArrow: true,
        },
        {
          id: 'avatar',
          icon: <Ionicons name="person-outline" size={24} color={iconColor} />,
          label: 'Đổi ảnh đại diện',
          description: 'Cập nhật ảnh hồ sơ',
          onPress: onChangeAvatar || (() => {}),
          showArrow: true,
        },
        {
          id: 'privacy',
          icon: <Ionicons name="lock-closed-outline" size={24} color={iconColor} />,
          label: 'Cài đặt quyền riêng tư',
          description: 'Kiểm soát ai có thể xem thông tin',
          onPress: onPrivacySettings || (() => {}),
          showArrow: true,
        },
        {
          id: 'security',
          icon: <Ionicons name="shield-checkmark-outline" size={24} color={iconColor} />,
          label: 'Tài khoản & Bảo mật',
          description: 'Mật khẩu, xác thực hai yếu tố',
          onPress: onSecurity || (() => {}),
          showArrow: true,
        },
        {
          id: 'settings',
          icon: <Ionicons name="settings-outline" size={24} color={iconColor} />,
          label: 'Cài đặt',
          description: 'Cài đặt ứng dụng và thông báo',
          onPress: onSettings || (() => {}),
          showArrow: true,
        },
      ];
    }

    return [
      {
        id: 'timeline',
        icon: <Ionicons name="document-text-outline" size={24} color={iconColor} />,
        label: 'Bài viết',
        description: 'Xem bài viết của người này',
        onPress: onTimeline || (() => {}),
      },
      {
        id: 'photos',
        icon: <Ionicons name="images-outline" size={24} color={iconColor} />,
        label: 'Ảnh',
        description: 'Xem ảnh của người này',
        onPress: onPhotos || (() => {}),
      },
      {
        id: 'block',
        icon: <Ionicons name="ban-outline" size={24} color={colors.status.error} />,
        label: 'Chặn tin nhắn',
        description: 'Ngăn người này nhắn tin cho bạn',
        onPress: () => {},
        destructive: false,
      },
      {
        id: 'report',
        icon: <Ionicons name="flag-outline" size={24} color={colors.status.error} />,
        label: 'Báo cáo',
        description: 'Báo cáo hồ sơ này',
        onPress: () => {},
        destructive: true,
      },
    ];
  };

  const menuItems = buildMenuItems();

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {isMyProfile ? 'Cá nhân' : 'Hành động'}
        </Text>
      </View>

      {/* Menu items grid/list */}
      <View style={styles.menuGrid}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuIcon}>
                {item.icon}
              </View>
              <View style={styles.menuTextContent}>
                <Text
                  style={[
                    styles.menuLabel,
                    item.destructive && styles.destructiveText,
                  ]}
                >
                  {item.label}
                </Text>
                {item.description && (
                  <Text style={styles.menuDescription}>{item.description}</Text>
                )}
              </View>
              {item.showArrow !== false && (
                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Version info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Zalo Clone v1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    marginTop: spacing.md,
  },
  sectionHeader: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.secondary,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  menuGrid: {
    backgroundColor: colors.background.primary,
  },
  menuItem: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border.light,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.listItemPadding,
    paddingHorizontal: spacing.screenPadding,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: spacing.borderRadius.lg,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuTextContent: {
    flex: 1,
  },
  menuLabel: {
    ...typography.subtitle,
    color: colors.text.primary,
    fontWeight: '500',
  },
  destructiveText: {
    color: colors.status.error,
  },
  menuDescription: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.background.secondary,
  },
  footerText: {
    ...typography.caption,
    color: colors.text.tertiary,
  },
});

export default ProfileMenu;
