import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';

type Props = {
  reuseCount: number;
  co2Kg: number;
};

export function EcoStatsWidget({ reuseCount, co2Kg }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.stat, styles.statLeft]}>
        <Text style={styles.statLabel}>Đã tái sử dụng</Text>
        <Text style={styles.statValue}>
          {reuseCount} <Text style={styles.unit}>lần</Text>
        </Text>
      </View>
      <View style={styles.divider} />
      <View style={[styles.stat, styles.statRight]}>
        <Text style={styles.statLabel}>Giảm</Text>
        <Text style={styles.statValue}>
          {co2Kg} <Text style={styles.unit}>kg CO₂</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.soft,
  },
  stat: {
    flex: 1,
  },
  statLeft: {
    alignItems: 'flex-start',
  },
  statRight: {
    alignItems: 'flex-end',
  },
  divider: {
    width: 1,
    height: 52,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  statLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.ecoGreen,
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
