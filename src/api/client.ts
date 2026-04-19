import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
  AxiosResponse,
} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { store } from '@store/store';
import { logout } from '@store/slices/authSlice';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const AUTH_TOKEN_KEY = '@ott_auth_token';
export const REFRESH_TOKEN_KEY = '@ott_refresh_token';

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshComplete = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// ─── Token Storage ────────────────────────────────────────────────────────────

export const setTokens = async (accessToken: string, refreshToken: string) => {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const clearTokens = async () => {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
  await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
};

const handleUnauthorized = async () => {
  if (isRefreshing) return;

  isRefreshing = true;
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      store.dispatch(logout());
      return;
    }

    const response = await axios.post(`${BASE_URL}/auth/refresh`, {
      refresh_token: refreshToken,
    });

    const newAccessToken = response.data?.data?.access_token;
    const newRefreshToken =
      response.data?.data?.refresh_token || refreshToken;

    if (newAccessToken) {
      await setTokens(newAccessToken, newRefreshToken);
      onRefreshComplete(newAccessToken);
    } else {
      store.dispatch(logout());
    }
  } catch {
    await clearTokens();
    store.dispatch(logout());
  } finally {
    isRefreshing = false;
  }
};

// ─── Request Interceptor ─────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!error.response) {
      return Promise.reject({
        message: 'Không có kết nối internet',
        code: 'NETWORK_ERROR',
      });
    }

    if (error.response.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          });
        });
      }

      await handleUnauthorized();
      return Promise.reject({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
