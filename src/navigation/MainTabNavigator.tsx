import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, spacing, typography } from '@theme';
import type { MainTabParamList } from './types';

import ChatScreen from '@features/chat/screens/ChatScreen';
import ContactsScreen from '@features/contacts/screens/ContactsScreen';
import ExploreScreen from '@features/explore/screens/ExploreScreen';
import ProfileScreen from '@features/profile/screens/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = ({
  label,
  focused,
  icon,
}: {
  label: string;
  focused: boolean;
  icon: string;
}) => (
  <View style={styles.tabIconContainer}>
    <Text
      style={[
        styles.tabIcon,
        { color: focused ? colors.primary : colors.text.tertiary },
      ]}
    >
      {icon}
    </Text>
    <Text
      style={[
        styles.tabLabel,
        { color: focused ? colors.primary : colors.text.tertiary },
      ]}
    >
      {label}
    </Text>
  </View>
);

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
            <TabIcon label="Tin nhắn" focused={focused} icon="💬" />
          ),
        }}
      />
      <Tab.Screen
        name="ContactsTab"
        component={ContactsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Danh bạ" focused={focused} icon="👥" />
          ),
        }}
      />
      <Tab.Screen
        name="ExploreTab"
        component={ExploreScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Khám phá" focused={focused} icon="🌐" />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon label="Cá nhân" focused={focused} icon="👤" />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.background.tabBar,
    borderTopWidth: 0.5,
    borderTopColor: colors.border.light,
    height: 60,
    paddingBottom: spacing.xs,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    ...typography.tabLabel,
    marginTop: 2,
  },
});

export default MainTabNavigator;