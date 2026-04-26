import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { HomeCatalogItem } from '@/data/dummy';

type Props = {
  item: HomeCatalogItem;
  selected: boolean;
  onPress: () => void;
};

export function HomeCatalogCard({ item, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.imageWrap, selected && styles.imageWrapSelected]}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>
    </Pressable>
  );
}

const CARD_W = 118;

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    marginRight: theme.spacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  imageWrap: {
    width: CARD_W,
    height: 132,
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  imageWrapSelected: {
    borderColor: theme.colors.ecoGreen,
    ...theme.shadow.soft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
