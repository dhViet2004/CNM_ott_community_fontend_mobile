import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { callApi } from '../api/endpoints';

/**
 * Request permission for FCM push notifications
 */
export async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  return enabled;
}

/**
 * Get FCM token and register with backend
 */
export async function registerDeviceForFCM() {
  try {
    const hasPermission = await requestUserPermission();
    if (!hasPermission) {
      console.log('[FCM] Push permission denied');
      return;
    }

    // Get the device token
    const token = await messaging().getToken();
    console.log('[FCM] Token:', token);

    // Send token to backend
    await callApi('post', '/api/users/me/fcm-token', {
      token,
      platform: Platform.OS,
    });
    console.log('[FCM] Token registered with backend');

    // Listen to whether the token changes
    messaging().onTokenRefresh(async (newToken) => {
      try {
        await callApi('post', '/api/users/me/fcm-token', {
          token: newToken,
          platform: Platform.OS,
        });
      } catch (err) {
        console.error('[FCM] Failed to update refreshed token', err);
      }
    });

  } catch (error) {
    console.error('[FCM] Error registering device', error);
  }
}
