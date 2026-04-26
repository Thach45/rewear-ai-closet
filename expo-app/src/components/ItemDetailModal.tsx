import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/PrimaryButton';
import { theme } from '@/constants/theme';
import type { WardrobeItem } from '@/data/dummy';

type Props = {
  visible: boolean;
  item: WardrobeItem | null;
  onClose: () => void;
  onUpcycle: () => void;
};

export function ItemDetailModal({ visible, item, onClose, onUpcycle }: Props) {
  return (
    <Modal visible={visible && !!item} animationType="fade" transparent onRequestClose={onClose}>
      {item ? (
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.sheet}>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </Pressable>
            <Image source={{ uri: item.imageUrl }} style={styles.hero} resizeMode="contain" />
            <Text style={styles.title}>{item.name}</Text>
            <PrimaryButton
              title="♻️ TÁI SINH (Upcycle)"
              onPress={() => {
                onUpcycle();
                onClose();
              }}
              variant="primary"
              style={styles.cta}
            />
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    maxHeight: '88%',
  },
  closeBtn: {
    position: 'absolute',
    right: theme.spacing.md,
    top: theme.spacing.md,
    zIndex: 2,
  },
  hero: {
    width: '100%',
    height: 320,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surfaceMuted,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  cta: {
    width: '100%',
  },
});
