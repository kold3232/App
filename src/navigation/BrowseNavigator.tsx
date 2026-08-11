import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { CATEGORY_GROUPS } from '../data/categoryGroups';
import { useApp } from '../context/AppContext';
import CategoryGroupScreen from '../screens/customer/CategoryGroupScreen';
import CategoryListScreen from '../screens/customer/CategoryListScreen';
import ComingSoonScreen from '../screens/customer/ComingSoonScreen';
import CompanyDetailScreen from '../screens/customer/CompanyDetailScreen';
import CompanyListScreen from '../screens/customer/CompanyListScreen';
import InstantBookScreen from '../screens/customer/InstantBookScreen';
import RequestQuoteScreen from '../screens/customer/RequestQuoteScreen';
import { colors } from '../theme';
import { HeaderBackButton } from './HeaderBackButton';
import { BrowseStackParamList } from './types';

const Stack = createNativeStackNavigator<BrowseStackParamList>();

function BrandTitle() {
  return <Image source={require('../../assets/logo-transparent.png')} style={brandStyles.logo} resizeMode="contain" />;
}

const brandStyles = StyleSheet.create({
  logo: { width: 106, height: 28 },
});

export default function BrowseNavigator() {
  const { categories, businessListings } = useApp();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerBackButtonDisplayMode: 'minimal',
        headerLeft: () => <HeaderBackButton />,
      }}
    >
      <Stack.Screen
        name="CategoryList"
        component={CategoryListScreen}
        options={{ headerTitle: () => <BrandTitle /> }}
      />
      <Stack.Screen
        name="CategoryGroup"
        component={CategoryGroupScreen}
        options={({ route }) => ({
          title: CATEGORY_GROUPS.find((g) => g.id === route.params.groupId)?.name ?? 'Category',
        })}
      />
      <Stack.Screen
        name="CompanyList"
        component={CompanyListScreen}
        options={({ route }) => ({
          title: categories.find((c) => c.id === route.params.categoryId)?.name ?? 'Companies',
        })}
      />
      <Stack.Screen
        name="CompanyDetail"
        component={CompanyDetailScreen}
        options={({ route }) => ({
          title: businessListings.find((c) => c.id === route.params.companyId)?.name ?? 'Company',
        })}
      />
      <Stack.Screen name="RequestQuote" component={RequestQuoteScreen} options={{ title: 'Request a quote' }} />
      <Stack.Screen name="InstantBook" component={InstantBookScreen} options={{ title: 'Book a time' }} />
      <Stack.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={({ route }) => ({
          title: categories.find((c) => c.id === route.params.categoryId)?.name ?? 'Coming soon',
        })}
      />
    </Stack.Navigator>
  );
}
