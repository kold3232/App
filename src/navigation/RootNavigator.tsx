import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';
import AdminNavigator from './AdminNavigator';
import CompanyRootNavigator from './CompanyRootNavigator';
import CustomerNavigator from './CustomerNavigator';
import ModeSelectScreen from '../screens/ModeSelectScreen';
import LegalConsentScreen from '../screens/legal/LegalConsentScreen';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';

export default function RootNavigator() {
  const { isReady, hasAcceptedLegal, mode, isAdminAuthenticated } = useApp();

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!hasAcceptedLegal ? (
        <LegalConsentScreen />
      ) : mode === 'customer' ? (
        <CustomerNavigator />
      ) : mode === 'company' ? (
        <CompanyRootNavigator />
      ) : mode === 'admin' ? (
        isAdminAuthenticated ? <AdminNavigator /> : <AdminLoginScreen />
      ) : (
        <ModeSelectScreen />
      )}
    </NavigationContainer>
  );
}
