import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/constants/theme';

export function AvatarSetupScreen() {
  const { completeOnboarding, uploadAvatar } = useAuth();
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleUpload = async () => {
    if (busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setPreviewUri(asset.uri);
    setBusy(true);
    try {
      const name = asset.fileName ?? 'avatar.jpg';
      const type = asset.mimeType ?? 'image/jpeg';
      await uploadAvatar({ uri: asset.uri, name, type });
      await completeOnboarding();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Tải ảnh thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    if (busy) return;
    await completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Phòng thử đồ ảo</Text>
        <Text style={styles.desc}>
          Chọn một ảnh toàn thân rõ nét để dùng làm ảnh đại diện (lưu trên server dev).
        </Text>
        <View style={styles.placeholder}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.outline}>
              <Feather name="user" size={72} color={theme.colors.textSecondary} style={styles.outlineIcon} />
              <Text style={styles.placeholderHint}>Khung người</Text>
            </View>
          )}
        </View>
        <PrimaryButton
          title="Tải ảnh lên"
          onPress={() => {
            void handleUpload();
          }}
          variant="neon"
          loading={busy}
        />
        <PrimaryButton
          title="Bỏ qua (demo)"
          onPress={() => {
            void handleSkip();
          }}
          variant="outline"
          style={styles.skip}
          disabled={busy}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  desc: {
    marginTop: theme.spacing.md,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  placeholder: {
    marginVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  outline: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 3 / 5,
    borderRadius: theme.radii.xl,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: theme.colors.ecoGreen,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    maxWidth: 280,
    aspectRatio: 3 / 5,
    borderRadius: theme.radii.xl,
    borderWidth: 3,
    borderColor: theme.colors.neon,
  },
  outlineIcon: {
    opacity: 0.35,
  },
  placeholderHint: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  skip: {
    marginTop: theme.spacing.md,
  },
});
