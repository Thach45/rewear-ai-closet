import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EcoStatsWidget } from '@/components/EcoStatsWidget';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAuth } from '@/context/AuthContext';
import { theme } from '@/constants/theme';
import { deleteSavedOutfit, fetchSavedOutfits, tryOnSavedOutfit, type SavedOutfit } from '@/lib/outfitsApi';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

export function ProfileScreen() {
  const { user, signOut, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [gender, setGender] = useState<string | null>(null);
  const [bodyShape, setBodyShape] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [selectedOutfit, setSelectedOutfit] = useState<SavedOutfit | null>(null);
  const [deletingOutfit, setDeletingOutfit] = useState(false);
  const [tryingOn, setTryingOn] = useState(false);

  const loadSavedOutfits = useCallback(async () => {
    try {
      const list = await fetchSavedOutfits();
      setSavedOutfits(list);
    } catch {
      // silent: không chặn màn profile
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSavedOutfits();
    }, [loadSavedOutfits])
  );

  const closeOutfitDetail = useCallback(() => {
    setSelectedOutfit(null);
  }, []);

  const handleDeleteOutfit = useCallback(
    async (outfitId: string) => {
      if (deletingOutfit) return;
      setDeletingOutfit(true);
      try {
        await deleteSavedOutfit(outfitId);
        setSavedOutfits((prev) => prev.filter((item) => item.id !== outfitId));
        closeOutfitDetail();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Xoá outfit thất bại';
        Alert.alert('Lỗi', msg);
      } finally {
        setDeletingOutfit(false);
      }
    },
    [closeOutfitDetail, deletingOutfit]
  );

  const handleTryOnOutfit = useCallback(async () => {
    if (!selectedOutfit || tryingOn || deletingOutfit) return;
    setTryingOn(true);
    try {
      const result = await tryOnSavedOutfit({
        outfitId: selectedOutfit.id,
        personImageUrl: user?.personImageUrl ?? undefined,
      });
      setSavedOutfits((prev) => prev.map((item) => (item.id === result.outfit.id ? result.outfit : item)));
      setSelectedOutfit(result.outfit);
      Alert.alert('Mặc thử thành công', result.usedCache ? 'Đã dùng ảnh cache để tiết kiệm lượt API.' : 'Đã tạo ảnh mới.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Mặc thử thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setTryingOn(false);
    }
  }, [deletingOutfit, selectedOutfit, tryingOn, user?.personImageUrl]);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setHeightCm(user.heightCm != null ? String(user.heightCm) : '');
    setWeightKg(user.weightKg != null ? String(user.weightKg) : '');
    setGender(user.gender ?? null);
    setBodyShape(user.bodyShape ?? null);
  }, [user]);

  if (!user) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.muted}>Đang tải hồ sơ…</Text>
          <Pressable
          style={styles.signOut}
          onPress={() =>
            Alert.alert('Đăng xuất', 'Bạn có chắc?', [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Đăng xuất',
                style: 'destructive',
                onPress: () => {
                  void signOut();
                },
              },
            ])
          }>
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const metaParts = [];
  if (user.heightCm) metaParts.push(`${user.heightCm}cm`);
  if (user.weightKg) metaParts.push(`${user.weightKg}kg`);
  if (user.gender) metaParts.push(user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác');
  
  const meta = metaParts.length > 0 ? metaParts.join(' · ') : 'Hồ sơ chưa hoàn thiện';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          <View style={styles.profileMain}>
            {user.personImageUrl ? (
              <Image source={{ uri: user.personImageUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitials}>{initials(user.name)}</Text>
              </View>
            )}
            <View style={styles.profileText}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
              <Text style={styles.meta}>{meta}</Text>
            </View>
          </View>
          <Pressable
            style={styles.settingsMiniBtn}
            onPress={() => setShowSettings((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Cài đặt thông tin cá nhân">
            <Feather name="settings" size={16} color={theme.colors.ecoGreen} />
          </Pressable>
        </View>

       

        <View style={styles.spacer} />
        <Text style={styles.sectionTitle}>Outfit đã lưu</Text>
        {savedOutfits.length === 0 ? (
          <Text style={styles.muted}>Chưa có set nào. Hãy phối đồ bằng AI ở tab Home rồi lưu lại.</Text>
        ) : (
          <View style={styles.outfitList}>
            {savedOutfits.map((outfit) => {
              const onePiece = outfit.garments.find((g) => g.category === 'onepiece');
              const top = onePiece ?? outfit.garments.find((g) => g.category === 'top');
              const bottom = onePiece ? undefined : outfit.garments.find((g) => g.category === 'bottom');
              const shoes = outfit.garments.find((g) => g.category === 'shoes');
              return (
                <Pressable key={outfit.id} style={styles.outfitCard} onPress={() => setSelectedOutfit(outfit)}>
                  <View style={styles.stackThumb}>
                    {top ? <Image source={{ uri: top.imageUrl }} style={[styles.thumbImg, styles.thumbTop]} /> : null}
                    {bottom ? <Image source={{ uri: bottom.imageUrl }} style={[styles.thumbImg, styles.thumbMid]} /> : null}
                    {shoes ? <Image source={{ uri: shoes.imageUrl }} style={[styles.thumbImg, styles.thumbBot]} /> : null}
                  </View>
                  <Text style={styles.outfitDate} numberOfLines={1}>
                    {new Date(outfit.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.spacer} />

        {showSettings ? (
          <>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
            <View style={styles.form}>
              <Text style={styles.label}>Tên hiển thị</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tên của bạn"
                placeholderTextColor={theme.colors.textSecondary}
              />
              <Text style={styles.label}>Chiều cao (cm)</Text>
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                placeholder="Ví dụ: 170"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="number-pad"
              />
              <Text style={styles.label}>Cân nặng (kg)</Text>
              <Text style={styles.label}>Giới tính</Text>
              <View style={styles.chipRow}>
                {['male', 'female', 'unisex'].map((g) => (
                  <Pressable
                    key={g}
                    onPress={() => setGender(g)}
                    style={[styles.miniChip, gender === g && styles.miniChipActive]}
                  >
                    <Text style={[styles.miniChipLabel, gender === g && styles.miniChipLabelActive]}>
                      {g === 'male' ? 'Nam' : g === 'female' ? 'Nữ' : 'Khác'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Dáng người</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRowScroll}>
                {['rectangle', 'pear', 'inverted_triangle', 'apple', 'hourglass'].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setBodyShape(s)}
                    style={[styles.miniChip, bodyShape === s && styles.miniChipActive]}
                  >
                    <Text style={[styles.miniChipLabel, bodyShape === s && styles.miniChipLabelActive]}>
                      {s === 'rectangle' ? 'H.Chữ nhật' : s === 'pear' ? 'Quả lê' : s === 'apple' ? 'Quả táo' : s === 'hourglass' ? 'Đồng hồ cát' : 'Tam giác ngược'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <PrimaryButton
                title="Lưu thông tin"
                loading={saving}
                onPress={() => {
                  void (async () => {
                    if (saving) return;
                    const parsedHeightRaw = heightCm.trim() === '' ? null : Number(heightCm);
                    const parsedWeightRaw = weightKg.trim() === '' ? null : Number(weightKg);
                    const hasHeight = parsedHeightRaw !== null;
                    const hasWeight = parsedWeightRaw !== null;
                    const parsedHeight = parsedHeightRaw ?? null;
                    const parsedWeight = parsedWeightRaw ?? null;
                    if (
                      name.trim().length === 0 ||
                      (hasHeight && (!Number.isInteger(parsedHeightRaw) || parsedHeightRaw <= 0)) ||
                      (hasWeight && (!Number.isInteger(parsedWeightRaw) || parsedWeightRaw <= 0))
                    ) {
                      Alert.alert(
                        'Thông tin chưa hợp lệ',
                        'Tên không được để trống, chiều cao/cân nặng phải là số nguyên dương.'
                      );
                      return;
                    }
                    setSaving(true);
                    try {
                      await updateProfile({
                        name: name.trim(),
                        heightCm: parsedHeight,
                        weightKg: parsedWeight,
                        gender: gender as any,
                        bodyShape: bodyShape as any,
                      });
                      Alert.alert('Thành công', 'Đã cập nhật thông tin cá nhân.');
                    } catch (e) {
                      const msg = e instanceof Error ? e.message : 'Cập nhật thất bại';
                      Alert.alert('Lỗi', msg);
                    } finally {
                      setSaving(false);
                    }
                  })();
                }}
                style={styles.saveBtn}
              />
            </View>
            <View style={styles.spacer} />
          </>
        ) : null}

        <Pressable
          style={styles.signOut}
          onPress={() =>
            Alert.alert('Đăng xuất', 'Bạn có chắc?', [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Đăng xuất',
                style: 'destructive',
                onPress: () => {
                  void signOut();
                },
              },
            ])
          }>
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </Pressable>
      </ScrollView>
      <Modal visible={Boolean(selectedOutfit)} transparent animationType="fade" onRequestClose={closeOutfitDetail}>
        <View style={styles.modalBackdrop}>
          {selectedOutfit ? (
            <View style={styles.outfitDetailCard}>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.modalTitle}>Chi tiết outfit</Text>
                <Text style={styles.modalHint}>Bấm nút để thao tác nhanh</Text>
                <View style={styles.modalImageRow}>
                  {selectedOutfit.garments
                    .filter((g) =>
                      ['top', 'bottom', 'shoes', 'onepiece'].includes(g.category)
                    )
                    .map((g) => (
                      <View key={g.id} style={styles.modalImageWrap}>
                        <Image source={{ uri: g.imageUrl }} style={styles.modalImage} />
                        <Text style={styles.modalImageLabel} numberOfLines={1}>
                          {g.name}
                        </Text>
                      </View>
                    ))}
                </View>
                <Text style={styles.modalMeta} numberOfLines={2}>
                  {selectedOutfit.vibe}
                </Text>
                {selectedOutfit.occasion ? (
                  <Text style={styles.modalDate}>Dịp: {selectedOutfit.occasion}</Text>
                ) : null}
                {selectedOutfit.reason ? (
                  <Text style={styles.modalReason}>{selectedOutfit.reason}</Text>
                ) : null}
                <Text style={styles.modalDate}>
                  Ngày lưu: {new Date(selectedOutfit.createdAt).toLocaleDateString('vi-VN')}
                </Text>
                {selectedOutfit.tryOnImageUrl ? (
                  <View style={styles.tryOnWrap}>
                    <Text style={styles.tryOnLabel}>Ảnh mặc thử</Text>
                    <Image source={{ uri: selectedOutfit.tryOnImageUrl }} style={styles.tryOnImage} />
                  </View>
                ) : null}
                {deletingOutfit ? <Text style={styles.modalDeleting}>Đang xoá outfit...</Text> : null}
                {tryingOn ? <Text style={styles.modalTrying}>Đang mặc thử AI...</Text> : null}
                <View style={styles.modalActionRow}>
                  <Pressable
                    style={[styles.modalActionBtn, styles.modalTryOnBtn, (tryingOn || deletingOutfit) && styles.modalBtnDisabled]}
                    onPress={() => void handleTryOnOutfit()}
                    disabled={tryingOn || deletingOutfit}>
                    <Text style={styles.modalTryOnBtnText}>Mặc thử</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.modalActionBtn, styles.modalDeleteBtn, (tryingOn || deletingOutfit) && styles.modalBtnDisabled]}
                    onPress={() =>
                      Alert.alert('Xoá outfit', 'Bạn có chắc muốn xoá outfit này?', [
                        { text: 'Huỷ', style: 'cancel' },
                        { text: 'Xoá', style: 'destructive', onPress: () => void handleDeleteOutfit(selectedOutfit.id) },
                      ])
                    }
                    disabled={tryingOn || deletingOutfit}>
                    <Text style={styles.modalDeleteBtnText}>Xoá</Text>
                  </Pressable>
                </View>
                <Pressable style={styles.modalCloseBtn} onPress={closeOutfitDetail} disabled={tryingOn || deletingOutfit}>
                  <Text style={styles.modalCloseBtnText}>Đóng</Text>
                </Pressable>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  muted: {
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  scroll: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  profileMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: theme.colors.neon,
    backgroundColor: theme.colors.surfaceMuted,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.ecoGreen,
  },
  profileText: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.text,
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  meta: {
    marginTop: 6,
    fontSize: 15,
    color: theme.colors.textSecondary,
  },
  spacer: {
    height: theme.spacing.xl,
  },
  outfitList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  outfitCard: {
    width: '31.5%',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  outfitDetailCard: {
    width: '100%',
    maxHeight: '86%',
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  modalHint: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  modalImageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalImageWrap: {
    width: '31%',
  },
  modalImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalImageLabel: {
    marginTop: 4,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  modalMeta: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  modalDate: {
    marginTop: 6,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  modalReason: {
    marginTop: 6,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  modalDeleting: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.danger,
    fontWeight: '600',
  },
  modalTrying: {
    marginTop: 8,
    fontSize: 12,
    color: theme.colors.ecoGreen,
    fontWeight: '700',
  },
  tryOnWrap: {
    marginTop: 12,
  },
  tryOnLabel: {
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
  },
  tryOnImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
  },
  modalActionRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  modalActionBtn: {
    flex: 1,
    borderRadius: theme.radii.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalTryOnBtn: {
    backgroundColor: theme.colors.ecoGreen,
    borderColor: theme.colors.ecoGreen,
  },
  modalTryOnBtnText: {
    color: theme.colors.surface,
    fontWeight: '700',
  },
  modalDeleteBtn: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.danger,
  },
  modalDeleteBtnText: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  modalBtnDisabled: {
    opacity: 0.6,
  },
  modalCloseBtn: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modalCloseBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  stackThumb: {
    width: '100%',
    height: 72,
    position: 'relative',
  },
  thumbImg: {
    position: 'absolute',
    width: 34,
    height: 52,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  thumbTop: {
    left: 6,
    top: 10,
    transform: [{ rotate: '-10deg' }],
    zIndex: 3,
  },
  thumbMid: {
    left: 24,
    top: 6,
    zIndex: 2,
  },
  thumbBot: {
    left: 42,
    top: 12,
    transform: [{ rotate: '9deg' }],
    zIndex: 1,
  },
  outfitDate: {
    marginTop: 2,
    textAlign: 'center',
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  settingsMiniBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  form: {
    gap: theme.spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
  },
  saveBtn: {
    marginTop: theme.spacing.lg,
  },
  signOut: {
    marginTop: theme.spacing.xl,
    alignSelf: 'center',
    paddingVertical: theme.spacing.sm,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.danger,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 4,
  },
  chipRowScroll: {
    marginTop: 4,
  },
  miniChip: {
    margin: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  miniChipActive: {
    borderColor: theme.colors.neon,
    backgroundColor: theme.colors.neonSoft,
  },
  miniChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  miniChipLabelActive: {
    color: theme.colors.ecoGreen,
  },
});
