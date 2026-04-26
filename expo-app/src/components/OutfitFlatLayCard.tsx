import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { OutfitPiece } from '@/data/dummy';

type Props = {
  pieces: OutfitPiece[];
  title?: string;
};

export function OutfitFlatLayCard({ pieces, title = 'Gợi ý hôm nay' }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.grid}>
        {pieces.map((p) => (
          <View key={p.id} style={styles.cell}>
            <Image source={{ uri: p.imageUrl }} style={styles.image} resizeMode="cover" />
            <Text style={styles.caption}>{p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    letterSpacing: -0.3,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
  },
  caption: {
    marginTop: theme.spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
