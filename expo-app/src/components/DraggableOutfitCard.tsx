import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { theme } from '@/constants/theme';
import type { HomeCatalogItem } from '@/data/dummy';

export type OutfitSlotCategory = 'top' | 'bottom' | 'shoe';

type Props = {
  item: HomeCatalogItem;
  category: OutfitSlotCategory;
  /** Thu nhỏ card cùng hàng khi đang kéo một card khác */
  compact?: boolean;
  selected?: boolean;
  onDragStart: (category: OutfitSlotCategory, itemId: string) => void;
  onDragEnd: (
    absoluteX: number,
    absoluteY: number,
    item: HomeCatalogItem,
    category: OutfitSlotCategory
  ) => void;
};

const FULL_W = 118;
const FULL_H = 132;
const COMPACT_W = 76;
const COMPACT_H = 88;

export function DraggableOutfitCard({
  item,
  category,
  compact,
  selected,
  onDragStart,
  onDragEnd,
}: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lift = useSharedValue(0);

  const pan = Gesture.Pan()
    .minDistance(6)
    .onStart(() => {
      lift.value = withSpring(1);
      runOnJS(onDragStart)(category, item.id);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      runOnJS(onDragEnd)(e.absoluteX, e.absoluteY, item, category);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      lift.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    const s = 1 + lift.value * 0.04;
    return {
      transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: s }],
      zIndex: lift.value > 0 || translateX.value !== 0 || translateY.value !== 0 ? 40 : 1,
    };
  });

  const w = compact ? COMPACT_W : FULL_W;
  const h = compact ? COMPACT_H : FULL_H;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, { width: w }, animatedStyle]}>
        <View style={[styles.imageWrap, { width: w, height: h }, selected && styles.imageWrapSelected]}>
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        </View>
        {!compact ? (
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
        ) : (
          <Text style={styles.nameCompact} numberOfLines={1}>
            {item.name}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  imageWrap: {
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  imageWrapSelected: {
    borderColor: theme.colors.ecoGreen,
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
  nameCompact: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.text,
    maxWidth: COMPACT_W,
  },
});
