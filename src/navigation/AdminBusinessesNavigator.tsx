import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useApp } from '../context/AppContext';
import AdminBusinessDetailScreen from '../screens/admin/AdminBusinessDetailScreen';
import AdminBusinessesListScreen from '../screens/admin/AdminBusinessesListScreen';
import { colors } from '../theme';
import { HeaderBackButton } from './HeaderBackButton';
import { AdminBusinessesStackParamList } from './types';

const Stack = createNativeStackNavigator<AdminBusinessesStackParamList>();

export default function AdminBusinessesNavigator() {
  const { adminBusinesses } = useApp();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerLeft: () => <HeaderBackButton />,
      }}
    >
      <Stack.Screen name="BusinessesList" component={AdminBusinessesListScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="BusinessDetail"
        component={AdminBusinessDetailScreen}
        options={({ route }) => ({
          title: adminBusinesses.find((b) => b.id === route.params.businessId)?.businessName ?? 'Business',
        })}
      />
    </Stack.Navigator>
  );
}
