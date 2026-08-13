import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import MyRequestsScreen from '../screens/customer/MyRequestsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import { colors } from '../theme';
import BrowseNavigator from './BrowseNavigator';
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
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = ICONS[route.name as keyof CustomerTabParamList];
          return <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Browse" component={BrowseNavigator} options={{ title: 'Browse' }} />
      <Tab.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: 'My Requests' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
