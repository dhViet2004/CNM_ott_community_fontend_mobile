import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography } from '@theme';
import { Icons, IconSize } from '@components/common';
import type { RootStackParamList } from './types';

import MainTabNavigator from './MainTabNavigator';
import ChatDetailScreen from '@features/chat/screens/ChatDetailScreen';
import UserProfileScreen from '@features/profile/screens/UserProfileScreen';
import EditProfileScreen from '@features/profile/screens/EditProfileScreen';
import SettingsScreen from '@features/profile/screens/SettingsScreen';
import LoginScreen from '@features/auth/screens/LoginScreen';
import RegisterScreen from '@features/auth/screens/RegisterScreen';
import ForgotPasswordScreen from '@features/auth/screens/ForgotPasswordScreen';
import ContactsListScreen from '@features/contacts/screens/ContactsListScreen';
import GroupsScreen from '@features/groups/screens/GroupsScreen';
import CreateGroupScreen from '@features/groups/screens/CreateGroupScreen';
import GroupDetailScreen from '@features/groups/screens/GroupDetailScreen';
import GroupChatScreen from '@features/groups/screens/GroupChatScreen';
import AddMembersScreen from '@features/groups/screens/AddMembersScreen';
import GroupSettingsScreen from '@features/groups/screens/GroupSettingsScreen';
import ManageMembersScreen from '@features/groups/screens/ManageMembersScreen';
import TransferOwnerScreen from '@features/groups/screens/TransferOwnerScreen';
import ChatSettingsScreen from '@features/chat/screens/ChatSettingsScreen';
import MessageSearchScreen from '@features/chat/screens/MessageSearchScreen';
import ChangePasswordScreen from '@features/profile/screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background.primary },
      }}
    >
      {/* Auth */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          animation: 'slide_from_right',
          headerShown: true,
          title: 'Quên mật khẩu',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.inverse,
          headerTitleStyle: { ...typography.h3, color: colors.text.inverse },
        }}
      />

      {/* Main */}
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{ animation: 'none' }}
      />

      {/* Chat */}
      <Stack.Screen
        name="Chat"
        component={ChatDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="GroupChat"
        component={GroupChatScreen}
        options={{ headerShown: false }}
      />

      {/* Profile */}
      <Stack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
          headerShown: true,
          title: 'Chỉnh sửa trang cá nhân',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.inverse,
          headerTitleStyle: { ...typography.h3, color: colors.text.inverse },
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: 'Cài đặt',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.inverse,
        }}
      />

      {/* Contacts */}
      <Stack.Screen
        name="ContactsList"
        component={ContactsListScreen}
        options={{
          headerShown: true,
          title: 'Danh bạ',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.inverse,
        }}
      />

      {/* Groups */}
      <Stack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{
          headerShown: true,
          title: 'Tạo nhóm',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.text.inverse,
          headerTitleStyle: { ...typography.h3, color: colors.text.inverse },
        }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AddMembers"
        component={AddMembersScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="GroupSettings"
        component={GroupSettingsScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ManageMembers"
        component={ManageMembersScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="TransferOwner"
        component={TransferOwnerScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="ChatSettings"
        component={ChatSettingsScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="MessageSearch"
        component={MessageSearchScreen}
        options={{
          headerShown: false,
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
};

export default RootStackNavigator;
