import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';

interface OtpPending {
  type: 'email' | 'phone';
  target: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isFirstLaunch: boolean;
  // Extra states from web frontend
  isRegistering: boolean;
  otpPending: OtpPending | null;
  isOtpLoading: boolean;
  otpError: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isFirstLaunch: true,
  isRegistering: false,
  otpPending: null,
  isOtpLoading: false,
  otpError: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // ─── Login ──────────────────────────────────────────────────────────────
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess(
      state,
      action: PayloadAction<{
        user: User;
        token: string;
        refreshToken: string;
      }>
    ) {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.error = null;
    },
    loginFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },

    // ─── Register ─────────────────────────────────────────────────────────
    registerStart(state) {
      state.isLoading = true;
      state.error = null;
      state.isRegistering = true;
    },
    registerSuccess(state) {
      state.isLoading = false;
      state.isRegistering = false;
      state.error = null;
    },
    registerFailure(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.isRegistering = false;
      state.error = action.payload;
    },

    // ─── OTP ───────────────────────────────────────────────────────────────
    otpSendStart(state) {
      state.isOtpLoading = true;
      state.otpError = null;
    },
    otpSendSuccess(state, action: PayloadAction<OtpPending>) {
      state.isOtpLoading = false;
      state.otpPending = action.payload;
      state.otpError = null;
    },
    otpSendFailure(state, action: PayloadAction<string>) {
      state.isOtpLoading = false;
      state.otpError = action.payload;
    },
    otpConfirmSuccess(state) {
      state.isOtpLoading = false;
      state.otpPending = null;
      state.otpError = null;
    },
    otpConfirmFailure(state, action: PayloadAction<string>) {
      state.isOtpLoading = false;
      state.otpError = action.payload;
    },
    clearOtpPending(state) {
      state.otpPending = null;
      state.otpError = null;
    },

    // ─── Token Refresh ────────────────────────────────────────────────────
    refreshTokenSuccess(
      state,
      action: PayloadAction<{ token: string; refreshToken?: string }>
    ) {
      state.token = action.payload.token;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
    },

    // ─── User ──────────────────────────────────────────────────────────────
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isRegistering = false;
      state.otpPending = null;
      state.otpError = null;
    },
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isAuthenticated = true;
    },

    // ─── Misc ─────────────────────────────────────────────────────────────
    setFirstLaunch(state, action: PayloadAction<boolean>) {
      state.isFirstLaunch = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
    setRegistering(state, action: PayloadAction<boolean>) {
      state.isRegistering = action.payload;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  otpSendStart,
  otpSendSuccess,
  otpSendFailure,
  otpConfirmSuccess,
  otpConfirmFailure,
  clearOtpPending,
  refreshTokenSuccess,
  logout,
  updateUser,
  setUser,
  setFirstLaunch,
  clearError,
  setRegistering,
} = authSlice.actions;

export default authSlice.reducer;
