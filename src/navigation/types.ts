import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: undefined;
  Chat: { conversationId: string; title: string; userId?: string };
  GroupChat: { groupId: string; title: string };
  UserProfile: { userId: string };
  Login: undefined;
  Register: undefined;
  EditProfile: undefined;
  Settings: undefined;
  ContactsList: undefined;
  AddContact: undefined;
  ForgotPassword: undefined;
  Groups: undefined;
  CreateGroup: undefined;
  JoinGroup: undefined;
  GroupDetail: { groupId: string };
};

export type MainTabParamList = {
  ChatTab: undefined;
  ContactsTab: undefined;
  ExploreTab: undefined;
  ProfileTab: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;
