import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { CATEGORIES } from '../data/categories';
import { getCompanyById } from '../data/companies';
import CategoryListScreen from '../screens/customer/CategoryListScreen';
import CompanyDetailScreen from '../screens/customer/CompanyDetailScreen';
import CompanyListScreen from '../screens/customer/CompanyListScreen';
import RequestQuoteScreen from '../screens/customer/RequestQuoteScreen';
import { colors } from '../theme';
import { BrowseStackParamList } from './types';

const Stack = createNativeStackNavigator<BrowseStackParamList>();

export default function BrowseNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="CategoryList" component={CategoryListScreen} options={{ title: 'LightningService' }} />
      <Stack.Screen
        name="CompanyList"
        component={CompanyListScreen}
        options={({ route }) => ({
          title: CATEGORIES.find((c) => c.id === route.params.categoryId)?.name ?? 'Companies',
        })}
      />
      <Stack.Screen
        name="CompanyDetail"
        component={CompanyDetailScreen}
        options={({ route }) => ({ title: getCompanyById(route.params.companyId)?.name ?? 'Company' })}
      />
      <Stack.Screen name="RequestQuote" component={RequestQuoteScreen} options={{ title: 'Request a quote' }} />
    </Stack.Navigator>
  );
}
