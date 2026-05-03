import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Icons, IconSize, Avatar } from '@components/common';
import { friendsApi, userApi, uploadApi, messageApi } from '@api/endpoints';
import { socketActions } from '@api/socket';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { setFriends } from '@store/slices/chatSlice';
import * as ImagePicker from 'expo-image-picker';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'ChatSettings'>;

const BG_PRESETS = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800', // Replaced broken one
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800',
];

const ZALO_BLUE = '#008AF3';

const ChatSettingsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, friendshipId, friendId, title, avatarUrl, originalName } = route.params;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const friends = useAppSelector((state) => state.chat.friends);
  const authUser = useAppSelector((state) => state.auth.user);

  const [nickname, setNickname] = useState('');
  const [isNicknameModalVisible, setIsNicknameModalVisible] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isSavingNickname, setIsSavingNickname] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [isLoadingBg, setIsLoadingBg] = useState(false);

  // Get missing info from friends list
  const currentFriendshipId = friendshipId || friends?.find(f => 
    String(f.friend_id || f.userId || f.friendId) === String(friendId)
  )?.friendshipId;
  
  const currentAvatarUrl = avatarUrl || friends?.find(f => 
    String(f.friend_id || f.userId || f.friendId) === String(friendId)
  )?.avatar_url || friends?.find(f => 
    String(f.friend_id || f.userId || f.friendId) === String(friendId)
  )?.friend_avatar_url;

  useEffect(() => {
    if (currentFriendshipId) {
      loadChatBackground(currentFriendshipId);
      const friend = friends.find((f) => f.friendshipId === currentFriendshipId);
      if (friend) {
        setNickname(friend.friend_display_name || friend.display_name || '');
      }
    }
  }, [currentFriendshipId, friends]);

  const loadChatBackground = async (fid: string) => {
    try {
      const res = await friendsApi.getChatBackground(fid);
      setBgUrl(res.chatBgUrl);
    } catch (err) {
      console.error('Failed to load chat background:', err);
    }
  };

  const handleUpdateNickname = async () => {
    if (!currentFriendshipId || !newNickname.trim()) return;
    setIsSavingNickname(true);
    try {
      await friendsApi.updateNickname({ 
        friendshipId: currentFriendshipId, 
        nickname: newNickname.trim() 
      });
      
      // Update local state
      const updatedFriends = friends.map((f) => {
        if (f.friendshipId === currentFriendshipId) {
          return { ...f, friend_display_name: newNickname.trim() };
        }
        return f;
      });
      dispatch(setFriends(updatedFriends));
      setNickname(newNickname.trim());
      setIsNicknameModalVisible(false);
      Alert.alert('Thành công', 'Đã cập nhật tên gợi nhớ');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể cập nhật tên gợi nhớ');
    } finally {
      setIsSavingNickname(false);
    }
  };

  const handleSelectBackground = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Vui lòng cho phép truy cập thư viện ảnh để đổi hình nền');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadBackground(result.assets[0].uri);
    }
  };

  const uploadBackground = async (uri: string, isPreset = false) => {
    if (!currentFriendshipId) return;
    setIsLoadingBg(true);
    try {
      let finalUrl = uri;
      if (!isPreset && uri) {
        const fileName = uri.split('/').pop() || 'background.jpg';
        const uploadRes = await uploadApi.uploadDirect(
          { uri, name: fileName, type: 'image/jpeg' },
          'chat-backgrounds'
        );
        finalUrl = uploadRes.file_url;
      }
      await friendsApi.updateChatBackground({
        friendshipId: currentFriendshipId,
        bgUrl: finalUrl,
        bothSides: true,
      });
      setBgUrl(finalUrl || null);
      
      // Emit socket event for real-time sync
      if (friendId) {
        socketActions.updateChatBackground(currentFriendshipId || '', finalUrl || null, friendId);
        
        // Send system message to chat
        try {
          const senderName = authUser?.display_name || authUser?.displayName || 'Ai đó';
          await messageApi.sendMessage(conversationId, `${senderName} hình nền đã được thay đổi`, authUser?.userId || '', 'system');
        } catch (msgErr) {
          console.error('Failed to send background change message:', msgErr);
        }
      }
      
      Alert.alert('Thành công', uri ? 'Đã cập nhật hình nền cuộc trò chuyện' : 'Đã xóa hình nền');
    } catch (err) {
      console.error('Failed to update background:', err);
      Alert.alert('Lỗi', 'Không thể cập nhật hình nền');
    } finally {
      setIsLoadingBg(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Xóa lịch sử',
      'Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => Alert.alert('Thông báo', 'Tính năng đang phát triển') },
      ]
    );
  };

  const renderOption = (icon: React.ReactNode, label: string, onPress: () => void, rightElement?: React.ReactNode) => (
    <TouchableOpacity style={styles.optionItem} onPress={onPress} disabled={!!rightElement && !onPress}>
      <View style={styles.optionIcon}>{icon}</View>
      <Text style={styles.optionLabel}>{label}</Text>
      {rightElement ? rightElement : Icons.chevronRight(IconSize.sm, colors.text.tertiary)}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Zalo-style header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            {Icons.back(IconSize.lg, colors.text.inverse)}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tùy chọn</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileSection}>
          <Avatar
            uri={currentAvatarUrl ?? undefined}
            name={nickname || title}
            size="xl"
            onPress={() => {
              if (friendId) {
                Alert.alert('Thông báo', 'Bạn không thể thay đổi ảnh đại diện của người khác');
              } else {
                // Logic for group avatar change
                Alert.alert('Thông báo', 'Tính năng đổi ảnh đại diện nhóm đang được phát triển');
              }
            }}
          />
          <Text style={styles.name}>{nickname || title}</Text>
          {(nickname !== '' || title !== originalName) && originalName && (
            <Text style={styles.originalName}>Tên gốc: {originalName}</Text>
          )}

          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}>
              <View style={styles.quickActionIcon}>{Icons.search(IconSize.md, colors.text.primary)}</View>
              <Text style={styles.quickActionLabel}>Tìm tin nhắn</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickActionItem} 
              onPress={() => friendId ? navigation.navigate('UserProfile', { userId: friendId }) : null}
            >
              <View style={styles.quickActionIcon}>{Icons.person(IconSize.md)}</View>
              <Text style={styles.quickActionLabel}>Trang cá nhân</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem} onPress={handleSelectBackground}>
              <View style={styles.quickActionIcon}>{Icons.image(IconSize.md)}</View>
              <Text style={styles.quickActionLabel}>Đổi hình nền</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => setIsMuted(!isMuted)}>
              <View style={styles.quickActionIcon}>
                {isMuted ? Icons.bellOff(IconSize.md) : Icons.bell(IconSize.md)}
              </View>
              <Text style={styles.quickActionLabel}>{isMuted ? 'Bật thông báo' : 'Tắt thông báo'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          {renderOption(
            Icons.edit(IconSize.md, colors.text.secondary),
            'Đổi tên gợi nhớ',
            () => {
              setNewNickname(nickname);
              setIsNicknameModalVisible(true);
            }
          )}
          {renderOption(
            Icons.starOutline(IconSize.md, colors.text.secondary),
            'Đánh dấu bạn thân',
            () => {},
            <Switch value={false} onValueChange={() => {}} />
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Hình nền trò chuyện</Text>
            <TouchableOpacity onPress={handleSelectBackground}>
              <Text style={styles.sectionAction}>Chọn từ máy</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgPresets}>
            {BG_PRESETS.map((url, index) => (
              <TouchableOpacity 
                key={index} 
                onPress={() => uploadBackground(url, true)}
                style={[styles.bgPresetItem, bgUrl === url && styles.bgPresetActive]}
              >
                <Image source={{ uri: url }} style={styles.bgPresetImage} />
                {bgUrl === url && (
                  <View style={styles.bgPresetCheck}>
                    {Icons.check(16, colors.text.inverse)}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          {bgUrl && (
            <TouchableOpacity 
              style={styles.removeBgBtn} 
              onPress={() => uploadBackground('', false)}
            >
              <Text style={styles.removeBgText}>Xóa hình nền hiện tại</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          {renderOption(
            Icons.pin(IconSize.md, colors.text.secondary),
            'Ghim trò chuyện',
            () => {},
            <Switch value={isPinned} onValueChange={setIsPinned} />
          )}
          {renderOption(
            Icons.eyeOff(IconSize.md, colors.text.secondary),
            'Ẩn trò chuyện',
            () => {},
            <Switch value={isHidden} onValueChange={setIsHidden} />
          )}
        </View>

        <View style={styles.section}>
          {renderOption(
            Icons.trash(IconSize.md, colors.status.error),
            'Xóa lịch sử trò chuyện',
            handleClearHistory
          )}
          {renderOption(
            Icons.alertCircle(IconSize.md, colors.status.error),
            'Báo xấu',
            () => Alert.alert('Thông báo', 'Tính năng đang phát triển')
          )}
        </View>
      </ScrollView>

      <Modal
        visible={isNicknameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsNicknameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Đổi tên gợi nhớ</Text>
            <Text style={styles.modalSubtitle}>Tên này sẽ chỉ hiển thị với bạn</Text>
            <TextInput
              style={styles.modalInput}
              value={newNickname}
              onChangeText={setNewNickname}
              placeholder="Nhập tên gợi nhớ"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsNicknameModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateNickname}
                disabled={isSavingNickname}
              >
                {isSavingNickname ? (
                  <ActivityIndicator color={colors.text.inverse} size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isLoadingBg && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Đang cập nhật hình nền...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    backgroundColor: ZALO_BLUE,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 2,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  content: {
    paddingBottom: spacing.xl,
  },
  profileSection: {
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.text.primary,
    fontWeight: '700',
  },
  originalName: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  quickActionItem: {
    alignItems: 'center',
    width: '22%',
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  quickActionLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.background.primary,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: colors.border.light,
    borderBottomColor: colors.border.light,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  optionIcon: {
    width: 32,
    marginRight: spacing.md,
  },
  optionLabel: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
  },
  modalTitle: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  modalInput: {
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: spacing.sm,
    ...typography.body,
    marginBottom: spacing.xl,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.md,
    marginLeft: spacing.md,
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  // Background Presets Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.secondary,
  },
  sectionAction: {
    ...typography.button,
    color: colors.primary,
    fontSize: 14,
  },
  bgPresets: {
    paddingVertical: spacing.xs,
  },
  bgPresetItem: {
    width: 60,
    height: 90,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  bgPresetActive: {
    borderColor: colors.primary,
  },
  bgPresetImage: {
    width: '100%',
    height: '100%',
  },
  bgPresetCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 2,
  },
  removeBgBtn: {
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    alignItems: 'center',
  },
  removeBgText: {
    ...typography.button,
    color: '#FF6B6B',
  },
});

export default ChatSettingsScreen;
