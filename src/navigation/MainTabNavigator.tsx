import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, typography } from '@theme';
import type { MainTabParamList } from './types';

import ChatScreen from '@features/chat/screens/ChatScreen';
import ContactsScreen from '@features/contacts/screens/ContactsScreen';
import ExploreScreen from '@features/explore/screens/ExploreScreen';
import ProfileScreen from '@features/profile/screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TABS = [
  {
    label: 'Tin nhắn',
    family: 'ionicons',
    activeIcon: 'chatbubble',
    inactiveIcon: 'chatbubble-outline',
  },
  {
    label: 'Danh bạ',
    family: 'material',
    activeIcon: 'contacts',
    inactiveIcon: 'contacts-outline',
  },
  {
    label: 'Khám phá',
    family: 'ionicons',
    activeIcon: 'grid',
    inactiveIcon: 'grid-outline',
  },
  {
    label: 'Tường nhà',
    family: 'material',
    activeIcon: 'card-account-details',
    inactiveIcon: 'card-account-details-outline',
  },
  {
    label: 'Cá nhân',
    family: 'ionicons',
    activeIcon: 'person',
    inactiveIcon: 'person-outline',
  },
] as const;

const TAB_BAR_BLUE = '#008AF3';
const BADGE_RED = '#FF4D55';

interface TabBarIconProps {
  tab: (typeof TABS)[number];
  focused: boolean;
  badgeCount?: number;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({ tab, focused, badgeCount = 0 }) => {
  const hasBadge = badgeCount > 0;
  const iconName = focused ? tab.activeIcon : tab.inactiveIcon;
  const tintColor = focused ? colors.primary : colors.text.tertiary;

  return (
    <View style={styles.tabItem}>
      <View style={styles.iconContainer}>
        {tab.family === 'material' ? (
          <MaterialCommunityIcons name={iconName as any} size={25} color={tintColor} />
        ) : (
          <Ionicons name={iconName as any} size={25} color={tintColor} />
        )}
      </View>
      {hasBadge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
        </View>
      )}
      <Text
        numberOfLines={1}
        style={[styles.tabLabel, { color: focused ? colors.primary : colors.text.tertiary }]}>
        {tab.label}
      </Text>
    </View>
  );
};

const TimelinePlaceholder: React.FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[timelineStyles.container, { paddingTop: insets.top }]}>
      <View style={timelineStyles.header}>
        <Text style={timelineStyles.headerTitle}>Tường nhà</Text>
      </View>
      <View style={timelineStyles.content}>
        <Text style={timelineStyles.icon}>📋</Text>
        <Text style={timelineStyles.title}>Tường nhà</Text>
        <Text style={timelineStyles.subtitle}>Tính năng đang phát triển</Text>
      </View>
    </View>
  );
};

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}>
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen as any}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} tab={TABS[0]} />,
        }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} tab={TABS[1]} />,
        }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} tab={TABS[2]} />,
        }}
      />
      <Tab.Screen
        name="TimelineTab"
        component={TimelinePlaceholder as any}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon focused={focused} tab={TABS[3]} badgeCount={1} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} tab={TABS[4]} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background.tabBar,
    height: 64,
    paddingTop: 4,
    paddingBottom: spacing.xs,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCDCDC',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 72,
    height: 48,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 27,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 12,
    backgroundColor: BADGE_RED,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background.tabBar,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 12,
  },
  tabLabel: {
    ...typography.tabLabel,
    marginTop: 2,
    textAlign: 'center',
  },
});

const timelineStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: TAB_BAR_BLUE,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.md,
    height: 56,
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.inverse,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.tertiary,
  },
});

export default MainTabNavigator;
