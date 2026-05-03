import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Button, Input } from '@components/common';
import { userApi } from '@api/endpoints';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'ChangePassword'>;

const ChangePasswordScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await userApi.changePassword({
        oldPassword,
        newPassword,
      });
      Alert.alert('Thành công', 'Mật khẩu đã được thay đổi', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Mật khẩu hiện tại"
          value={oldPassword}
          onChangeText={setOldPassword}
          secureTextEntry
          size="lg"
          containerStyle={styles.inputContainer}
        />
        <Input
          label="Mật khẩu mới"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          size="lg"
          containerStyle={styles.inputContainer}
        />
        <Input
          label="Xác nhận mật khẩu mới"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          size="lg"
          containerStyle={styles.inputContainer}
          error={error}
        />
        <Button
          title="Đổi mật khẩu"
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
    </KeyboardAvoidingView>
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
  content: { padding: spacing.screenPadding, paddingTop: spacing.xl },
  inputContainer: { marginBottom: spacing.lg },
  saveButton: { marginTop: spacing.lg, marginBottom: spacing.md },
});

export default ChangePasswordScreen;
