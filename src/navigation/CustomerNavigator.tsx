import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';
import MyRequestsScreen from '../screens/customer/MyRequestsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import { colors } from '../theme';
import BrowseNavigator from './BrowseNavigator';
import { CustomerTabParamList } from './types';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

const ICONS: Record<keyof CustomerTabParamList, string> = {
  Browse: '⚡',
  MyRequests: '📋',
  Profile: '👤',
};

export default function CustomerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name as keyof CustomerTabParamList]}</Text>,
      })}
    >
      <Tab.Screen name="Browse" component={BrowseNavigator} options={{ title: 'Browse' }} />
      <Tab.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: 'My Requests' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}
