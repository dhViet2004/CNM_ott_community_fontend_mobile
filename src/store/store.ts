import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import chatReducer from './slices/chatSlice';
import contactReducer from './slices/contactSlice';
import groupsReducer from './slices/groupsSlice';
import callReducer from './slices/callSlice';
import groupCallReducer from './slices/groupCallSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    contacts: contactReducer,
    groups: groupsReducer,
    call: callReducer,
    groupCall: groupCallReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['call/setAgoraCredentials'],
        ignoredPaths: ['call.agoraToken'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
