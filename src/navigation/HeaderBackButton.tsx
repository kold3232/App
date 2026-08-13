import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable } from 'react-native';
import { colors } from '../theme';

export function HeaderBackButton() {
  const navigation = useNavigation();
  if (!navigation.canGoBack()) return null;
  return (
    <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ paddingRight: 14, paddingVertical: 4 }}>
      <Ionicons name="chevron-back" size={26} color={colors.textInverse} />
    </Pressable>
  );
}
