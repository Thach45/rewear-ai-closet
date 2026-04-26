import React from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { theme } from '@/constants/theme';
import type { UpcycleIdea } from '@/data/dummy';

type Props = {
  idea: UpcycleIdea;
  style?: ViewStyle;
};

export function EcoIdeaCard({ idea, style }: Props) {
  return (
    <View style={[styles.card, style]}>
      <Image source={{ uri: idea.thumbnailUrl }} style={styles.thumb} resizeMode="cover" />
      <View style={styles.body}>
        <Text style={styles.title}>{idea.title}</Text>
        <Text style={styles.desc}>{idea.description}</Text>
        <View style={styles.fakePlay}>
          <Text style={styles.playHint}>▶ Video gợi ý</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    ...theme.shadow.soft,
  },
  thumb: {
    width: '100%',
    height: 140,
    backgroundColor: theme.colors.surfaceMuted,
  },
  body: {
    padding: theme.spacing.md,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  fakePlay: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.overlay,
  },
  playHint: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.ecoGreen,
  },
});
