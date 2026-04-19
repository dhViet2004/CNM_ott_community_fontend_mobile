import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Button, Input } from '@components/common';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'EditProfile'>;

const EditProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('Người dùng Zalo');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      Alert.alert('Thành công', 'Hồ sơ đã được cập nhật', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật hồ sơ');
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
        <Input
          label="Tên hiển thị"
          value={name}
          onChangeText={setName}
          size="lg"
          containerStyle={styles.inputContainer}
        />
        <Input
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Giới thiệu bản thân"
          size="lg"
          multiline
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
  inputContainer: { marginBottom: spacing.lg },
  saveButton: { marginBottom: spacing.md },
});

export default EditProfileScreen;