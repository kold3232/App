import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CATEGORY_GROUPS } from '../data/categoryGroups';
import { useApp } from '../context/AppContext';
import CategoryGroupScreen from '../screens/customer/CategoryGroupScreen';
import CategoryListScreen from '../screens/customer/CategoryListScreen';
import ComingSoonScreen from '../screens/customer/ComingSoonScreen';
import CompanyDetailScreen from '../screens/customer/CompanyDetailScreen';
import CompanyListScreen from '../screens/customer/CompanyListScreen';
import InstantBookScreen from '../screens/customer/InstantBookScreen';
import RequestQuoteScreen from '../screens/customer/RequestQuoteScreen';
import { colors, radius } from '../theme';
import { BrowseStackParamList } from './types';

const Stack = createNativeStackNavigator<BrowseStackParamList>();

function BrandTitle() {
  return (
    <View style={brandStyles.row}>
      <View style={brandStyles.badge}>
        <Ionicons name="flash" size={13} color={colors.textInverse} />
      </View>
      <Text style={brandStyles.title}>Gib Trades</Text>
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
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
});

export default function BrowseNavigator() {
  const { categories, businessListings } = useApp();

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
