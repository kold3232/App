import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useApp } from '../context/AppContext';
import ApplicationStatusScreen from '../screens/company/ApplicationStatusScreen';
import BusinessSignupScreen from '../screens/company/BusinessSignupScreen';
import DocumentUploadScreen from '../screens/company/DocumentUploadScreen';
import PaymentScreen from '../screens/company/PaymentScreen';
import TierSelectionScreen from '../screens/company/TierSelectionScreen';
import { colors } from '../theme';
import CompanyNavigator from './CompanyNavigator';
import { CompanyStackParamList } from './types';

const Stack = createNativeStackNavigator<CompanyStackParamList>();

export default function CompanyRootNavigator() {
  const { businessApplication } = useApp();

  const initialRouteName: keyof CompanyStackParamList =
    businessApplication.status === 'approved'
      ? 'CompanyTabs'
      : businessApplication.status === 'pending' || businessApplication.status === 'rejected'
        ? 'ApplicationStatus'
        : 'BusinessSignup';

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="BusinessSignup" component={BusinessSignupScreen} options={{ title: 'Get listed' }} />
      <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} options={{ title: 'Documents' }} />
      <Stack.Screen name="TierSelection" component={TierSelectionScreen} options={{ title: 'Choose plan' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="ApplicationStatus" component={ApplicationStatusScreen} options={{ title: 'Application status' }} />
      <Stack.Screen name="CompanyTabs" component={CompanyNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
