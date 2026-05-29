import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: undefined;
  Chat: { conversationId: string; title: string; userId?: string; originalName?: string };
  BotChat: undefined;
  GroupChat: { groupId: string; title: string };
  UserProfile: { userId: string };
  Login: undefined;
  Register: undefined;
  EditProfile: undefined;
  Settings: undefined;
  ContactsList: undefined;
  QRCodeFriend: undefined;
  AddContact: undefined;
  FriendRequests: undefined;
  ForgotPassword: undefined;
  Groups: undefined;
  CreateGroup: undefined;
  JoinGroup: undefined;
  GroupDetail: { groupId: string };
  AddMembers: { groupId: string };
  GroupSettings: { groupId: string };
  ManageMembers: { groupId: string };
  TransferOwner: { groupId: string; groupName: string };
  ChatSettings: { conversationId: string; friendshipId?: string; friendId?: string; title: string; avatarUrl?: string | null; originalName?: string };
  MessageSearch: { conversationId: string; title: string };
  ChangePassword: undefined;
};

export type MainTabParamList = {
  ChatTab: undefined;
  ContactsTab: undefined;
  ExploreTab: undefined;
  TimelineTab: undefined;
  ProfileTab: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;
