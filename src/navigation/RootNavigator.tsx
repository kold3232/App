import { NavigationContainer } from '@react-navigation/native';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';
import CompanyNavigator from './CompanyNavigator';
import CustomerNavigator from './CustomerNavigator';
import ModeSelectScreen from '../screens/ModeSelectScreen';

export default function RootNavigator() {
  const { isReady, mode } = useApp();

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {mode === 'customer' ? <CustomerNavigator /> : mode === 'company' ? <CompanyNavigator /> : <ModeSelectScreen />}
    </NavigationContainer>
  );
}
