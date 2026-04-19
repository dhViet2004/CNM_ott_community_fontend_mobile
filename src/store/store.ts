import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import contactReducer from './slices/contactSlice';
import groupsReducer from './slices/groupsSlice';
import callReducer from './slices/callSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    contacts: contactReducer,
    groups: groupsReducer,
    call: callReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['call/setZegoCredentials'],
        ignoredPaths: ['call.zegoToken'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
