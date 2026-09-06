import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';
import AdminNavigator from './AdminNavigator';
import CompanyRootNavigator from './CompanyRootNavigator';
import CustomerNavigator from './CustomerNavigator';
import EmployeeNavigator from './EmployeeNavigator';
import ModeSelectScreen from '../screens/ModeSelectScreen';
import LegalConsentScreen from '../screens/legal/LegalConsentScreen';
import AdminLoginScreen from '../screens/admin/AdminLoginScreen';
import CustomerSignUpScreen from '../screens/customer/CustomerSignUpScreen';
import BusinessAuthScreen from '../screens/company/BusinessAuthScreen';
import EmployeeAuthScreen from '../screens/employee/EmployeeAuthScreen';

export default function RootNavigator() {
  const { isReady, hasAcceptedLegal, mode, isAdminAuthenticated, customerProfile, businessAccount, myEmployment, authLoading } =
    useApp();

  if (!isReady || ((mode === 'customer' || mode === 'company' || mode === 'admin' || mode === 'employee') && authLoading)) {
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
        customerProfile ? <CustomerNavigator /> : <CustomerSignUpScreen />
      ) : mode === 'company' ? (
        businessAccount ? <CompanyRootNavigator /> : <BusinessAuthScreen />
      ) : mode === 'employee' ? (
        myEmployment ? <EmployeeNavigator /> : <EmployeeAuthScreen />
      ) : mode === 'admin' ? (
        isAdminAuthenticated ? <AdminNavigator /> : <AdminLoginScreen />
      ) : (
        <ModeSelectScreen />
      )}
    </NavigationContainer>
  );
}
