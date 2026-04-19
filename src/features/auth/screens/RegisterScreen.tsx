import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Button, Input } from '@components/common';
import { useAuth } from '../hooks/useAuth';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
    const { register, isLoading, error } = useAuth();
    const authError: string | undefined = error ?? undefined;

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleRegister = useCallback(async () => {
    if (password !== confirmPassword) {
      return; // useAuth handles this
    }
    await register({
      username,
      password,
      display_name: displayName,
      phone: phoneNumber,
      email: email || undefined,
    });
  }, [username, displayName, email, phoneNumber, password, confirmPassword, register]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Tạo tài khoản</Text>
      <Text style={styles.subtitle}>Đăng ký để bắt đầu kết nối</Text>

      <View style={styles.formSection}>
        <Input
          label="Tên đăng nhập"
          placeholder="3-30 ký tự, không dấu cách"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          size="lg"
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Tên hiển thị"
          placeholder="Họ và tên"
          value={displayName}
          onChangeText={setDisplayName}
          size="lg"
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Email (tùy chọn)"
          placeholder="email@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          size="lg"
          containerStyle={styles.inputContainer}
        />

        <Input
          label="Số điện thoại *"
          placeholder="0xxx xxx xxx"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          size="lg"
          containerStyle={styles.inputContainer}
          error={authError ?? undefined}
        />

        <Input
          label="Mật khẩu"
          placeholder="Tối thiểu 6 ký tự"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          size="lg"
          containerStyle={styles.inputContainer}
          rightIcon={
            <Text style={styles.showHideText}>
              {showPassword ? '🙈' : '👁'}
            </Text>
          }
          onRightIconPress={() => setShowPassword(!showPassword)}
        />

        <Input
          label="Xác nhận mật khẩu"
          placeholder="Nhập lại mật khẩu"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          size="lg"
          containerStyle={styles.inputContainer}
          error={
            confirmPassword && password !== confirmPassword
              ? 'Mật khẩu xác nhận không khớp'
              : authError ?? undefined
          }
        />

        {error && !confirmPassword && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <Button
          title="Đăng ký"
          onPress={handleRegister}
          loading={isLoading}
          size="lg"
          fullWidth
          style={styles.registerButton}
        />
      </View>

      <View style={styles.loginSection}>
        <Text style={styles.loginText}>Đã có tài khoản? </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.loginLink}>Đăng nhập ngay</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
  },
  title: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginBottom: spacing.xxl,
  },
  formSection: {
    marginBottom: spacing.xxl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  registerButton: {
    marginTop: spacing.md,
  },
  loginSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  loginLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  showHideText: {
    fontSize: 16,
  },
  errorText: {
    ...typography.caption,
    color: colors.status.error,
    marginBottom: spacing.md,
  },
});

export default RegisterScreen;
