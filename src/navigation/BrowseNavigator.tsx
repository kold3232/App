import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '../data/categories';
import { getCompanyById } from '../data/companies';
import CategoryListScreen from '../screens/customer/CategoryListScreen';
import CompanyDetailScreen from '../screens/customer/CompanyDetailScreen';
import CompanyListScreen from '../screens/customer/CompanyListScreen';
import RequestQuoteScreen from '../screens/customer/RequestQuoteScreen';
import { colors, radius } from '../theme';
import { BrowseStackParamList } from './types';

const Stack = createNativeStackNavigator<BrowseStackParamList>();

function BrandTitle() {
  return (
    <View style={brandStyles.row}>
      <View style={brandStyles.badge}>
        <Text style={brandStyles.bolt}>⚡</Text>
      </View>
      <Text style={brandStyles.title}>LightningService</Text>
    </View>
  );
}

const brandStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bolt: { fontSize: 13 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
});

export default function BrowseNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="CategoryList"
        component={CategoryListScreen}
        options={{ headerTitle: () => <BrandTitle /> }}
      />
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
