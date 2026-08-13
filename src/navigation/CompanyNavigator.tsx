import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import DashboardScreen from '../screens/company/DashboardScreen';
import InvoicesScreen from '../screens/company/InvoicesScreen';
import MyListingScreen from '../screens/company/MyListingScreen';
import SettingsScreen from '../screens/company/SettingsScreen';
import { colors } from '../theme';
import { CompanyTabParamList } from './types';

const Tab = createBottomTabNavigator<CompanyTabParamList>();

const ICONS: Record<keyof CompanyTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { active: 'file-tray-full', inactive: 'file-tray-full-outline' },
  Invoices: { active: 'receipt', inactive: 'receipt-outline' },
  MyListing: { active: 'pricetag', inactive: 'pricetag-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function CompanyNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = ICONS[route.name as keyof CompanyTabParamList];
          return <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Requests' }} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Tab.Screen name="MyListing" component={MyListingScreen} options={{ title: 'My Listing' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
}
