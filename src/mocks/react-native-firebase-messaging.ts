const mockMessaging = () => ({
  setBackgroundMessageHandler: async (callback: any) => {
    console.log('[FCM Mock] setBackgroundMessageHandler registered');
  },
  requestPermission: async () => {
    console.log('[FCM Mock] requestPermission called');
    return 1; // 1 = Authorized
  },
  getToken: async () => {
    console.log('[FCM Mock] getToken called');
    return 'mock-device-fcm-token-123456';
  },
  onTokenRefresh: (callback: (token: string) => void) => {
    console.log('[FCM Mock] onTokenRefresh registered');
    return () => {
      console.log('[FCM Mock] onTokenRefresh unsubscribed');
    };
  },
});

mockMessaging.AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export default mockMessaging;
