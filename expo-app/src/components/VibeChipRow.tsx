import React, { useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { theme } from '@/constants/theme';
import type { VibeChip } from '@/data/dummy';

type Props = {
  vibes: VibeChip[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
};

export function VibeChipRow({ vibes, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      decelerationRate="fast">
      {vibes.map((v) => (
        <ChipItem
          key={v.id}
          label={v.label}
          selected={selectedId === v.id}
          onPress={() => onSelect?.(v.id)}
        />
      ))}
    </ScrollView>
  );
}

function ChipItem({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.94,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          styles.chip,
          selected && styles.chipSelected,
          { transform: [{ scale }] },
        ]}>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingRight: theme.spacing.md,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  chipSelected: {
    backgroundColor: theme.colors.ecoGreen,
    borderColor: theme.colors.ecoGreen,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  chipTextSelected: {
    color: '#fff',
  },
});
