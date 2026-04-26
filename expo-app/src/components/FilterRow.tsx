import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { theme } from '@/constants/theme';
import type { WardrobeCategory } from '@/data/dummy';

const FILTERS: { key: WardrobeCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'top', label: 'Áo' },
  { key: 'bottom', label: 'Quần' },
  { key: 'shoes', label: 'Giày' },
  { key: 'outer', label: 'Áo khoác' },
  { key: 'accessory', label: 'Phụ kiện' },
];

type Props = {
  active: WardrobeCategory | 'all';
  onChange: (key: WardrobeCategory | 'all') => void;
};

export function FilterRow({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {FILTERS.map((f) => {
        const selected = active === f.key;
        return (
          <Pressable
            key={f.key}
            onPress={() => onChange(f.key)}
            style={[styles.chip, selected && styles.chipActive]}>
            <Text style={[styles.label, selected && styles.labelActive]}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs + 2,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  chipActive: {
    backgroundColor: theme.colors.neonSoft,
    borderColor: theme.colors.ecoGreen,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  labelActive: {
    color: theme.colors.ecoGreen,
  },
});
