import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar, Icons, IconSize } from '@components/common';
import { styles } from './styles';

interface ProfileSectionProps {
  groupName: string;
  avatarUrl?: string | null;
  description?: string;
  onEditAvatar: () => void;
  onEditName: () => void;
  onEditDescription: () => void;
  onAddMembers: () => void;
  onSearch: () => void;
  onChangeWallpaper: () => void;
  onMute: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  groupName,
  avatarUrl,
  description,
  onEditAvatar,
  onEditName,
  onEditDescription,
  onAddMembers,
  onSearch,
  onChangeWallpaper,
  onMute,
}) => {
  const quickActions = [
    { key: 'search', label: 'Tìm\ntin nhắn', icon: Icons.search(28), onPress: onSearch },
    { key: 'add', label: 'Thêm\nthành viên', icon: Icons.groupAdd(28), onPress: onAddMembers },
    { key: 'wallpaper', label: 'Đổi\nhình nền', icon: Icons.imageOutline(28), onPress: onChangeWallpaper },
    { key: 'mute', label: 'Tắt\nthông báo', icon: Icons.bellOff(28), onPress: onMute },
  ];

  return (
    <View style={styles.profileCard}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <Avatar
          name={groupName || 'G'}
          uri={avatarUrl || undefined}
          size="xl"
        />
        <TouchableOpacity
          style={styles.avatarCameraBtn}
          onPress={onEditAvatar}
        >
          {Icons.cameraOutline(IconSize.md)}
        </TouchableOpacity>
      </View>

      {/* Group Name */}
      <View style={styles.groupTitleRow}>
        <Text style={styles.groupTitle}>{groupName || 'CNM Nhóm'}</Text>
        <TouchableOpacity onPress={onEditName}>
          {Icons.edit(IconSize.md)}
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsRow}>
        {quickActions.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={styles.quickActionItem}
            onPress={item.onPress}
          >
            <View style={styles.quickActionIcon}>{item.icon}</View>
            <Text style={styles.quickActionLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Description */}
      <TouchableOpacity
        style={styles.descriptionRow}
        onPress={onEditDescription}
      >
        <View style={styles.rowLeft}>
          {Icons.informationCircle(IconSize.xl)}
          <Text style={styles.descriptionMuted}>
            {description || 'Thêm mô tả nhóm'}
          </Text>
        </View>
        {Icons.chevronRight(IconSize.lg)}
      </TouchableOpacity>
    </View>
  );
};
