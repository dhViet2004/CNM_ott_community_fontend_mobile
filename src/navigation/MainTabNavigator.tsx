import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '@theme';
import { Icons } from '@components/common';
import type { MainTabParamList } from './types';

import ChatScreen from '@features/chat/screens/ChatScreen';
import ContactsScreen from '@features/contacts/screens/ContactsScreen';
import ExploreScreen from '@features/explore/screens/ExploreScreen';
import ProfileScreen from '@features/profile/screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TABS = [
  {
    key: 'ChatTab',
    label: 'Tin nhắn',
    activeIcon: <>{Icons.chatbubbles(22, colors.primary)}</>,
    inactiveIcon: <>{Icons.chatbubblesOutline(22, colors.text.tertiary)}</>,
  },
  {
    key: 'ContactsTab',
    label: 'Danh bạ',
    activeIcon: <>{Icons.people(22, colors.primary)}</>,
    inactiveIcon: <>{Icons.peopleOutline(22, colors.text.tertiary)}</>,
  },
  {
    key: 'ExploreTab',
    label: 'Khám phá',
    activeIcon: <>{Icons.grid(22, colors.primary)}</>,
    inactiveIcon: <>{Icons.grid(22, colors.text.tertiary)}</>,
  },
  {
    key: 'TimelineTab',
    label: 'Tường nhà',
    activeIcon: <>{Icons.timelineCard(22, colors.primary)}</>,
    inactiveIcon: <>{Icons.timelineCard(22, colors.text.tertiary)}</>,
  },
  {
    key: 'ProfileTab',
    label: 'Cá nhân',
    activeIcon: <>{Icons.person(22, colors.primary)}</>,
    inactiveIcon: <>{Icons.person(22, colors.text.tertiary)}</>,
  },
] as const;

const TAB_BAR_BLUE = '#008AF3';
const BADGE_RED = '#FF3B30';

interface TabBarIconProps {
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
  focused: boolean;
  badgeCount?: number;
}

const TabBarIcon: React.FC<TabBarIconProps> = ({
  activeIcon,
  inactiveIcon,
  focused,
  badgeCount = 0,
}) => {
  const hasBadge = badgeCount > 0;

  return (
    <View style={styles.iconWrapper}>
      <View style={styles.iconContainer}>
        {focused ? activeIcon : inactiveIcon}
      </View>
      {hasBadge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Text>
        </View>
      )}
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
      }}
    >
      <Tab.Screen
        name="ChatTab"
        component={ChatScreen as any}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              activeIcon={TABS[0].activeIcon}
              inactiveIcon={TABS[0].inactiveIcon}
              badgeCount={5}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              activeIcon={TABS[1].activeIcon}
              inactiveIcon={TABS[1].inactiveIcon}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              activeIcon={TABS[2].activeIcon}
              inactiveIcon={TABS[2].inactiveIcon}
            />
          ),
        }}
      />
      <Tab.Screen
        name="TimelineTab"
        component={TimelinePlaceholder as any}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              activeIcon={TABS[3].activeIcon}
              inactiveIcon={TABS[3].inactiveIcon}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon
              focused={focused}
              activeIcon={TABS[4].activeIcon}
              inactiveIcon={TABS[4].inactiveIcon}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background.tabBar,
    height: 62,
    paddingBottom: spacing.xs,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    // Subtle top border shadow
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCDCDC',
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 40,
    height: 36,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 2,
    backgroundColor: BADGE_RED,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.background.tabBar,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 11,
  },
  tabLabel: {
    ...typography.tabLabel,
    marginTop: 2,
  },
});

// Timeline placeholder screen styles
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
