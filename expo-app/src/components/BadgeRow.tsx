import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { Badge } from '@/data/dummy';

type Props = {
  badges: Badge[];
  /** Ẩn tiêu đề mặc định khi trang cha tự render heading */
  hideSectionTitle?: boolean;
};

export function BadgeRow({ badges, hideSectionTitle }: Props) {
  return (
    <View>
      {!hideSectionTitle ? <Text style={styles.sectionTitle}>Huy hiệu</Text> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {badges.map((b) => (
          <View key={b.id} style={styles.badge}>
            <Text style={styles.emoji}>{b.emoji}</Text>
            <Text style={styles.badgeTitle} numberOfLines={2}>
              {b.title}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  row: {
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xs,
  },
  badge: {
    width: 108,
    padding: theme.spacing.sm,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 6,
  },
  badgeTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
});
