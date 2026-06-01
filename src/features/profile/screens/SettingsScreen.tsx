import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '@theme';
import { Button, Input, Icons, IconSize } from '@components/common';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@navigation/types';
import { useAppSelector, useAppDispatch } from '@store/hooks';
import { updateUser } from '@store/slices/authSlice';
import { userApi } from '@api/endpoints';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);

  // Modal States
  const [modalType, setModalType] = useState<'email' | 'phone' | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOpenModal = (type: 'email' | 'phone') => {
    setModalType(type);
    setInputValue(type === 'email' ? currentUser?.email || '' : currentUser?.phone_number || '');
    setOtpCode('');
    setOtpSent(false);
    setCountdown(0);
    setModalVisible(true);
  };

  const handleSendOTP = async () => {
    if (!inputValue.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập thông tin');
      return;
    }
    setLoading(true);
    try {
      if (modalType === 'email') {
        await userApi.sendEmailOTP(inputValue.trim());
      } else {
        await userApi.sendPhoneOTP(inputValue.trim());
      }
      setOtpSent(true);
      setCountdown(60);
      Alert.alert('Thành công', 'Đã gửi mã OTP đến thông tin của bạn. Vui lòng kiểm tra hộp thư hoặc giao diện console của server.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Không thể gửi mã OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập mã OTP');
      return;
    }
    setLoading(true);
    try {
      if (modalType === 'email') {
        await userApi.confirmEmailOTP(inputValue.trim(), otpCode.trim());
      } else {
        await userApi.confirmPhoneOTP(inputValue.trim(), otpCode.trim());
      }
      
      // Verification successful, fetch fresh user data
      const freshUser = await userApi.getMe();
      dispatch(updateUser(freshUser));
      
      setModalVisible(false);
      Alert.alert('Thành công', `Xác thực ${modalType === 'email' ? 'email' : 'số điện thoại'} thành công!`);
    } catch (err: any) {
      Alert.alert('Lỗi', err?.response?.data?.message || 'Mã OTP không chính xác');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Tài khoản & Bảo mật</Text>

      {/* Account Verification Section */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Thông tin định danh</Text>

        {/* Email */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Email</Text>
            {currentUser?.email ? (
              <Text style={styles.rowVal}>{currentUser.email}</Text>
            ) : (
              <Text style={styles.rowValEmpty}>Chưa thiết lập email</Text>
            )}
          </View>
          {currentUser?.email_verified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Đã xác minh</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.verifyBtn}
              onPress={() => handleOpenModal('email')}
            >
              <Text style={styles.verifyBtnText}>Xác thực</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Phone */}
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Số điện thoại</Text>
            {currentUser?.phone_number ? (
              <Text style={styles.rowVal}>{currentUser.phone_number}</Text>
            ) : (
              <Text style={styles.rowValEmpty}>Chưa thiết lập số điện thoại</Text>
            )}
          </View>
          {currentUser?.phone_verified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Đã xác minh</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.verifyBtn}
              onPress={() => handleOpenModal('phone')}
            >
              <Text style={styles.verifyBtnText}>Xác thực</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Security Actions */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Mật khẩu & Bảo mật</Text>
        
        <TouchableOpacity 
          style={styles.actionRow}
          onPress={() => navigation.navigate('ChangePassword')}
        >
          <View style={styles.actionLeft}>
            <Text style={styles.actionLabel}>Đổi mật khẩu</Text>
            <Text style={styles.actionSub}>Thay đổi định kỳ để tăng tính bảo mật</Text>
          </View>
          {Icons.chevronRight(IconSize.lg, colors.text.tertiary)}
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>Phiên bản 1.0.0</Text>

      {/* Verification Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBg}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Xác thực {modalType === 'email' ? 'Email' : 'Số điện thoại'}
            </Text>

            <Input
              label={modalType === 'email' ? 'Địa chỉ Email' : 'Số điện thoại'}
              placeholder={modalType === 'email' ? 'example@email.com' : 'Nhập số điện thoại'}
              value={inputValue}
              onChangeText={setInputValue}
              editable={!otpSent}
              autoCapitalize="none"
              size="lg"
              containerStyle={styles.modalInput}
            />

            {otpSent && (
              <Input
                label="Nhập mã OTP"
                placeholder="Nhập mã OTP 6 chữ số"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                size="lg"
                containerStyle={styles.modalInput}
              />
            )}

            <View style={styles.modalActions}>
              {!otpSent ? (
                <Button
                  title="Gửi mã OTP"
                  onPress={handleSendOTP}
                  loading={loading}
                  fullWidth
                  style={styles.modalBtn}
                />
              ) : (
                <>
                  <Button
                    title="Xác nhận"
                    onPress={handleVerifyOTP}
                    loading={loading}
                    fullWidth
                    style={styles.modalBtn}
                  />
                  <TouchableOpacity 
                    disabled={countdown > 0} 
                    onPress={handleSendOTP}
                    style={styles.resendBtn}
                  >
                    <Text style={[styles.resendBtnText, countdown > 0 && { color: colors.text.tertiary }]}>
                      {countdown > 0 ? `Gửi lại sau (${countdown}s)` : 'Gửi lại mã OTP'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              <Button
                title="Hủy bỏ"
                variant="ghost"
                onPress={() => setModalVisible(false)}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    padding: spacing.screenPadding,
    paddingTop: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.xl,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionHeader: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: 'bold',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  rowLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  rowLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  rowVal: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '500',
  },
  rowValEmpty: {
    ...typography.body,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  verifiedBadge: {
    backgroundColor: '#E6F9F0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 1,
    borderColor: '#A3E2C9',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  verifyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: spacing.borderRadius.md,
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  actionLeft: {
    flex: 1,
  },
  actionLabel: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  actionSub: {
    ...typography.bodySmall,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  footerText: {
    ...typography.caption,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.screenPadding,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.xl,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalInput: {
    marginBottom: spacing.lg,
  },
  modalActions: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  modalBtn: {
    marginBottom: spacing.xs,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  resendBtnText: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: 'bold',
  },
});

export default SettingsScreen;
