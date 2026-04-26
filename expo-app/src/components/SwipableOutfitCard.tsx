import React, { useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/constants/theme';
import type { HomeCatalogItem } from '@/data/dummy';

type Props = {
  item: HomeCatalogItem;
  active: boolean;
  onSelect: () => void;
};

const CARD_W = 140;
const CARD_H = 160;

export function SwipableOutfitCard({ item, active, onSelect }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
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
    <Pressable onPress={onSelect} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.card, active && styles.cardActive, { transform: [{ scale }] }]}>
        <View style={[styles.imageWrap, active && styles.imageWrapActive]}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    marginRight: theme.spacing.md,
  },
  cardActive: {},
  imageWrap: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  imageWrapActive: {
    borderColor: theme.colors.ecoGreen,
    borderWidth: 3,
    ...theme.shadow.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
  },
});
