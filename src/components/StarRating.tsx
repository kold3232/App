import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function StarRating({
  rating,
  onChange,
  size = 22,
}: {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
}) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <View style={styles.row}>
      {stars.map((star) =>
        onChange ? (
          <Pressable key={star} onPress={() => onChange(star)} hitSlop={4}>
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={size}
              color={colors.accent}
              style={styles.star}
            />
          </Pressable>
        ) : (
          <Ionicons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={size}
            color={colors.accent}
            style={styles.star}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  star: { marginRight: 3 },
});
