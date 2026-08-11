import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import ListingEditorScreen from '../screens/company/ListingEditorScreen';
import { colors } from '../theme';
import CompanyNavigator from './CompanyNavigator';
import { HeaderBackButton } from './HeaderBackButton';
import { CompanyStackParamList } from './types';

const Stack = createNativeStackNavigator<CompanyStackParamList>();

export default function CompanyRootNavigator() {
  // Real visibility to customers is gated by Supabase admin approval
  // (see the businesses.is_approved column) — any authenticated business
  // account goes straight to their dashboard.
  return (
    <Stack.Navigator
      initialRouteName="CompanyTabs"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        headerLeft: () => <HeaderBackButton />,
      }}
    >
      <Stack.Screen name="CompanyTabs" component={CompanyNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="ListingEditor"
        component={ListingEditorScreen}
        options={({ route }) => ({ title: route.params?.listingId ? 'Edit listing' : 'New listing' })}
      />
    </Stack.Navigator>
  );
}
