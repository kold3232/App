import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import DashboardScreen from '../screens/company/DashboardScreen';
import InvoicesScreen from '../screens/company/InvoicesScreen';
import TeamScreen from '../screens/company/TeamScreen';
import MyListingScreen from '../screens/company/MyListingScreen';
import SettingsScreen from '../screens/company/SettingsScreen';
import { colors } from '../theme';
import { TabIcon } from './TabIcon';
import { CompanyTabParamList } from './types';

const Tab = createBottomTabNavigator<CompanyTabParamList>();

const ICONS: Record<keyof CompanyTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { active: 'file-tray-full', inactive: 'file-tray-full-outline' },
  Team: { active: 'people', inactive: 'people-outline' },
  Invoices: { active: 'receipt', inactive: 'receipt-outline' },
  MyListing: { active: 'pricetag', inactive: 'pricetag-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function CompanyNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1.5 },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = ICONS[route.name as keyof CompanyTabParamList];
          return <TabIcon name={focused ? icons.active : icons.inactive} focused={focused} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Requests' }} />
      <Tab.Screen name="Team" component={TeamScreen} options={{ title: 'Team' }} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Tab.Screen name="MyListing" component={MyListingScreen} options={{ title: 'My Listing' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
