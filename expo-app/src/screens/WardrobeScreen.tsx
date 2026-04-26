import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import type { WardrobeCategory } from '@/data/dummy';
import { WARDROBE_CATEGORY_LABELS, type RackWardrobeItem } from '@/data/dummy';
import {
  createGarment,
  deleteGarment,
  fetchGarments,
  postGarmentMedia,
  updateGarment,
} from '@/lib/garmentsApi';
import { PrimaryButton } from '@/components/PrimaryButton';
import { captureClothingPhoto } from '@/utils/captureClothingPhoto';
import { mapGarmentToRackItem, type WardrobeRackItem } from '@/utils/garmentMap';
import type { UpdateGarmentBody } from '@/types/garment';

const { width: SCREEN_W } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_W * 0.75;
const CARD_WIDTH = ITEM_WIDTH - 20;

const CATEGORY_CHIPS: { key: WardrobeCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'top', label: WARDROBE_CATEGORY_LABELS.top },
  { key: 'bottom', label: WARDROBE_CATEGORY_LABELS.bottom },
  { key: 'shoes', label: WARDROBE_CATEGORY_LABELS.shoes },
  { key: 'outer', label: WARDROBE_CATEGORY_LABELS.outer },
  { key: 'accessory', label: WARDROBE_CATEGORY_LABELS.accessory },
];

type DetailDraft = {
  name: string;
  category: WardrobeCategory;
  brand: string;
  material: string;
  fit: string;
  pattern: string;
  size: string;
  color: string;
  careWash: string;
  careDry: string;
  note: string;
  purchasePriceVnd: string;
};

const FILTER_CHIPS: { key: WardrobeFilterCategory; label: string }[] = [
  ...CATEGORY_CHIPS,
  { key: 'cpw', label: 'Lãng phí nhất' },
];

type WardrobeFilterCategory = WardrobeCategory | 'all' | 'cpw';

const CREATE_CATEGORY_CHIPS = CATEGORY_CHIPS.filter(
  (item): item is { key: WardrobeCategory; label: string } => item.key !== 'all'
);

