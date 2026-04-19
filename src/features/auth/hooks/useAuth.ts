import { CommonActions } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  logout as logoutAction,
  updateUser,
  setUser,
  clearError,
} from '@store/slices/authSlice';
import {
  authApi,
  userApi,
} from '@api/endpoints';
import {
  setTokens,
  clearTokens,
} from '@api/client';

const resetToMain = CommonActions.reset({
  index: 0,
  routes: [{ name: 'MainTabs' }],
});

const resetToLogin = CommonActions.reset({
  index: 0,
  routes: [{ name: 'Login' }],
});

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const auth = useAppSelector((state) => state.auth);

  // ─── Boot ──────────────────────────────────────────────────────────────────
  // Gọi khi app khởi động để hydrate auth state từ AsyncStorage
  const hydrateAuth = useCallback(async () => {
    try {
      const accessToken = await import('@api/client').then((m) => m.getAccessToken());
      const refreshToken = await import('@api/client').then((m) => m.getRefreshToken());

      if (accessToken) {
        const user = await userApi.getMe();
        dispatch(setUser(user));
        dispatch(
          loginSuccess({
            user,
            token: accessToken,
            refreshToken: refreshToken || '',
          })
        );
        return true;
      }
    } catch {
      await clearTokens();
    }
    return false;
  }, [dispatch]);

  // ─── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (username: string, password: string) => {
      dispatch(loginStart());
      dispatch(clearError());

      if (!username.trim()) {
        dispatch(loginFailure('Vui lòng nhập tên đăng nhập'));
        return { success: false, error: 'Vui lòng nhập tên đăng nhập' };
      }
      if (!password.trim()) {
        dispatch(loginFailure('Vui lòng nhập mật khẩu'));
        return { success: false, error: 'Vui lòng nhập mật khẩu' };
      }
      if (password.length < 6) {
        dispatch(loginFailure('Mật khẩu phải có ít nhất 6 ký tự'));
        return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
      }

      try {
        const data = await authApi.login(username, password);
        await setTokens(data.access_token, data.refresh_token);

        dispatch(
          loginSuccess({
            user: data.user,
            token: data.access_token,
            refreshToken: data.refresh_token,
          })
        );

        navigation.dispatch(resetToMain);
        return { success: true };
      } catch (err: any) {
        const isNetworkError = err?.code === 'NETWORK_ERROR' || !err?.response;
        const message = isNetworkError
          ? 'Không có kết nối internet'
          : err?.response?.data?.message || err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
        dispatch(loginFailure(message));
        return { success: false, error: message };
      }
    },
    [dispatch, navigation]
  );

  // ─── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(
    async (params: {
      username: string;
      password: string;
      display_name: string;
      phone: string; // Backend requires phone
      email?: string;
    }) => {
      dispatch(registerStart());

      if (!params.username.trim()) {
        dispatch(registerFailure('Vui lòng nhập tên đăng nhập'));
        return { success: false, error: 'Vui lòng nhập tên đăng nhập' };
      }
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(params.username)) {
        dispatch(
          registerFailure(
            'Tên đăng nhập: 3-30 ký tự, chỉ chữ cái, số và dấu gạch dưới'
          )
        );
        return { success: false, error: 'Tên đăng nhập không hợp lệ' };
      }
      if (!params.password.trim()) {
        dispatch(registerFailure('Vui lòng nhập mật khẩu'));
        return { success: false, error: 'Vui lòng nhập mật khẩu' };
      }
      if (params.password.length < 6) {
        dispatch(registerFailure('Mật khẩu phải có ít nhất 6 ký tự'));
        return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự' };
      }
      if (!params.phone.trim()) {
        dispatch(registerFailure('Vui lòng nhập số điện thoại'));
        return { success: false, error: 'Vui lòng nhập số điện thoại' };
      }
      // Backend expects phone number format: 0xxx xxx xxx
      if (!/^0[3-9]\d{8}$/.test(params.phone.trim())) {
        dispatch(
          registerFailure('Số điện thoại không hợp lệ (VD: 0912345678)')
        );
        return { success: false, error: 'Số điện thoại không hợp lệ' };
      }
      if (!params.display_name.trim()) {
        dispatch(registerFailure('Vui lòng nhập tên hiển thị'));
        return { success: false, error: 'Vui lòng nhập tên hiển thị' };
      }

      try {
        // Backend expects: username, password, display_name, phone_number, email
        await authApi.register({
          username: params.username.trim(),
          password: params.password,
          display_name: params.display_name.trim(),
          phone_number: params.phone.trim() || undefined,
          email: params.email || undefined,
        });
        dispatch(registerSuccess());

        Alert.alert(
          'Đăng ký thành công',
          'Tài khoản đã được tạo. Vui lòng đăng nhập.',
          [{ text: 'OK', onPress: () => navigation.dispatch(resetToLogin) }]
        );
        return { success: true };
      } catch (err: any) {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Đăng ký thất bại. Vui lòng thử lại.';
        dispatch(registerFailure(message));
        return { success: false, error: message };
      }
    },
    [dispatch, navigation]
  );

  // ─── Update Profile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(
    async (data: {
      display_name?: string;
      email?: string;
      phone_number?: string;
      avatar_url?: string;
    }) => {
      try {
        const updated = await userApi.updateProfile(data);
        dispatch(updateUser(updated));
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: err?.response?.data?.message || 'Cập nhật thất bại',
        };
      }
    },
    [dispatch]
  );

  // ─── Change Password ────────────────────────────────────────────────────────
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!currentPassword) {
        return { success: false, error: 'Vui lòng nhập mật khẩu hiện tại' };
      }
      // Backend requires: min 8 chars, uppercase, lowercase, number
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(newPassword)) {
        return {
          success: false,
          error: 'Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số',
        };
      }
      try {
        await userApi.changePassword(currentPassword, newPassword);
        return { success: true };
      } catch (err: any) {
        return {
          success: false,
          error: err?.response?.data?.message || 'Đổi mật khẩu thất bại',
        };
      }
    },
    []
  );

  // ─── Logout ────────────────────────────────────────────────────────────────
  const performLogout = useCallback(async () => {
    await clearTokens();
    dispatch(logoutAction());
    navigation.dispatch(resetToLogin);
  }, [dispatch, navigation]);

  return {
    // State
    user: auth.user,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    isRegistering: auth.isRegistering,

    // Actions
    hydrateAuth,
    login,
    register,
    updateProfile,
    changePassword,
    logout: performLogout,
  };
};
