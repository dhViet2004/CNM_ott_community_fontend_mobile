# Zalo Clone - React Native App

Dự án clone ứng dụng Zalo sử dụng React Native (Expo) với Feature-based Architecture.

## Mục lục

- [Cài đặt](#cài-đặt)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Quy tắc đặt tên](#quy-tắc-đặt-tên)
- [Quy tắc phát triển](#quy-tắc-phát-triển)
- [Absolute Path](#absolute-path)
- [UI Components](#ui-components)
- [Navigation](#navigation)
- [API & Store](#api--store)
- [Chạy project](#chạy-project)

---

## Cài đặt

```bash
# Cài đặt dependencies
npm install

# Chạy development server
npm start
```

## Cấu trúc thư mục

```
CNM_ott_community_fontend_mobile/
├── src/
│   ├── api/                     # Axios client & API endpoints
│   │   ├── client.ts
│   │   ├── endpoints.ts
│   │   └── index.ts
│   │
│   ├── components/             # UI components
│   │   ├── common/              # Components dùng chung
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Avatar.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── AppText.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── MessageListItem.tsx
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── features/               # Feature modules
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── store/
│   │   │
│   │   ├── chat/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   ├── store/
│   │   │   └── data/           # Mock data
│   │   │
│   │   ├── contacts/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── store/
│   │   │
│   │   ├── profile/
│   │   │   ├── components/
│   │   │   ├── screens/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── store/
│   │   │
│   │   └── explore/
│   │       └── screens/
│   │
│   ├── navigation/              # React Navigation
│   │   ├── RootStackNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── store/                   # Redux Toolkit
│   │   ├── store.ts
│   │   ├── hooks.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── chatSlice.ts
│   │       └── contactSlice.ts
│   │
│   ├── theme/                   # Design tokens (Zalo style)
│   │   ├── colors.ts
│   │   ├── spacing.ts
│   │   ├── typography.ts
│   │   └── index.ts
│   │
│   ├── types/                   # Shared TypeScript types
│   │   └── index.ts
│   │
│   └── utils/                   # Utility functions
│       ├── date.ts
│       ├── storage.ts
│       └── index.ts
│
├── App.tsx
├── index.ts
├── app.json
├── package.json
├── tsconfig.json
├── jsconfig.json
├── babel.config.js
├── metro.config.js
├── .eslintrc.js
└── .prettierrc
```

---

## Quy tắc đặt tên

### 1. File và Folder

| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| Folder | kebab-case | `chat-components`, `user-profile` |
| Component file | PascalCase | `MessageListItem.tsx`, `ChatScreen.tsx` |
| Hook file | camelCase với prefix `use` | `useProfile.ts`, `useChat.ts` |
| Slice file | camelCase | `authSlice.ts`, `chatSlice.ts` |
| API file | camelCase | `endpoints.ts`, `client.ts` |
| Utils file | kebab-case | `date-utils.ts` hoặc camelCase: `date.ts` |
| Type file | PascalCase hoặc kebab-case | `types.ts`, `api-types.ts` |
| Mock data | kebab-case hoặc camelCase | `mock-data.ts`, `mockConversations.ts` |

### 2. Component React

```
Tên file:  PascalCase.tsx
  └── Tên export:  default PascalCase
  └── Props interface:  TênComponent + Props
  └── File name trong folder:  PascalCase.tsx
```

Ví dụ:
```
src/features/chat/components/
├── MessageListItem.tsx    →  export default MessageListItem
├── ChatHeader.tsx         →  export default ChatHeader
├── MessageBubble.tsx      →  export default MessageBubble
```

### 3. Feature Folder

```
src/features/<feature-name>/
├── components/     → Chứa UI components riêng của feature
├── screens/        → Chứa screen components (route handlers)
├── hooks/          → Custom hooks cho feature
├── services/       → Business logic, API calls riêng
├── store/          → Feature-level store (nếu cần)
└── data/           → Mock data, constants riêng
```

### 4. Biến và Hàm

| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| Biến thường | camelCase | `userName`, `isLoading` |
| Biến constant | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Hàm | camelCase, verb prefix | `handleSubmit`, `fetchUserData` |
| Handler function | on + PascalCase | `onPress`, `onChangeText` |
| Boolean | is / are / has / can prefix | `isOnline`, `hasError`, `canEdit` |
| State | useState + PascalCase | `[message, setMessage]` |
| Interface/Type | PascalCase | `UserProfile`, `ChatMessage` |

### 5. Import đường dẫn

```typescript
// ✅ Đúng - Sử dụng absolute path
import { Avatar, Button } from '@components/common';
import { colors, spacing } from '@theme';
import { useAppSelector } from '@store';
import type { RootStackScreenProps } from '@navigation/types';

// ❌ Sai - Relative path dài
import { Avatar } from '../../../../components/common/Avatar';
```

### 6. Style (StyleSheet)

```typescript
// ✅ Đúng
const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  primaryButton: { backgroundColor: colors.primary },
});

// ❌ Sai - Đặt tên không nhất quán
const s = StyleSheet.create({
  Container: { flex: 1 },
  btn: { backgroundColor: '#0068FF' },  // Màu cứng
});
```

---

## Quy tắc phát triển

### Nguyên tắc vàng

1. **KHÔNG được hardcode màu sắc** - Luôn dùng từ `src/theme/colors.ts`
2. **KHÔNG tự tạo component trùng** - Kiểm tra `src/components/common/` trước
3. **KHÔNG sửa file của feature khác** - Chỉ làm việc trong folder feature của mình
4. **Sử dụng absolute path** - Cấu hình trong `tsconfig.json`
5. **Mỗi feature tự quản lý folder con** - components/, hooks/, screens/, services/

### Thêm route mới

Khi cần thêm route mới, thông báo trưởng nhóm để cập nhật file trung tâm:

```
src/navigation/types.ts          ← Thêm type mới vào RootStackParamList
src/navigation/RootStackNavigator.tsx  ← Thêm Screen vào navigator
```

### Theme - Màu Zalo chuẩn

```typescript
// src/theme/colors.ts - Sử dụng thay vì hardcode

colors.primary       // #0068FF - Xanh Zalo chủ đạo
colors.text.primary  // #1A1A1A - Text chính
colors.background.primary  // #FFFFFF - Nền chính
colors.badge.unread  // #FF3B30 - Badge đỏ thông báo
```

### Custom Hook Template

```typescript
// src/features/<feature>/hooks/useFeatureName.ts
import { useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@store';

export const useFeatureName = () => {
  const dispatch = useAppDispatch();
  const data = useAppSelector((state) => state.feature.data);

  const fetchData = useCallback(async () => {
    // ...
  }, []);

  return { data, fetchData };
};
```

---

## Absolute Path

Cấu hình sẵn trong `tsconfig.json` và `babel.config.js`:

```json
{
  "paths": {
    "@/*": ["src/*"],
    "@components/*": ["src/components/*"],
    "@common/*": ["src/components/common/*"],
    "@features/*": ["src/features/*"],
    "@navigation/*": ["src/navigation/*"],
    "@theme/*": ["src/theme/*"],
    "@store/*": ["src/store/*"],
    "@api/*": ["src/api/*"],
    "@utils/*": ["src/utils/*"],
    "@types/*": ["src/types/*"]
  }
}
```

---

## UI Components

Các component dùng chung trong `src/components/common/`:

| Component | Mô tả |
|-----------|--------|
| `Button` | Nút bấm với nhiều variant (primary, outline, ghost, danger) |
| `Input` | Text input với label, error, icon support |
| `Avatar` | Hình đại diện với online indicator |
| `Badge` | Badge số thông báo (unread count) |
| `AppText` | Text wrapper với typography variants |
| `Header` | Header navigation (hỗ trợ style Zalo) |
| `MessageListItem` | Dòng tin nhắn trong danh sách |

---

## Navigation

### Thêm route mới

```typescript
// 1. src/navigation/types.ts
export type RootStackParamList = {
  // ... existing routes
  NewScreen: { param1: string; param2?: number };
};

// 2. Import trong RootStackNavigator.tsx
import NewScreen from '@features/feature/screens/NewScreen';

// 3. Thêm vào Stack.Navigator
<Stack.Screen name="NewScreen" component={NewScreen} />
```

### Điều hướng

```typescript
// Từ screen component
const { navigation } = props;
navigation.navigate('Chat', { conversationId: '123', title: 'Tên' });
navigation.goBack();
navigation.replace('Login');
```

---

## API & Store

### Gọi API từ feature

```typescript
// src/features/chat/services/chatService.ts
import { conversationApi, messageApi } from '@api';

export const chatService = {
  async getConversations() {
    const response = await conversationApi.getConversations();
    return response.data;
  },
};
```

### Redux - Thêm slice mới

```typescript
// src/store/slices/newFeatureSlice.ts
import { createSlice } from '@reduxjs/toolkit';

const newFeatureSlice = createSlice({
  name: 'newFeature',
  initialState: { data: [] },
  reducers: {
    setData(state, action) {
      state.data = action.payload;
    },
  },
});

// Thêm vào store.ts
export default combineReducers({ auth: authReducer, chat: chatReducer, newFeature: newFeatureReducer });
```

---

## Chạy project

```bash
# Development
npm start

# Android
npm run android

# iOS
npm run ios

# Kiểm tra TypeScript
npm run type-check

# ESLint
npm run lint

# Format code (Prettier)
npm run prettier
```

---

## Ghi chú quan trọng

- Mỗi thành viên code trong **folder feature riêng** tránh xung đột
- **KHÔNG commit trực tiếp** vào `src/navigation/`, `src/store/store.ts`, `src/theme/`, `src/components/common/` - cần approve từ trưởng nhóm
- Dùng **git branch** theo format: `feature/<tên-feature>-<mã-sinh-viên>`
- Mọi màu sắc phải lấy từ `@theme/colors.ts`
- Mock data đặt trong `src/features/<name>/data/`
