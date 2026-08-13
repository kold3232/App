import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function TabIcon({
  name,
  focused,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={[styles.wrap, focused && styles.wrapFocused]}>
      <Ionicons name={name} size={20} color={focused ? colors.textInverse : color} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 40,
    height: 32,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrapFocused: { backgroundColor: colors.primary },
});
