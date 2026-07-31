import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Text } from 'react-native';
import DashboardScreen from '../screens/company/DashboardScreen';
import MyListingScreen from '../screens/company/MyListingScreen';
import SettingsScreen from '../screens/company/SettingsScreen';
import { colors } from '../theme';
import { CompanyTabParamList } from './types';

const Tab = createBottomTabNavigator<CompanyTabParamList>();

const ICONS: Record<keyof CompanyTabParamList, string> = {
  Dashboard: '📥',
  MyListing: '🏷️',
  Settings: '⚙️',
};

export default function CompanyNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name as keyof CompanyTabParamList]}</Text>,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Requests' }} />
      <Tab.Screen name="MyListing" component={MyListingScreen} options={{ title: 'My Listing' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
