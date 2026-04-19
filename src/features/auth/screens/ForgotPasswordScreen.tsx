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
import { userApi } from '@api/endpoints';
import type { RootStackScreenProps } from '@navigation/types';

type Props = RootStackScreenProps<'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOtp = useCallback(async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Vui lòng nhập email hợp lệ');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await userApi.sendResetOTP(email);
      setStep('otp');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể gửi OTP. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length !== 6) {
      setError('OTP gồm 6 chữ số');
      return;
    }
    setStep('password');
  }, [otp]);

  const handleResetPassword = useCallback(async () => {
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Mật khẩu phải có ít nhất 1 chữ hoa');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setError('Mật khẩu phải có ít nhất 1 chữ thường');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setError('Mật khẩu phải có ít nhất 1 chữ số');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await userApi.resetPassword({
        identifier: email,
        type: 'email',
        otp,
        newPassword,
      });
      navigation.replace('Login');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể đặt lại mật khẩu');
    } finally {
      setLoading(false);
    }
  }, [email, otp, newPassword, confirmPassword, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Quên mật khẩu</Text>
        <Text style={styles.subtitle}>
          {step === 'email'
            ? 'Nhập email đã đăng ký để nhận mã OTP'
            : step === 'otp'
            ? 'Nhập mã OTP đã được gửi đến email'
            : 'Nhập mật khẩu mới'}
        </Text>

        {step === 'email' && (
          <View style={styles.formSection}>
            <Input
              label="Email"
              placeholder="email@example.com"
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              size="lg"
              containerStyle={styles.inputContainer}
              error={error}
            />
            <Button
              title="Gửi mã OTP"
              onPress={handleSendOtp}
              loading={loading}
              size="lg"
              fullWidth
              style={styles.actionButton}
            />
          </View>
        )}

        {step === 'otp' && (
          <View style={styles.formSection}>
            <Input
              label="Mã OTP"
              placeholder="______"
              value={otp}
              onChangeText={(text) => { setOtp(text.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              keyboardType="number-pad"
              size="lg"
              containerStyle={styles.inputContainer}
              error={error}
            />
            <Button
              title="Xác nhận"
              onPress={handleVerifyOtp}
              loading={loading}
              size="lg"
              fullWidth
              style={styles.actionButton}
            />
            <TouchableOpacity onPress={handleSendOtp} style={styles.resendButton}>
              <Text style={styles.resendText}>Gửi lại mã OTP</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'password' && (
          <View style={styles.formSection}>
            <Input
              label="Mật khẩu mới"
              placeholder="Tối thiểu 6 ký tự"
              value={newPassword}
              onChangeText={(text) => { setNewPassword(text); setError(''); }}
              secureTextEntry
              size="lg"
              containerStyle={styles.inputContainer}
            />
            <Input
              label="Xác nhận mật khẩu mới"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChangeText={(text) => { setConfirmPassword(text); setError(''); }}
              secureTextEntry
              size="lg"
              containerStyle={styles.inputContainer}
              error={error}
            />
            <Button
              title="Đặt lại mật khẩu"
              onPress={handleResetPassword}
              loading={loading}
              size="lg"
              fullWidth
              style={styles.actionButton}
            />
          </View>
        )}

        <View style={styles.backSection}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Quay lại đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  content: { paddingHorizontal: spacing.screenPadding, flexGrow: 1 },
  title: { ...typography.h1, color: colors.text.primary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.xxl },
  formSection: { marginBottom: spacing.xxl },
  inputContainer: { marginBottom: spacing.lg },
  actionButton: { marginTop: spacing.md },
  resendButton: { alignSelf: 'center', marginTop: spacing.lg },
  resendText: { ...typography.bodySmall, color: colors.primary, fontWeight: '500' },
  backSection: { alignItems: 'center', marginTop: 'auto' },
  backText: { ...typography.body, color: colors.primary, fontWeight: '500' },
});

export default ForgotPasswordScreen;
