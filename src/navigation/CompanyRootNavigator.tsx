import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import TierSelectionScreen from '../screens/company/TierSelectionScreen';
import { colors } from '../theme';
import CompanyNavigator from './CompanyNavigator';
import { CompanyStackParamList } from './types';

const Stack = createNativeStackNavigator<CompanyStackParamList>();

export default function CompanyRootNavigator() {
  // Real visibility to customers is gated by Supabase admin approval
  // (see the businesses.is_approved column) — any authenticated business
  // account goes straight to their dashboard. TierSelection stays reachable
  // from Settings > Change plan.
  return (
    <Stack.Navigator
      initialRouteName="CompanyTabs"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="TierSelection" component={TierSelectionScreen} options={{ title: 'Change plan' }} />
      <Stack.Screen name="CompanyTabs" component={CompanyNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
