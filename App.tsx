import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { StyleSheet, AppState, AppStateStatus } from 'react-native';
import { store } from '@store/store';
import RootStackNavigator from '@navigation/RootStackNavigator';
import { connectSocket, disconnectSocket } from '@api/socket';
import { getAccessToken } from '@api/client';

const AppContent: React.FC = () => {
  const appState = useRef(AppState.currentState);
  const isConnectedRef = useRef(false);

  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      async (nextAppState: AppStateStatus) => {
        const wasActive =
          appState.current.match(/active|foreground/);
        const isActive = nextAppState.match(/active|foreground/);

        if (wasActive && !isActive) {
          // App went to background → disconnect socket to save battery
          disconnectSocket();
          isConnectedRef.current = false;
        } else if (!wasActive && isActive) {
          // App came to foreground → reconnect socket if logged in
          if (store.getState().auth.isAuthenticated) {
            const token = await getAccessToken();
            if (token) {
              connectSocket(token);
              isConnectedRef.current = true;
            }
          }
        }

        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  // Connect socket when authenticated
  useEffect(() => {
    const unsubscribe = store.subscribe(async () => {
      const state = store.getState();
      if (state.auth.isAuthenticated && !isConnectedRef.current) {
        const token = await getAccessToken();
        if (token) {
          connectSocket(token);
          isConnectedRef.current = true;
        }
      } else if (!state.auth.isAuthenticated && isConnectedRef.current) {
        disconnectSocket();
        isConnectedRef.current = false;
      }
    });

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <RootStackNavigator />
    </NavigationContainer>
  );
};

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Provider store={store}>
          <AppContent />
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
