import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

/**
 * Top-level wrapper for any screen a navigator renders without a header.
 *
 * Those screens used to start at pixel zero, so their titles sat under the
 * clock on an older iPhone and vanished entirely behind the notch or Dynamic
 * Island on a newer one. React Navigation only insets screens it draws a
 * header for, and every tab here is headerless, so the padding has to come
 * from the screen itself.
 *
 * Bottom is left alone by default: the tab bar already sits in that space and
 * padding it twice leaves a dead strip above the tabs.
 */
export function Screen({
  children,
  style,
  bottom = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  bottom?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.surfaceAlt },
        style,
        { paddingTop: insets.top, paddingBottom: bottom ? insets.bottom : 0 },
      ]}
    >
      {children}
    </View>
  );
}
