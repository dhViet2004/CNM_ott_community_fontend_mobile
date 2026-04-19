import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Button, Input } from '@components/common';
import { useAuth } from '../hooks/useAuth';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { login, isLoading, error } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = useCallback(async () => {
    const result = await login(username, password);
    if (!result.success) {
      // Error is already dispatched to Redux; hook returns for optional extra handling
    }
  }, [username, password, login]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>Z</Text>
          </View>
          <Text style={styles.appName}>OTT Community</Text>
          <Text style={styles.slogan}>Kết nối mọi người</Text>
        </View>

        <View style={styles.formSection}>
          <Input
            label="Tên đăng nhập"
            placeholder="Nhập tên đăng nhập"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            size="lg"
            containerStyle={styles.inputContainer}
            error={error && !password ? error : undefined}
          />

          <Input
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            size="lg"
            containerStyle={styles.inputContainer}
            error={error || undefined}
            rightIcon={
              <Text style={styles.showHideText}>
                {showPassword ? '🙈' : '👁'}
              </Text>
            }
            onRightIconPress={() => setShowPassword(!showPassword)}
          />

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
          </TouchableOpacity>

          <Button
            title="Đăng nhập"
            onPress={handleLogin}
            loading={isLoading}
            size="lg"
            fullWidth
            style={styles.loginButton}
          />
        </View>

        <View style={styles.registerSection}>
          <Text style={styles.registerText}>Chưa có tài khoản? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Đăng ký ngay</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: 44,
    color: colors.text.inverse,
    fontWeight: '700',
  },
  appName: {
    ...typography.h1,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  slogan: {
    ...typography.body,
    color: colors.text.secondary,
  },
  formSection: {
    marginBottom: spacing.xxl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  registerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerText: {
    ...typography.body,
    color: colors.text.secondary,
  },
  registerLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  showHideText: {
    fontSize: 16,
  },
});

export default LoginScreen;
