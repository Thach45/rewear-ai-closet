import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import type { WardrobeItem } from '@/data/dummy';

type Props = {
  item: WardrobeItem;
  onPress: () => void;
};

export function WardrobeItemCell({ item, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}>
      <View style={styles.hangerHook}>
        <Ionicons name="ellipse-outline" size={13} color="#6e6148" />
      </View>
      <View style={styles.hangerNeck} />
      <View style={styles.depthShadow} />
      <View style={styles.imageBox}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {item.name}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
    paddingTop: 14,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  depthShadow: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 22,
    bottom: 20,
    borderRadius: theme.radii.md,
    backgroundColor: 'rgba(13,79,60,0.14)',
  },
  hangerHook: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -7,
    zIndex: 4,
  },
  hangerNeck: {
    position: 'absolute',
    top: 12,
    left: '50%',
    marginLeft: -1.2,
    width: 2.4,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#7c6f56',
    zIndex: 3,
  },
  imageBox: {
    borderRadius: theme.radii.md,
    overflow: 'hidden',
    backgroundColor: '#f4f0e4',
    aspectRatio: 0.85,
    borderWidth: 2,
    borderColor: 'rgba(184,170,143,0.95)',
    ...theme.shadow.soft,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  name: {
    marginTop: theme.spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
  },
});