export function WardrobeScreen() {
  const [items, setItems] = useState<WardrobeRackItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<WardrobeFilterCategory>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [detailItem, setDetailItem] = useState<WardrobeRackItem | null>(null);
  const [detailDraft, setDetailDraft] = useState<DetailDraft | null>(null);
  const [editingDetail, setEditingDetail] = useState(false);
  const [savingDetail, setSavingDetail] = useState(false);
  const [deletingDetail, setDeletingDetail] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capturePreviewUri, setCapturePreviewUri] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<WardrobeCategory>('top');
  const [savingNew, setSavingNew] = useState(false);
  const [gestureEditRequested, setGestureEditRequested] = useState(false);

  const scrollX = useRef(new Animated.Value(0)).current;
  const tagPullY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const categoryResetSkip = useRef(true);
  const maxTagPull = 70;

  const tagPullResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 2,
        onMoveShouldSetPanResponderCapture: (_evt, gestureState) =>
          Math.abs(gestureState.dx) > 2,
        onPanResponderMove: (_evt, gestureState) => {
          const pull = Math.min(maxTagPull, Math.max(-maxTagPull, gestureState.dx));
          tagPullY.setValue(pull);
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dx <= -45) {
            setGestureEditRequested(true);
          }
          Animated.spring(tagPullY, {
            toValue: 0,
            tension: 70,
            friction: 6,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(tagPullY, {
            toValue: 0,
            tension: 70,
            friction: 6,
            useNativeDriver: true,
          }).start();
        },
      }),
    [tagPullY]
  );

  const tagPullTranslateX = tagPullY.interpolate({
    inputRange: [-maxTagPull, 0, maxTagPull],
    outputRange: [-20, 0, 20],
    extrapolate: 'clamp',
  });
  const tagPullScaleY = tagPullY.interpolate({
    inputRange: [-maxTagPull, 0, maxTagPull],
    outputRange: [1.03, 1, 1.03],
    extrapolate: 'clamp',
  });
  const tagPullRotate = tagPullY.interpolate({
    inputRange: [-maxTagPull, 0, maxTagPull],
    outputRange: ['-2deg', '0deg', '2deg'],
    extrapolate: 'clamp',
  });

  const loadGarments = useCallback(async () => {
    setListLoading(true);
    try {
      const list = await fetchGarments();
      const mapped = list.map(mapGarmentToRackItem);
      setItems(mapped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không tải được tủ đồ';
      Alert.alert('Lỗi', msg);
    } finally {
      setListLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadGarments();
    }, [loadGarments])
  );

  const visibleItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    if (activeCategory === 'cpw') {
      return [...items]
        .filter((i) => i.wearCount > 0)
        .sort((a, b) => {
          const cpwA = a.purchasePriceVnd != null ? a.purchasePriceVnd / Math.max(a.wearCount, 1) : -1;
          const cpwB = b.purchasePriceVnd != null ? b.purchasePriceVnd / Math.max(b.wearCount, 1) : -1;
          return cpwB - cpwA;
        });
    }
    return items.filter((i) => i.category === activeCategory);
  }, [activeCategory, items]);

  useEffect(() => {
    if (categoryResetSkip.current) {
      categoryResetSkip.current = false;
      return;
    }
    setActiveIndex(0);
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
    scrollX.setValue(0);
  }, [activeCategory, scrollX]);

  useEffect(() => {
    if (visibleItems.length === 0) return;
    if (activeIndex >= visibleItems.length) {
      setActiveIndex(0);
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
      scrollX.setValue(0);
    }
  }, [visibleItems.length, activeIndex, scrollX]);

  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      const index = Math.round(value / ITEM_WIDTH);
      if (
        index !== activeIndex &&
        index >= 0 &&
        index < visibleItems.length
      ) {
        setActiveIndex(index);
      }
    });
    return () => scrollX.removeListener(listener);
  }, [activeIndex, scrollX, visibleItems.length]);

  const goToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: index * ITEM_WIDTH, animated: true });
  };

  const handlePressCard = (index: number, item: WardrobeRackItem) => {
    if (index === activeIndex) {
      setDetailItem(item);
      setEditingDetail(false);
      setDetailDraft(null);
    } else {
      goToIndex(index);
    }
  };

  const countLabel = useMemo(() => {
    if (activeCategory === 'all') return `${items.length} món đang treo`;
    if (activeCategory === 'cpw') return `${visibleItems.length} món · Lãng phí nhất`;
    return `${visibleItems.length} món · ${WARDROBE_CATEGORY_LABELS[activeCategory]}`;
  }, [activeCategory, items.length, visibleItems.length]);

  const showSavedToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Thành công', message);
  };

  const handleAddCapture = async () => {
    setCapturing(true);
    try {
      const uri = await captureClothingPhoto();
      if (uri) {
        setCapturePreviewUri(uri);
        setNewCategory('top');
      }
    } finally {
      setCapturing(false);
    }
  };

  const handleSaveNewGarment = async () => {
    if (!capturePreviewUri || savingNew) return;
    const name = `${WARDROBE_CATEGORY_LABELS[newCategory]} ${new Date().toLocaleDateString('vi-VN')}`;
    setSavingNew(true);
    try {
      const url = await postGarmentMedia({
        uri: capturePreviewUri,
        name: 'garment.jpg',
        type: 'image/jpeg',
      });
      const created = await createGarment({
        name,
        category: newCategory,
        imageUrl: url,
        recycledImageUrl: url,
        brand: '—',
        material: '—',
        fit: '—',
        pattern: 'solid',
        size: '—',
        color: '—',
        careWash: '—',
        careDry: '—',
      });
      const mapped = mapGarmentToRackItem(created);
      setItems((prev) => [mapped, ...prev]);
      setCapturePreviewUri(null);
      setActiveCategory('all');
      setActiveIndex(0);
      scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      scrollX.setValue(0);
      showSavedToast('Đã lưu vào tủ');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lưu thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setSavingNew(false);
    }
  };

  const startEditingDetail = useCallback(() => {
    if (!detailItem) return;
    setDetailDraft({
      name: detailItem.name,
      category: detailItem.category,
      brand: detailItem.brand,
      material: detailItem.material,
      fit: detailItem.fit ?? '—',
      pattern: detailItem.pattern ?? 'solid',
      size: detailItem.size,
      color: detailItem.color,
      careWash: detailItem.careWash,
      careDry: detailItem.careDry,
      note: detailItem.note ?? '',
      purchasePriceVnd: detailItem.purchasePriceVnd != null ? String(Math.round(detailItem.purchasePriceVnd)) : '',
    });
    setEditingDetail(true);
  }, [detailItem]);

  useEffect(() => {
    if (!gestureEditRequested) return;
    setGestureEditRequested(false);
    if (!editingDetail) {
      startEditingDetail();
    }
  }, [editingDetail, gestureEditRequested, startEditingDetail]);

  const handleSaveDetail = async () => {
    if (!detailItem || !detailDraft || savingDetail) return;
    const payload: UpdateGarmentBody = {
      name: detailDraft.name.trim(),
      category: detailDraft.category,
      brand: detailDraft.brand.trim() || '—',
      material: detailDraft.material.trim() || '—',
      fit: detailDraft.fit.trim() || '—',
      pattern: detailDraft.pattern.trim() || 'solid',
      size: detailDraft.size.trim() || '—',
      color: detailDraft.color.trim() || '—',
      careWash: detailDraft.careWash.trim() || '—',
      careDry: detailDraft.careDry.trim() || '—',
      note: detailDraft.note.trim() || null,
      purchasePriceVnd:
        detailDraft.purchasePriceVnd.trim() === '' ? null : Number(detailDraft.purchasePriceVnd),
    };
    if (
      payload.purchasePriceVnd !== null &&
      payload.purchasePriceVnd !== undefined &&
      (!Number.isFinite(payload.purchasePriceVnd) || payload.purchasePriceVnd < 0)
    ) {
      Alert.alert('Thiếu thông tin', 'Giá mua phải là số lớn hơn hoặc bằng 0.');
      return;
    }
    if (!payload.name) {
      Alert.alert('Thiếu thông tin', 'Tên món đồ không được để trống.');
      return;
    }
    setSavingDetail(true);
    try {
      const updated = await updateGarment(detailItem.id, payload);
      const mapped = mapGarmentToRackItem(updated);
      setItems((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
      setDetailItem(mapped);
      setEditingDetail(false);
      showSavedToast('Đã cập nhật món đồ');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Cập nhật thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setSavingDetail(false);
    }
  };

  const handleDeleteDetail = () => {
    if (!detailItem || deletingDetail) return;
    Alert.alert('Xóa món đồ?', 'Hành động này không thể hoàn tác.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          setDeletingDetail(true);
          try {
            await deleteGarment(detailItem.id);
            setItems((prev) => prev.filter((item) => item.id !== detailItem.id));
            setDetailItem(null);
            setEditingDetail(false);
            setDetailDraft(null);
            showSavedToast('Đã xóa món đồ');
          } catch (e) {
            const msg = e instanceof Error ? e.message : 'Xóa thất bại';
            Alert.alert('Lỗi', msg);
          } finally {
            setDeletingDetail(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tủ đồ</Text>
          <Text style={styles.count}>{countLabel}</Text>
        </View>
        <Pressable
          style={[styles.addBtn, capturing && styles.addBtnBusy]}
          onPress={handleAddCapture}
          disabled={capturing}
          accessibilityLabel="Chụp quần áo"
        >
          {capturing ? (
            <ActivityIndicator size="small" color={theme.colors.ecoGreen} />
          ) : (
            <Ionicons name="add" size={28} color={theme.colors.ecoGreen} />
          )}
        </Pressable>
      </View>

      <View style={styles.categoryStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChipsContent}
        >
          {FILTER_CHIPS.map((c) => {
            const selected = activeCategory === c.key;
            return (
              <Pressable
                key={c.key}
                onPress={() => setActiveCategory(c.key)}
                style={[styles.categoryChip, selected && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipLabel, selected && styles.categoryChipLabelActive]}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.categoryStripLine} />
      </View>

      {/* KHÔNG GIAN 3D TỦ ĐỒ (Hanger Rack) */}
      <View style={styles.rackZone}>
        {/* Thanh treo đồ (Rod) */}
        <View style={styles.rod} />

        {listLoading ? (
          <View style={styles.rackLoading}>
            <ActivityIndicator size="large" color={theme.colors.ecoGreen} />
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={styles.rackEmpty}>
            <Ionicons name="shirt-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.rackEmptyTitle}>Chưa có món nào</Text>
            <Text style={styles.rackEmptyHint}>
              {activeCategory === 'cpw'
                ? 'Bấm "Mặc ngay" để tăng số lần mặc, rồi nhập giá mua để tính lãng phí.'
                : 'Chụp ảnh (+) để thêm vào tủ đồ.'}
            </Text>
          </View>
        ) : (
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={ITEM_WIDTH}
          decelerationRate="fast"
          contentContainerStyle={{
            paddingHorizontal: (SCREEN_W - ITEM_WIDTH) / 2,
            paddingTop: 40,
          }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {visibleItems.map((item, index) => {
            const inputRange = [
              (index - 1) * ITEM_WIDTH,
              index * ITEM_WIDTH,
              (index + 1) * ITEM_WIDTH,
            ];

            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.85, 1.1, 0.85],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });

            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [0, 15, 0],
              extrapolate: 'clamp',
            });

            const rotateZ = scrollX.interpolate({
              inputRange,
              outputRange: ['-8deg', '0deg', '8deg'],
              extrapolate: 'clamp',
            });

            return (
              <View key={item.id} style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
                <Animated.View
                  style={[
                    styles.cardContainer,
                    {
                      opacity,
                      transform: [{ scale }, { translateY }, { rotateZ }],
                    },
                  ]}
                >
                  <Pressable onPress={() => handlePressCard(index, item)} style={styles.cardPressable}>
                    {/* Móc treo */}
                    <View style={styles.hook} />
                    
                    {/* Thẻ món đồ bằng Ảnh thật */}
                    <View style={styles.card}>
                      <Image source={{ uri: item.image }} style={styles.cardImage} />
                      
                      {/* Lớp phủ Gradient mờ cho chữ dễ đọc */}
                      <View style={styles.cardOverlay} />

                      <View style={styles.wearCountBadge}>
                        <Ionicons name="repeat-outline" size={13} color={theme.colors.surface} />
                        <Text style={styles.wearCountText}>{item.wearCount} lần mặc</Text>
                      </View>
                      
                      <View style={styles.brandBadge}>
                        <Text style={styles.brandText} numberOfLines={1}>{item.brand}</Text>
                      </View>
                    </View>
                  </Pressable>
                </Animated.View>
              </View>
            );
          })}
        </Animated.ScrollView>
        )}
      </View>

      <Modal
        visible={!!detailItem}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setDetailItem(null);
          setEditingDetail(false);
          setDetailDraft(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết trang phục</Text>
              <Pressable
                style={styles.closeBtn}
                onPress={() => {
                  setDetailItem(null);
                  setEditingDetail(false);
                  setDetailDraft(null);
                }}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              <View style={styles.modalHeroCard}>
                <Image source={{ uri: detailItem?.image }} style={styles.modalImage} />
                <View style={styles.modalHeroOverlay} />
                <View style={styles.modalHeroContent}>
                  <View style={styles.modalHeroTopRow}>
                    <View style={styles.modalHeroBadge}>
                      <Text style={styles.modalHeroBadgeText}>
                        {detailItem ? WARDROBE_CATEGORY_LABELS[detailItem.category] : ''}
                      </Text>
                    </View>
                    <View style={styles.modalHeroBadge}>
                      <Text style={styles.modalHeroBadgeText}>{detailItem?.brand ?? '—'}</Text>
                    </View>
                  </View>
                  <Text style={styles.modalHeroTitle}>{detailItem?.name}</Text>
                  <Text style={styles.modalHeroSubtitle}>
                    Premium wardrobe detail - chỉnh sửa và tái sinh ngay tại đây
                  </Text>
                </View>
                {!editingDetail ? (
                  <Pressable
                    style={[styles.modalDeleteFab, deletingDetail && styles.modalDeleteFabDisabled]}
                    onPress={handleDeleteDetail}
                    disabled={deletingDetail}>
                    {deletingDetail ? (
                      <ActivityIndicator size="small" color={theme.colors.surface} />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={16} color={theme.colors.surface} />
                        <Text style={styles.modalDeleteFabText}>Xóa</Text>
                      </>
                    )}
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.modalInfoBox}>

                {detailItem ? (
                  <>
                    {editingDetail && detailDraft ? (
                      <>
                        <Text style={styles.modalSectionHeading}>Chỉnh sửa</Text>
                        <View style={styles.editFormCard}>
                          <Text style={styles.editLabel}>Tên</Text>
                          <TextInput
                            value={detailDraft.name}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, name: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="Tên món đồ"
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Danh mục</Text>
                          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.captureChipRow}>
                            {CREATE_CATEGORY_CHIPS.map((item) => {
                              const selected = detailDraft.category === item.key;
                              return (
                                <Pressable
                                  key={item.key}
                                  onPress={() =>
                                    setDetailDraft((prev) => (prev ? { ...prev, category: item.key } : prev))
                                  }
                                  style={[styles.captureChip, selected && styles.captureChipActive]}>
                                  <Text style={[styles.captureChipLabel, selected && styles.captureChipLabelActive]}>
                                    {item.label}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                          <Text style={styles.editLabel}>Thương hiệu</Text>
                          <TextInput
                            value={detailDraft.brand}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, brand: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="—"
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Chất liệu</Text>
                          <TextInput
                            value={detailDraft.material}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, material: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="—"
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Form dáng</Text>
                          <TextInput
                            value={detailDraft.fit}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, fit: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="regular / oversized..."
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Hoa văn</Text>
                          <TextInput
                            value={detailDraft.pattern}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, pattern: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="solid / striped / floral..."
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Size / cỡ</Text>
                          <TextInput
                            value={detailDraft.size}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, size: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="—"
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Màu</Text>
                          <TextInput
                            value={detailDraft.color}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, color: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="—"
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Giặt</Text>
                          <TextInput
                            value={detailDraft.careWash}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, careWash: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="—"
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Phơi & bảo quản</Text>
                          <TextInput
                            value={detailDraft.careDry}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, careDry: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="—"
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Ghi chú</Text>
                          <TextInput
                            value={detailDraft.note}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, note: value } : prev))
                            }
                            style={[styles.editInput, styles.editTextarea]}
                            multiline
                            placeholder="Nhập ghi chú"
                            placeholderTextColor={theme.colors.textSecondary}
                          />
                          <Text style={styles.editLabel}>Giá mua (VND)</Text>
                          <TextInput
                            value={detailDraft.purchasePriceVnd}
                            onChangeText={(value) =>
                              setDetailDraft((prev) => (prev ? { ...prev, purchasePriceVnd: value } : prev))
                            }
                            style={styles.editInput}
                            placeholder="Ví dụ: 850000"
                            placeholderTextColor={theme.colors.textSecondary}
                            keyboardType="number-pad"
                          />
                        </View>
                        <PrimaryButton
                          title="Lưu thay đổi"
                          loading={savingDetail}
                          onPress={() => {
                            void handleSaveDetail();
                          }}
                          style={styles.detailSaveButton}
                          variant="neon"
                        />
                        <Pressable
                          style={styles.detailCancelButton}
                          onPress={() => {
                            setEditingDetail(false);
                            setDetailDraft(null);
                          }}
                          disabled={savingDetail}>
                          <Text style={styles.detailCancelButtonText}>Hủy chỉnh sửa</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Text style={styles.modalSectionHeading}>Thông tin</Text>
                        <Text style={styles.gestureHint}>Vuốt thẻ sang trái để mở form chỉnh sửa</Text>
                        <View style={styles.detailTagWrap}>
                          <Animated.View
                            style={[
                              styles.detailTagPullTouch,
                              {
                                transform: [{ translateX: tagPullTranslateX }],
                              },
                            ]}
                            {...tagPullResponder.panHandlers}>
                            <View style={styles.detailTagHookOuter}>
                              <View style={styles.detailTagHookInner} />
                            </View>
                          </Animated.View>
                          <Animated.View
                            style={[
                              styles.detailTagCard,
                              {
                                transform: [
                                  { translateX: tagPullTranslateX },
                                  { scaleY: tagPullScaleY },
                                  { rotateZ: tagPullRotate },
                                ],
                              },
                            ]}
                            {...tagPullResponder.panHandlers}>
                            <View style={styles.detailTagAnchorDot} />
                            <View style={styles.detailRow}>
                              <Ionicons name="pricetag-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Loại</Text>
                                <Text style={styles.detailValue}>
                                  {WARDROBE_CATEGORY_LABELS[detailItem.category]}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="layers-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Chất liệu</Text>
                                <Text style={styles.detailValue}>{detailItem.material}</Text>
                              </View>
                            </View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="body-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Form dáng</Text>
                                <Text style={styles.detailValue}>{detailItem.fit ?? '—'}</Text>
                              </View>
                            </View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="grid-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Hoa văn</Text>
                                <Text style={styles.detailValue}>{detailItem.pattern ?? '—'}</Text>
                              </View>
                            </View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="color-palette-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Màu</Text>
                                <Text style={styles.detailValue}>{detailItem.color}</Text>
                              </View>
                            </View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="resize-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Size / cỡ</Text>
                                <Text style={styles.detailValue}>{detailItem.size}</Text>
                              </View>
                            </View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="water-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Giặt</Text>
                                <Text style={styles.detailValue}>{detailItem.careWash}</Text>
                              </View>
                            </View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="sunny-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Phơi & bảo quản</Text>
                                <Text style={styles.detailValue}>{detailItem.careDry}</Text>
                              </View>
                            </View>
                            {detailItem.note ? (
                              <>
                                <View style={styles.detailDivider} />
                                <View style={styles.detailRow}>
                                  <Ionicons name="document-text-outline" size={18} color={theme.colors.ecoGreen} />
                                  <View style={styles.detailRowBody}>
                                    <Text style={styles.detailLabel}>Ghi chú</Text>
                                    <Text style={styles.detailValue}>{detailItem.note}</Text>
                                  </View>
                                </View>
                              </>
                            ) : null}
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="repeat-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Số lần mặc</Text>
                                <Text style={styles.detailValue}>{detailItem.wearCount} lần</Text>
                              </View>
                            </View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="cash-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Giá mua</Text>
                                <Text style={styles.detailValue}>
                                  {detailItem.purchasePriceVnd != null
                                    ? `${Math.round(detailItem.purchasePriceVnd).toLocaleString('vi-VN')}đ`
                                    : 'Chưa nhập'}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}>
                              <Ionicons name="stats-chart-outline" size={18} color={theme.colors.ecoGreen} />
                              <View style={styles.detailRowBody}>
                                <Text style={styles.detailLabel}>Chi phí mỗi lần mặc</Text>
                                <Text style={styles.detailValue}>
                                  {detailItem.purchasePriceVnd != null && detailItem.wearCount > 0
                                    ? `${Math.round(
                                        detailItem.purchasePriceVnd / detailItem.wearCount
                                      ).toLocaleString('vi-VN')}đ / lần`
                                    : 'Chưa đủ dữ liệu'}
                                </Text>
                              </View>
                            </View>
                          </Animated.View>
                        </View>
                      </>
                    )}

                  </>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!capturePreviewUri}
        animationType="fade"
        transparent
        onRequestClose={() => setCapturePreviewUri(null)}
      >
        <View style={styles.captureModalBackdrop}>
          <View style={styles.captureModalCard}>
            <Text style={styles.captureModalTitle}>Thêm vào tủ đồ</Text>
            {capturePreviewUri ? (
              <Image source={{ uri: capturePreviewUri }} style={styles.captureModalImage} resizeMode="cover" />
            ) : null}
            <Text style={styles.captureModalHint}>
              Chọn danh mục, tên sẽ tự tạo và có thể sửa sau trong chi tiết.
            </Text>
            <Text style={styles.captureFieldLabel}>Danh mục *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.captureChipRow}>
              {CREATE_CATEGORY_CHIPS.map((item) => {
                const selected = item.key === newCategory;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setNewCategory(item.key)}
                    style={[styles.captureChip, selected && styles.captureChipActive]}>
                    <Text style={[styles.captureChipLabel, selected && styles.captureChipLabelActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <PrimaryButton
              title="Lưu vào tủ"
              loading={savingNew}
              onPress={() => {
                void handleSaveNewGarment();
              }}
              style={styles.captureSaveBtn}
            />
            <Pressable
              style={styles.captureModalDone}
              onPress={() => setCapturePreviewUri(null)}
              disabled={savingNew}>
              <Text style={styles.captureModalDoneText}>Hủy</Text>
            </Pressable>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
    zIndex: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  count: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.neon,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.neon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnBusy: {
    opacity: 0.85,
  },
  categoryStrip: {
    paddingBottom: 4,
    zIndex: 12,
  },
  categoryChipsContent: {
    paddingHorizontal: 24,
    paddingVertical: 4,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: '#c4c4cc',
    marginRight: 8,
    shadowColor: '#71717a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipActive: {
    borderColor: theme.colors.ecoGreen,
    backgroundColor: theme.colors.neonSoft,
    borderWidth: 1.5,
    shadowColor: theme.colors.ecoGreen,
    shadowOpacity: 0.18,
  },
  categoryChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  categoryChipLabelActive: {
    color: theme.colors.ecoGreen,
  },
  categoryStripLine: {
    marginHorizontal: 24,
    height: 1,
    backgroundColor: '#d4d4d8',
    opacity: 0.85,
  },
  rackZone: {
    flex: 1,
    position: 'relative',
    marginTop: 10,
  },
  rod: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: '#d4d4d8',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#a1a1aa',
  },
  rackLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 320,
  },
  rackEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 320,
  },
  rackEmptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  rackEmptyHint: {
    marginTop: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  cardContainer: {
    width: CARD_WIDTH,
    height: 380,
    alignItems: 'center',
  },
  cardPressable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  hook: {
    width: 24,
    height: 36,
    borderWidth: 4,
    borderBottomWidth: 0,
    borderColor: '#a1a1aa',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: -4,
    zIndex: 10,
  },
  card: {
    width: '100%',
    flex: 1,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: theme.colors.ecoGreen,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  brandBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  wearCountBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(13, 79, 60, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  wearCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.surface,
  },
  brandText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  bottomPanel: {
    backgroundColor: theme.colors.ecoGreen,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  navBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.3,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: theme.colors.neon,
  },
  infoBox: {
    alignItems: 'center',
  },
  itemName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: theme.colors.surface,
    letterSpacing: 0.5,
  },
  itemDesc: {
    fontSize: 15,
    color: theme.colors.surfaceMuted,
    marginTop: 6,
    opacity: 0.9,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neon,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  actionBtnText: {
    color: theme.colors.ecoGreen,
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingBottom: 40,
  },
  modalHeroCard: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  modalImage: {
    width: '100%',
    height: 470,
    resizeMode: 'cover',
  },
  modalHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalHeroContent: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  modalHeroTopRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  modalHeroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeroBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.ecoGreen,
    letterSpacing: 0.3,
  },
  modalHeroTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  modalHeroSubtitle: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  modalDeleteFab: {
    position: 'absolute',
    right: 14,
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    backgroundColor: 'rgba(220,38,38,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  modalDeleteFabDisabled: {
    opacity: 0.75,
  },
  modalDeleteFabText: {
    color: theme.colors.surface,
    fontWeight: '800',
    fontSize: 13,
  },
  modalInfoBox: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  modalSectionHeading: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  gestureHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: -4,
    marginBottom: 8,
  },
  detailCard: {
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
    ...theme.shadow.soft,
  },
  detailTagWrap: {
    alignItems: 'center',
    marginTop: 2,
  },
  detailTagPullTouch: {
    width: 64,
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 4,
    marginBottom: -6,
  },
  detailTagHookOuter: {
    width: 30,
    height: 30,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#9ca3af',
    marginBottom: -4,
    zIndex: 3,
    backgroundColor: 'transparent',
  },
  detailTagHookInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#9ca3af',
    alignSelf: 'center',
    marginTop: 8,
  },
  detailTagCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#fffef8',
    borderWidth: 1.5,
    borderColor: '#e7dfcf',
    overflow: 'hidden',
    ...theme.shadow.soft,
  },
  detailTagAnchorDot: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  editFormCard: {
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadow.soft,
  },
  editLabel: {
    marginTop: 10,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  editInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.text,
    fontSize: 15,
  },
  editTextarea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  detailSaveButton: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.full,
  },
  detailCancelButton: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.full,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  detailCancelButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  detailActionRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'flex-start',
  },
  detailEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(13,79,60,0.2)',
    backgroundColor: 'rgba(13,79,60,0.05)',
  },
  detailEditButtonText: {
    color: theme.colors.ecoGreen,
    fontSize: 13,
    fontWeight: '700',
  },
  detailDeleteButton: {
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.2)',
    backgroundColor: 'rgba(220,38,38,0.05)',
    paddingHorizontal: 10,
  },
  detailDeleteButtonDisabled: {
    opacity: 0.7,
  },
  detailDeleteButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  detailDeleteButtonText: {
    color: theme.colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  detailRowBody: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 21,
  },
  detailDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginLeft: 14 + 18 + 12,
  },
  markOldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginTop: 8,
    gap: 8,
    ...theme.shadow.soft,
  },
  markOldCardActive: {
    borderColor: theme.colors.ecoGreen,
    backgroundColor: theme.colors.neonSoft,
  },
  markOldCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  markOldIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOldIconCircleOn: {
    backgroundColor: theme.colors.surface,
  },
  markOldCardTextWrap: {
    flex: 1,
  },
  markOldCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.text,
  },
  markOldCardSub: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  captureModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  captureModalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  captureModalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.lg,
    maxHeight: '90%',
  },
  captureModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  captureModalImage: {
    width: '100%',
    height: SCREEN_W * 0.85,
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surfaceMuted,
  },
  captureModalHint: {
    marginTop: theme.spacing.sm,
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  captureFieldLabel: {
    marginTop: theme.spacing.md,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  captureInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surfaceMuted,
  },
  captureChipRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  captureChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  captureChipActive: {
    borderColor: theme.colors.ecoGreen,
    backgroundColor: theme.colors.neonSoft,
  },
  captureChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  captureChipLabelActive: {
    color: theme.colors.ecoGreen,
  },
  captureSaveBtn: {
    marginTop: theme.spacing.lg,
  },
  captureModalDone: {
    marginTop: theme.spacing.md,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  captureModalDoneText: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textSecondary,
  },
});
