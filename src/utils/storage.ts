import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  AUTH_TOKEN: '@auth_token',
  USER_DATA: '@user_data',
  THEME_MODE: '@theme_mode',
  SETTINGS: '@settings',
} as const;

export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error(`[Storage] Error setting ${key}:`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error(`[Storage] Error getting ${key}:`, error);
      return null;
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`[Storage] Error removing ${key}:`, error);
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('[Storage] Error clearing storage:', error);
    }
  },
};

export const authStorage = {
  async setToken(token: string): Promise<void> {
    await storage.setItem(KEYS.AUTH_TOKEN, token);
  },
  async getToken(): Promise<string | null> {
    return storage.getItem(KEYS.AUTH_TOKEN);
  },
  async removeToken(): Promise<void> {
    await storage.removeItem(KEYS.AUTH_TOKEN);
  },
};

export default storage;