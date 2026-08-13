import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import MyRequestsScreen from '../screens/customer/MyRequestsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import { colors } from '../theme';
import BrowseNavigator from './BrowseNavigator';
import { TabIcon } from './TabIcon';
import { CustomerTabParamList } from './types';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

const ICONS: Record<keyof CustomerTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Browse: { active: 'flash', inactive: 'flash-outline' },
  MyRequests: { active: 'clipboard', inactive: 'clipboard-outline' },
  Profile: { active: 'person', inactive: 'person-outline' },
};

export default function CustomerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = ICONS[route.name as keyof CustomerTabParamList];
          return <TabIcon name={focused ? icons.active : icons.inactive} focused={focused} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Browse" component={BrowseNavigator} options={{ title: 'Browse' }} />
      <Tab.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: 'My Requests' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
