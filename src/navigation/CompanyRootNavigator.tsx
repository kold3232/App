import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable } from 'react-native';
import { useApp } from '../context/AppContext';
import ApplicationStatusScreen from '../screens/company/ApplicationStatusScreen';
import BusinessSignupScreen from '../screens/company/BusinessSignupScreen';
import DocumentUploadScreen from '../screens/company/DocumentUploadScreen';
import PaymentScreen from '../screens/company/PaymentScreen';
import TierSelectionScreen from '../screens/company/TierSelectionScreen';
import UnlicensedExplanationScreen from '../screens/company/UnlicensedExplanationScreen';
import { colors } from '../theme';
import CompanyNavigator from './CompanyNavigator';
import { CompanyStackParamList } from './types';

const Stack = createNativeStackNavigator<CompanyStackParamList>();

export default function CompanyRootNavigator() {
  const { setMode } = useApp();

  // Real visibility to customers is gated by Supabase admin approval now
  // (see the businesses.is_approved column), not this local application
  // flow — so any authenticated business account goes straight to their
  // dashboard. The old signup/documents/tier/payment/status screens stay
  // reachable (e.g. "Change plan" in Settings still opens TierSelection
  // directly) but no longer block getting here.
  return (
    <Stack.Navigator
      initialRouteName="CompanyTabs"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="BusinessSignup"
        component={BusinessSignupScreen}
        options={{
          title: 'Get listed',
          headerLeft: () => (
            <Pressable onPress={() => setMode(null)} hitSlop={12} style={{ paddingRight: 8 }}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="UnlicensedExplanation"
        component={UnlicensedExplanationScreen}
        options={{ title: 'Unlicensed / Sole Trader' }}
      />
      <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} options={{ title: 'Documents' }} />
      <Stack.Screen name="TierSelection" component={TierSelectionScreen} options={{ title: 'Choose plan' }} />
      <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: 'Payment' }} />
      <Stack.Screen name="ApplicationStatus" component={ApplicationStatusScreen} options={{ title: 'Application status' }} />
      <Stack.Screen name="CompanyTabs" component={CompanyNavigator} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
