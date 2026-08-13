import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import AdminCasesScreen from '../screens/admin/AdminCasesScreen';
import AdminCategoriesScreen from '../screens/admin/AdminCategoriesScreen';
import AdminInsightsScreen from '../screens/admin/AdminInsightsScreen';
import AdminQueueScreen from '../screens/admin/AdminQueueScreen';
import { colors } from '../theme';
import AdminBusinessesNavigator from './AdminBusinessesNavigator';
import { AdminTabParamList } from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();

const ICONS: Record<keyof AdminTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Queue: { active: 'checkmark-done', inactive: 'checkmark-done-outline' },
  Businesses: { active: 'business', inactive: 'business-outline' },
  Cases: { active: 'chatbubbles', inactive: 'chatbubbles-outline' },
  Categories: { active: 'grid', inactive: 'grid-outline' },
  Insights: { active: 'bar-chart', inactive: 'bar-chart-outline' },
};

export default function AdminNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: 'rgba(255,255,255,0.08)', borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 11.5, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons = ICONS[route.name as keyof AdminTabParamList];
          return <Ionicons name={focused ? icons.active : icons.inactive} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Queue" component={AdminQueueScreen} options={{ title: 'Queue' }} />
      <Tab.Screen name="Businesses" component={AdminBusinessesNavigator} options={{ title: 'Businesses' }} />
      <Tab.Screen name="Cases" component={AdminCasesScreen} options={{ title: 'Cases' }} />
      <Tab.Screen name="Categories" component={AdminCategoriesScreen} options={{ title: 'Categories' }} />
      <Tab.Screen name="Insights" component={AdminInsightsScreen} options={{ title: 'Insights' }} />
    </Tab.Navigator>
  );
}
