import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { updateUser } from '@store/slices/authSlice';
import { userApi, uploadApi } from '@api/endpoints';
import { colors, spacing, typography } from '@theme';
import { Button, Input, Avatar } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';
import { resolveUrl } from '@/utils/url';
import { useEffect } from 'react';

type Props = RootStackScreenProps<'EditProfile'>;

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  const [name, setName] = useState(currentUser?.display_name ?? '');
  const [avatarUri, setAvatarUri] = useState(currentUser?.avatar_url ?? '');
  
  useEffect(() => {
    const resolve = async () => {
      if (currentUser?.avatar_url) {
        const resolved = await resolveUrl(currentUser.avatar_url);
        if (resolved) setAvatarUri(resolved);
      }
    };
    resolve();
  }, [currentUser?.avatar_url]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để đổi avatar');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Tên hiển thị không được để trống');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let finalAvatarUrl = currentUser?.avatar_url || '';

      // Upload new avatar if picked from local
      if (avatarUri && avatarUri !== currentUser?.avatar_url) {
        const fileName = avatarUri.split('/').pop() || 'avatar.jpg';
        const uploadRes = await uploadApi.uploadDirect(
          { uri: avatarUri, name: fileName, type: 'image/jpeg' },
          'avatars'
        );
        finalAvatarUrl = uploadRes.url;
      }

      const updated = await userApi.updateProfile({
        display_name: name.trim(),
        avatar_url: finalAvatarUrl || undefined,
      });
      dispatch(updateUser(updated));
      Alert.alert('Thành công', 'Hồ sơ đã được cập nhật', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể cập nhật hồ sơ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Chỉnh sửa trang cá nhân</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.avatarSection}>
          <Avatar
            uri={avatarUri}
            name={name}
            size="xl"
            onPress={handlePickImage}
          />
          <Text style={styles.changeAvatarText} onPress={handlePickImage}>
            Thay đổi ảnh đại diện
          </Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Input
          label="Tên hiển thị"
          value={name}
          onChangeText={setName}
          size="lg"
          containerStyle={styles.inputContainer}
        />
        <Button
          title="Lưu thay đổi"
          onPress={handleSave}
          loading={loading}
          fullWidth
          style={styles.saveButton}
        />
        <Button
          title="Hủy"
          variant="ghost"
          onPress={() => navigation.goBack()}
          fullWidth
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingBottom: spacing.lg,
  },
  headerTitle: { ...typography.h3, color: colors.text.inverse },
  content: { padding: spacing.screenPadding },
  avatarSection: {
    alignItems: 'center',
    marginVertical: spacing.xl,
    gap: spacing.sm,
  },
  changeAvatarText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
  },
  inputContainer: { marginBottom: spacing.lg },
  saveButton: { marginBottom: spacing.md },
  errorText: {
    color: colors.status.error,
    marginBottom: spacing.md,
    textAlign: 'center',
    ...typography.bodySmall,
  },
});

export default EditProfileScreen;