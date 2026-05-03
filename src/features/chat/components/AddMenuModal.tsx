import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Pressable,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, shadows, typography } from '@theme';
import { Icons, IconSize } from '@components/common';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

interface MenuItemDef {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  isLast?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const AddMenuModal: React.FC<AddMenuModalProps> = ({ visible, onClose }) => {
  const navigation = useNavigation<any>();

  const handleAddFriend = () => {
    onClose();
    navigation.navigate('ContactsList');
  };

  const handleCreateGroup = () => {
    onClose();
    navigation.navigate('CreateGroup');
  };

  const handleUnderConstruction = (feature: string) => () => {
    onClose();
    Alert.alert('Thông báo', `Tính năng "${feature}" đang được phát triển`);
  };

  const menuItems: MenuItemDef[] = [
    {
      label: 'Thêm bạn',
      icon: Icons.personAdd(IconSize.md, '#FFFFFF'),
      onPress: handleAddFriend,
    },
    {
      label: 'Tạo nhóm',
      icon: Icons.peopleOutline(IconSize.md, '#FFFFFF'),
      onPress: handleCreateGroup,
    },
    {
      label: 'My Documents',
      icon: Icons.folderOutline(IconSize.md, '#FFFFFF'),
      onPress: handleUnderConstruction('My Documents'),
    },
    {
      label: 'Lịch Zalo',
      icon: Icons.calendar(IconSize.md, colors.text.secondary),
      onPress: handleUnderConstruction('Lịch Zalo'),
    },
    {
      label: 'Tạo cuộc gọi nhóm',
      icon: Icons.videocam(IconSize.md, colors.text.secondary),
      onPress: handleUnderConstruction('Tạo cuộc gọi nhóm'),
    },
    {
      label: 'Thiết bị đăng nhập',
      icon: Icons.phonePortrait(IconSize.md, '#FFFFFF'),
      onPress: handleUnderConstruction('Thiết bị đăng nhập'),
      isLast: true,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menuContainer}>
              {/* Tooltip Arrow */}
              <View style={styles.tooltipArrow} />

              {menuItems.map((item, index) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [
                    styles.menuItem,
                    !item.isLast && styles.menuItemBorder,
                    pressed && styles.menuItemPressed,
                  ]}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>{item.icon}</View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  {index === menuItems.length - 1 && (
                    <View style={styles.menuItemRight} />
                  )}
                </Pressable>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const MENU_WIDTH = 220;
const MENU_TOP_OFFSET = 100;
const MENU_RIGHT_OFFSET = 10;
const TOOLTIP_SIZE = 12;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },

  menuContainer: {
    position: 'absolute',
    top: MENU_TOP_OFFSET,
    right: MENU_RIGHT_OFFSET,
    width: MENU_WIDTH,
    backgroundColor: colors.background.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.xs,
    ...shadows.md,
  },

  tooltipArrow: {
    position: 'absolute',
    top: -TOOLTIP_SIZE / 2,
    right: 20,
    width: TOOLTIP_SIZE,
    height: TOOLTIP_SIZE,
    backgroundColor: colors.background.primary,
    transform: [{ rotate: '45deg' }],
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },

  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
  },

  menuItemPressed: {
    backgroundColor: colors.background.secondary,
  },

  menuItemLeft: {
    width: 28,
    alignItems: 'center',
  },

  menuItemText: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    fontSize: 15,
    marginLeft: spacing.sm,
  },

  menuItemRight: {
    width: 28,
    alignItems: 'flex-end',
  },
});

export default AddMenuModal;
