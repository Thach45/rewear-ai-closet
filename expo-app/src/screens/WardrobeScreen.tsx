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
  analyzeGarment,
  createGarment,
  deleteGarment,
  fetchGarments,
  postGarmentMedia,
  updateGarment,
} from '@/lib/garmentsApi';
import { PrimaryButton } from '@/components/PrimaryButton';
import { pickImage } from '@/utils/pickImage';
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
  { key: 'onepiece', label: WARDROBE_CATEGORY_LABELS.onepiece },
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
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
        onPanResponderMove: (_evt, gestureState) => {
          const pull = Math.min(maxTagPull, Math.max(-maxTagPull, gestureState.dx));
          tagPullY.setValue(pull);
        },
        onPanResponderRelease: (_evt, gestureState) => {
          if (gestureState.dx <= -45) {
            setGestureEditRequested(true);
          }
          Animated.spring(tagPullY, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(tagPullY, { toValue: 0, useNativeDriver: true }).start();
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
      setItems(list.map(mapGarmentToRackItem));
    } catch (e) {
      Alert.alert('Lỗi', 'Không tải được tủ đồ');
    } finally {
      setListLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void loadGarments(); }, [loadGarments]));

  const visibleItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    if (activeCategory === 'cpw') {
      return [...items].filter(i => i.wearCount > 0).sort((a, b) => {
        const cpwA = a.purchasePriceVnd ? a.purchasePriceVnd / a.wearCount : -1;
        const cpwB = b.purchasePriceVnd ? b.purchasePriceVnd / b.wearCount : -1;
        return cpwB - cpwA;
      });
    }
    return items.filter(i => i.category === activeCategory);
  }, [activeCategory, items]);

  useEffect(() => {
    const listener = scrollX.addListener(({ value }) => {
      const index = Math.round(value / ITEM_WIDTH);
      if (index !== activeIndex && index >= 0 && index < visibleItems.length) {
        setActiveIndex(index);
      }
    });
    return () => scrollX.removeListener(listener);
  }, [activeIndex, scrollX, visibleItems.length]);

  const handlePressCard = (index: number, item: WardrobeRackItem) => {
    if (index === activeIndex) {
      setDetailItem(item);
      setEditingDetail(false);
    } else {
      scrollViewRef.current?.scrollTo({ x: index * ITEM_WIDTH, animated: true });
    }
  };

  const handleAddCapture = async () => {
    setCapturing(true);
    try {
      const uri = await pickImage({ allowsEditing: false, quality: 0.88 });
      if (uri) {
        setCapturePreviewUri(uri);
        setNewCategory('top');
      }
    } finally { setCapturing(false); }
  };

  const handleAIAnalyze = async () => {
    if (!capturePreviewUri) return;
    setIsAnalyzing(true);
    try {
      const uploadedUrl = await postGarmentMedia({ uri: capturePreviewUri, name: 'ai.jpg', type: 'image/jpeg' });
      const result = await analyzeGarment(uploadedUrl);
      if (result.category) setNewCategory(result.category as WardrobeCategory);
      setAiResult(result);
      setCapturePreviewUri(uploadedUrl);
    } catch (e) {
      Alert.alert('Lỗi AI', 'Không thể phân tích ảnh lúc này.');
    } finally { setIsAnalyzing(false); }
  };

  const handleSaveNewGarment = async () => {
    if (!capturePreviewUri || savingNew) return;
    setSavingNew(true);
    try {
      const finalUrl = capturePreviewUri.startsWith('http') ? capturePreviewUri : await postGarmentMedia({ uri: capturePreviewUri, name: 'g.jpg', type: 'image/jpeg' });
      const created = await createGarment({
        name: aiResult?.name || `${WARDROBE_CATEGORY_LABELS[newCategory]} ${new Date().toLocaleDateString()}`,
        category: newCategory,
        imageUrl: finalUrl,
        ...aiResult
      });
      setItems(prev => [mapGarmentToRackItem(created), ...prev]);
      setCapturePreviewUri(null);
      setAiResult(null);
    } catch (e) { Alert.alert('Lỗi', 'Lưu thất bại'); }
    finally { setSavingNew(false); }
  };

  const handleSaveDetail = async () => {
    if (!detailItem || !detailDraft) return;
    setSavingDetail(true);
    try {
      const updated = await updateGarment(detailItem.id, {
        ...detailDraft,
        purchasePriceVnd: detailDraft.purchasePriceVnd ? Number(detailDraft.purchasePriceVnd) : null
      } as any);
      const mapped = mapGarmentToRackItem(updated);
      setItems(prev => prev.map(it => it.id === mapped.id ? mapped : it));
      setDetailItem(mapped);
      setEditingDetail(false);
    } catch (e) { Alert.alert('Lỗi', 'Cập nhật thất bại'); }
    finally { setSavingDetail(false); }
  };

  const startEditingDetail = useCallback(() => {
    if (!detailItem) return;
    setDetailDraft({
      name: detailItem.name,
      category: detailItem.category,
      brand: detailItem.brand || '',
      material: detailItem.material || '',
      fit: detailItem.fit || '',
      pattern: detailItem.pattern || 'solid',
      size: detailItem.size || '',
      color: detailItem.color || '',
      careWash: detailItem.careWash || '',
      careDry: detailItem.careDry || '',
      note: detailItem.note || '',
      purchasePriceVnd: detailItem.purchasePriceVnd ? String(detailItem.purchasePriceVnd) : '',
    });
    setEditingDetail(true);
  }, [detailItem]);

  useEffect(() => {
    if (gestureEditRequested) {
      setGestureEditRequested(false);
      if (!editingDetail) startEditingDetail();
    }
  }, [gestureEditRequested, editingDetail, startEditingDetail]);

  const countLabel = `${visibleItems.length} món · ${activeCategory === 'all' ? 'Tất cả' : activeCategory === 'cpw' ? 'Lãng phí' : WARDROBE_CATEGORY_LABELS[activeCategory as WardrobeCategory]}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tủ đồ</Text>
          <Text style={styles.count}>{countLabel}</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={handleAddCapture} disabled={capturing}>
          {capturing ? <ActivityIndicator color={theme.colors.ecoGreen} /> : <Ionicons name="add" size={28} color={theme.colors.ecoGreen} />}
        </Pressable>
      </View>

      <View style={styles.categoryStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChipsContent}>
          {FILTER_CHIPS.map(c => (
            <Pressable key={c.key} onPress={() => setActiveCategory(c.key)} style={[styles.categoryChip, activeCategory === c.key && styles.categoryChipActive]}>
              <Text style={[styles.categoryChipLabel, activeCategory === c.key && styles.categoryChipLabelActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.rackZone}>
        <View style={styles.rod} />
        {listLoading ? (
          <View style={styles.rackLoading}><ActivityIndicator size="large" color={theme.colors.ecoGreen} /></View>
        ) : (
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: (SCREEN_W - ITEM_WIDTH) / 2, paddingTop: 40 }}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
            scrollEventThrottle={16}
          >
            {visibleItems.map((item, index) => (
              <View key={item.id} style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
                <Animated.View style={[styles.cardContainer, {
                  opacity: scrollX.interpolate({ inputRange: [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH], outputRange: [0.3, 1, 0.3], extrapolate: 'clamp' }),
                  transform: [{ scale: scrollX.interpolate({ inputRange: [(index - 1) * ITEM_WIDTH, index * ITEM_WIDTH, (index + 1) * ITEM_WIDTH], outputRange: [0.85, 1.1, 0.85], extrapolate: 'clamp' }) }]
                }]}>
                  <Pressable onPress={() => handlePressCard(index, item)} style={styles.cardPressable}>
                    <View style={styles.hook} /><View style={styles.card}><Image source={{ uri: item.image }} style={styles.cardImage} /><View style={styles.cardOverlay} /></View>
                  </Pressable>
                </Animated.View>
              </View>
            ))}
          </Animated.ScrollView>
        )}
      </View>

      <Modal visible={!!detailItem} animationType="slide" transparent onRequestClose={() => setDetailItem(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chi tiết trang phục</Text>
              <Pressable style={styles.closeBtn} onPress={() => setDetailItem(null)}><Ionicons name="close" size={24} color={theme.colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScroll}>
              {detailItem && (
                <>
                  <View style={styles.modalHeroCard}>
                    <Image source={{ uri: detailItem.image }} style={styles.modalImage} />
                    <View style={styles.modalHeroOverlay} />
                    <View style={styles.modalHeroContent}>
                      <Text style={styles.modalHeroTitle}>{detailItem.name}</Text>
                      <Text style={styles.modalHeroSubtitle}>{detailItem.brand || 'No Brand'}</Text>
                    </View>
                  </View>

                  <View style={styles.modalInfoBox}>
                    {editingDetail && detailDraft ? (
                      <View style={styles.editFormCard}>
                        <Text style={styles.editLabel}>Tên</Text>
                        <TextInput value={detailDraft.name} onChangeText={t => setDetailDraft(p => p ? {...p, name: t} : p)} style={styles.editInput} />
                        <Text style={styles.editLabel}>Thương hiệu</Text>
                        <TextInput value={detailDraft.brand} onChangeText={t => setDetailDraft(p => p ? {...p, brand: t} : p)} style={styles.editInput} />
                        <Text style={styles.editLabel}>Chất liệu</Text>
                        <TextInput value={detailDraft.material} onChangeText={t => setDetailDraft(p => p ? {...p, material: t} : p)} style={styles.editInput} />
                        <Text style={styles.editLabel}>Màu sắc</Text>
                        <TextInput value={detailDraft.color} onChangeText={t => setDetailDraft(p => p ? {...p, color: t} : p)} style={styles.editInput} />
                        <Text style={styles.editLabel}>Giá mua (VND)</Text>
                        <TextInput value={detailDraft.purchasePriceVnd} onChangeText={t => setDetailDraft(p => p ? {...p, purchasePriceVnd: t} : p)} style={styles.editInput} keyboardType="numeric" />
                        <PrimaryButton title="Lưu thay đổi" loading={savingDetail} onPress={handleSaveDetail} style={{marginTop: 16}} variant="neon" />
                        <Pressable onPress={() => setEditingDetail(false)} style={styles.detailCancelButton}><Text style={styles.detailCancelButtonText}>Hủy</Text></Pressable>
                      </View>
                    ) : (
                      <>
                        <Text style={styles.modalSectionHeading}>Thông tin chi tiết</Text>
                        <Text style={styles.gestureHint}>Vuốt thẻ sang trái để chỉnh sửa</Text>
                        <View style={styles.detailTagWrap}>
                          <Animated.View style={[styles.detailTagCard, { transform: [{ translateX: tagPullTranslateX }, { scaleY: tagPullScaleY }, { rotateZ: tagPullRotate }] }]} {...tagPullResponder.panHandlers}>
                            <View style={styles.detailRow}><Ionicons name="pricetag-outline" size={18} color={theme.colors.ecoGreen} /><View style={styles.detailRowBody}><Text style={styles.detailLabel}>Loại</Text><Text style={styles.detailValue}>{WARDROBE_CATEGORY_LABELS[detailItem.category]}</Text></View></View>
                            <View style={styles.detailDivider} />
                            {detailItem.subCategory && (
                              <>
                                <View style={styles.detailRow}><Ionicons name="options-outline" size={18} color={theme.colors.ecoGreen} /><View style={styles.detailRowBody}><Text style={styles.detailLabel}>Loại chi tiết</Text><Text style={styles.detailValue}>{detailItem.subCategory}</Text></View></View>
                                <View style={styles.detailDivider} />
                              </>
                            )}
                            <View style={styles.detailRow}><Ionicons name="layers-outline" size={18} color={theme.colors.ecoGreen} /><View style={styles.detailRowBody}><Text style={styles.detailLabel}>Chất liệu</Text><Text style={styles.detailValue}>{detailItem.material || '—'}</Text></View></View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}><Ionicons name="color-palette-outline" size={18} color={theme.colors.ecoGreen} /><View style={styles.detailRowBody}><Text style={styles.detailLabel}>Màu sắc</Text><Text style={styles.detailValue}>{detailItem.color || '—'}</Text></View></View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}><Ionicons name="body-outline" size={18} color={theme.colors.ecoGreen} /><View style={styles.detailRowBody}><Text style={styles.detailLabel}>Form dáng</Text><Text style={styles.detailValue}>{detailItem.fit || '—'}</Text></View></View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}><Ionicons name="grid-outline" size={18} color={theme.colors.ecoGreen} /><View style={styles.detailRowBody}><Text style={styles.detailLabel}>Hoa văn</Text><Text style={styles.detailValue}>{detailItem.pattern || '—'}</Text></View></View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}><Ionicons name="cash-outline" size={18} color={theme.colors.ecoGreen} /><View style={styles.detailRowBody}><Text style={styles.detailLabel}>Giá mua</Text><Text style={styles.detailValue}>{detailItem.purchasePriceVnd ? `${detailItem.purchasePriceVnd.toLocaleString()}đ` : '—'}</Text></View></View>
                            <View style={styles.detailDivider} />
                            <View style={styles.detailRow}><Ionicons name="repeat-outline" size={18} color={theme.colors.ecoGreen} /><View style={styles.detailRowBody}><Text style={styles.detailLabel}>Số lần mặc</Text><Text style={styles.detailValue}>{detailItem.wearCount} lần</Text></View></View>
                            {detailItem.wearCount > 0 && detailItem.purchasePriceVnd && (
                              <>
                                <View style={styles.detailDivider} />
                                <View style={styles.detailRow}><Ionicons name="stats-chart-outline" size={18} color={theme.colors.ecoGreen} /><View style={styles.detailRowBody}><Text style={styles.detailLabel}>Chi phí mỗi lần mặc</Text><Text style={styles.detailValue}>{Math.round(detailItem.purchasePriceVnd / detailItem.wearCount).toLocaleString()}đ / lần</Text></View></View>
                              </>
                            )}
                          </Animated.View>
                        </View>
                      </>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!capturePreviewUri} animationType="fade" transparent onRequestClose={() => setCapturePreviewUri(null)}>
        <View style={styles.captureModalBackdrop}>
          <View style={styles.captureModalCard}>
            <Text style={styles.captureModalTitle}>Thêm vào tủ đồ</Text>
            <View style={styles.captureImageContainer}>
              <Image source={{ uri: capturePreviewUri }} style={styles.captureModalImage} resizeMode="cover" />
              {isAnalyzing && <View style={styles.analysisOverlay}><ActivityIndicator size="large" color={theme.colors.neon} /><Text style={styles.analysisText}>AI đang phân tích...</Text></View>}
            </View>
            {!aiResult && !isAnalyzing && <PrimaryButton title="AI Tự động Phân tích" onPress={handleAIAnalyze} style={styles.aiBtn} icon={<Ionicons name="sparkles" size={18} color="white" />} />}
            <Text style={styles.captureModalHint}>{aiResult ? 'AI đã điền xong!' : 'Chọn danh mục hoặc dùng AI:'}</Text>
            <Text style={styles.captureFieldLabel}>Danh mục *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.captureChipRow}>
              {CREATE_CATEGORY_CHIPS.map(it => (
                <Pressable key={it.key} onPress={() => setNewCategory(it.key)} style={[styles.captureChip, newCategory === it.key && styles.captureChipActive]}>
                  <Text style={[styles.captureChipLabel, newCategory === it.key && styles.captureChipLabelActive]}>{it.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <PrimaryButton title="Lưu vào tủ" loading={savingNew} onPress={handleSaveNewGarment} style={styles.captureSaveBtn} />
            <Pressable style={styles.captureModalDone} onPress={() => setCapturePreviewUri(null)}><Text style={styles.captureModalDoneText}>Hủy</Text></Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  title: { fontSize: 32, fontWeight: '900', color: theme.colors.text },
  count: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  addBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.neon, alignItems: 'center', justifyContent: 'center' },
  categoryStrip: { paddingBottom: 4 },
  categoryChipsContent: { paddingHorizontal: 24, gap: 8 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: '#c4c4cc', marginRight: 8 },
  categoryChipActive: { borderColor: theme.colors.ecoGreen, backgroundColor: theme.colors.neonSoft },
  categoryChipLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary },
  categoryChipLabelActive: { color: theme.colors.ecoGreen },
  rackZone: { flex: 1, marginTop: 10 },
  rod: { position: 'absolute', top: 40, left: 0, right: 0, height: 8, backgroundColor: '#d4d4d8' },
  rackLoading: { flex: 1, justifyContent: 'center' },
  cardContainer: { width: CARD_WIDTH, height: 380, alignItems: 'center' },
  cardPressable: { width: '100%', height: '100%', alignItems: 'center' },
  hook: { width: 24, height: 36, borderWidth: 4, borderBottomWidth: 0, borderColor: '#a1a1aa', borderTopLeftRadius: 12, borderTopRightRadius: 12, marginBottom: -4 },
  card: { width: '100%', flex: 1, borderRadius: 24, backgroundColor: theme.colors.surface, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.1)' },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  modalContent: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 20, backgroundColor: theme.colors.surface },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  modalScroll: { paddingBottom: 40 },
  modalHeroCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 24, overflow: 'hidden' },
  modalImage: { width: '100%', height: 400 },
  modalHeroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  modalHeroContent: { position: 'absolute', left: 20, bottom: 20 },
  modalHeroTitle: { fontSize: 28, fontWeight: '900', color: '#fff' },
  modalHeroSubtitle: { color: '#fff', opacity: 0.8 },
  modalInfoBox: { padding: 20 },
  modalSectionHeading: { fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: 8 },
  gestureHint: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 12 },
  detailTagWrap: { marginTop: 10 },
  detailTagCard: { width: '100%', borderRadius: 24, backgroundColor: '#fffef8', borderWidth: 1, borderColor: '#e7dfcf', padding: 16 },
  detailRow: { flexDirection: 'row', paddingVertical: 12, gap: 12 },
  detailRowBody: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' },
  detailValue: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  detailDivider: { height: 1, backgroundColor: theme.colors.border, marginLeft: 30 },
  editFormCard: { padding: 16, backgroundColor: theme.colors.surface, borderRadius: 20 },
  editLabel: { fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 4 },
  editInput: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 12, backgroundColor: theme.colors.surfaceMuted },
  detailCancelButton: { marginTop: 12, padding: 12, alignItems: 'center' },
  detailCancelButtonText: { fontWeight: '700', color: theme.colors.textSecondary },
  captureModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  captureModalCard: { backgroundColor: theme.colors.surface, borderRadius: 24, padding: 20 },
  captureModalTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  captureImageContainer: { width: '100%', height: 250, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  captureModalImage: { width: '100%', height: '100%' },
  analysisOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  analysisText: { color: '#fff', marginTop: 8, fontWeight: '600' },
  aiBtn: { marginBottom: 12, backgroundColor: theme.colors.neon },
  captureModalHint: { textAlign: 'center', fontSize: 13, color: theme.colors.textSecondary, marginBottom: 8 },
  captureFieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  captureChipRow: { marginBottom: 16 },
  captureChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.surfaceMuted, marginRight: 8, borderWidth: 1, borderColor: theme.colors.border },
  captureChipActive: { backgroundColor: theme.colors.neonSoft, borderColor: theme.colors.ecoGreen },
  captureChipLabel: { fontSize: 12, color: theme.colors.textSecondary },
  captureChipLabelActive: { color: theme.colors.ecoGreen, fontWeight: '700' },
  captureSaveBtn: { marginTop: 8 },
  captureModalDone: { marginTop: 12, padding: 12, alignItems: 'center' },
  captureModalDoneText: { color: theme.colors.textSecondary, fontWeight: '700' },
});
