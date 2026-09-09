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
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import CustomerSignUpScreen from '../screens/customer/CustomerSignUpScreen';
import BusinessAuthScreen from '../screens/company/BusinessAuthScreen';
import EmployeeAuthScreen from '../screens/employee/EmployeeAuthScreen';

export default function RootNavigator() {
  const { isReady, hasAcceptedLegal, mode, isAdminAuthenticated, customerProfile, businessAccount, myEmployment, passwordRecovery, authLoading } =
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
      {/* A recovery link signs the account in, so this has to come before
          every other branch — otherwise tapping the email would drop someone
          straight into the app without setting a password. */}
      {passwordRecovery ? (
        <ResetPasswordScreen />
      ) : !hasAcceptedLegal ? (
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
