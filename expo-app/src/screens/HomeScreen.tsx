import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VibeChipRow } from '@/components/VibeChipRow';
import { theme } from '@/constants/theme';
import {
  type RackWardrobeItem,
  VIBES,
} from '@/data/dummy';
import { fetchGarments, markGarmentWorn } from '@/lib/garmentsApi';
import { createWearLog, saveAiOutfit, suggestAiOutfit } from '@/lib/outfitsApi';
import type { MainTabParamList } from '@/navigation/types';
import { mapGarmentToRackItem, type WardrobeRackItem } from '@/utils/garmentMap';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const OCCASIONS = [
  'Đi học',
  'Đi làm',
  'Đi chơi',
  'Date',
  'Cafe',
  'Du lịch',
] as const;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Chào buổi sáng!';
  if (h < 18) return 'Chào buổi chiều!';
  return 'Chào buổi tối!';
}

export function HomeScreen() {
  const route = useRoute<RouteProp<MainTabParamList, 'Home'>>();
  const navigation = useNavigation();
  const [vibeId, setVibeId] = useState<string | null>(VIBES[0]?.id ?? null);
  const [occasion, setOccasion] = useState<string>(OCCASIONS[0]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(false);
  const [catalogItems, setCatalogItems] = useState<WardrobeRackItem[]>([]);
  const [aiRows, setAiRows] = useState<{
    top: RackWardrobeItem[];
    bottom: RackWardrobeItem[];
    shoes: RackWardrobeItem[];
    reason: string;
    source: {
      vibe: string;
      occasion: string;
    };
  } | null>(null);
  const [onePieceOutfit, setOnePieceOutfit] = useState(false);
  const [savingOutfit, setSavingOutfit] = useState(false);
  const [markingWear, setMarkingWear] = useState(false);
  const [showCommitSheet, setShowCommitSheet] = useState(false);
  const [topIndex, setTopIndex] = useState(0);
  const [bottomIndex, setBottomIndex] = useState(0);
  const [shoeIndex, setShoeIndex] = useState(0);

  const greeting = useMemo(() => getGreeting(), []);
  const vibeLabel = useMemo(() => VIBES.find((v) => v.id === vibeId)?.label ?? '', [vibeId]);

  const baseTops = useMemo(() => catalogItems.filter((item) => item.category === 'top'), [catalogItems]);
  const bottoms = useMemo(
    () => catalogItems.filter((item) => item.category === 'bottom'),
    [catalogItems]
  );
  const shoes = useMemo(() => catalogItems.filter((item) => item.category === 'shoes'), [catalogItems]);
  const tops = aiRows?.top ?? baseTops;
  const shownBottoms = aiRows?.bottom ?? bottoms;
  const shownShoes = aiRows?.shoes ?? shoes;

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const garments = await fetchGarments();
      setCatalogItems(garments.map(mapGarmentToRackItem));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không tải được tủ đồ';
      Alert.alert('Lỗi', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCatalog();
    }, [loadCatalog])
  );

  const randomizeRows = useCallback(() => {
    if (tops.length > 0) setTopIndex(Math.floor(Math.random() * tops.length));
    if (bottoms.length > 0) setBottomIndex(Math.floor(Math.random() * bottoms.length));
    if (shoes.length > 0) setShoeIndex(Math.floor(Math.random() * shoes.length));
  }, [bottoms.length, shoes.length, tops.length]);

  const handleSelectVibe = useCallback(
    (id: string) => {
      setVibeId(id);
      setOnePieceOutfit(false);
      setAiRows(null);
      randomizeRows();
    },
    [randomizeRows]
  );

  const handleSuggestOutfit = useCallback(async () => {
    if (!vibeId) return;
    const vibeLabelNow = VIBES.find((v) => v.id === vibeId)?.label ?? 'Hằng ngày';
    setSuggesting(true);
    try {
      const result = await suggestAiOutfit({
        vibe: vibeLabelNow,
        occasion,
      });
      if (!result.outfit) {
        Alert.alert('Thiếu đồ', result.reason);
        return;
      }
      const o = result.outfit;
      const onePieceSuggested = Boolean(o.onePiece && !o.top);
      setOnePieceOutfit(onePieceSuggested);
      if (onePieceSuggested) {
        if (!o.onePiece) {
          Alert.alert('Thiếu đồ', result.reason);
          return;
        }
        const dress = mapGarmentToRackItem(o.onePiece);
        const shoeRack = o.shoes
          ? mapGarmentToRackItem(o.shoes)
          : shoes.find((s) => s.category === 'shoes');
        if (!shoeRack) {
          Alert.alert('Thiếu giày', 'Cần có ít nhất một đôi giày trong tủ để lưu bộ đầm/jumpsuit.');
          setOnePieceOutfit(false);
          return;
        }
        const placeholderBottom = bottoms[0];
        setAiRows({
          top: [dress],
          bottom: placeholderBottom ? [placeholderBottom] : [],
          shoes: [shoeRack],
          reason: result.reason,
          source: {
            vibe: vibeLabelNow,
            occasion,
          },
        });
      } else {
        if (!o.top || !o.bottom || !o.shoes) {
          Alert.alert('Thiếu đồ', 'AI chưa trả về đủ áo, quần và giày.');
          setOnePieceOutfit(false);
          return;
        }
        const top = mapGarmentToRackItem(o.top);
        const bottom = mapGarmentToRackItem(o.bottom);
        const shoe = mapGarmentToRackItem(o.shoes);
        setAiRows({
          top: [top],
          bottom: [bottom],
          shoes: [shoe],
          reason: result.reason,
          source: {
            vibe: vibeLabelNow,
            occasion,
          },
        });
      }
      setTopIndex(0);
      setBottomIndex(0);
      setShoeIndex(0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không gợi ý được phối đồ';
      Alert.alert('Lỗi', msg);
    } finally {
      setSuggesting(false);
    }
  }, [occasion, vibeId]);

  const handleSaveCurrentOutfit = useCallback(async () => {
    if (savingOutfit) return;
    const top = tops[topIndex];
    const bottom = shownBottoms[bottomIndex];
    const shoesRow = shownShoes[shoeIndex];
    if (!top || !shoesRow) return;
    const sourceVibe = aiRows?.source.vibe ?? (vibeLabel || 'Hằng ngày');
    const sourceOccasion = aiRows?.source.occasion ?? occasion;
    const sourceReason = aiRows?.reason ?? 'Set đồ do người dùng chọn từ tủ đồ.';
    setSavingOutfit(true);
    try {
      if (onePieceOutfit) {
        if (top.category !== 'onepiece') return;
        await saveAiOutfit({
          vibe: sourceVibe,
          occasion: sourceOccasion,
          reason: sourceReason,
          onePieceId: top.id,
          shoesId: shoesRow.id,
        });
      } else {
        if (!bottom) return;
        await saveAiOutfit({
          vibe: sourceVibe,
          occasion: sourceOccasion,
          reason: sourceReason,
          topId: top.id,
          bottomId: bottom.id,
          shoesId: shoesRow.id,
        });
      }
      Alert.alert('Đã lưu', 'Set đồ đã được lưu trong tab Profile.');
      setShowCommitSheet(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lưu set thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setSavingOutfit(false);
    }
  }, [
    aiRows?.reason,
    aiRows?.source.occasion,
    aiRows?.source.vibe,
    bottomIndex,
    occasion,
    onePieceOutfit,
    savingOutfit,
    shoeIndex,
    shownBottoms,
    shownShoes,
    topIndex,
    tops,
    vibeLabel,
  ]);

  const handleWearNow = useCallback(async () => {
    if (markingWear) return;
    const top = tops[topIndex];
    const bottom = shownBottoms[bottomIndex];
    const shoesRow = shownShoes[shoeIndex];
    if (!top || !shoesRow) return;
    if (!onePieceOutfit && !bottom) return;
    const garmentIds = Array.from(
      new Set(
        onePieceOutfit
          ? [top.id, shoesRow.id]
          : [top.id, bottom!.id, shoesRow.id]
      )
    );
    setMarkingWear(true);
    try {
      await Promise.all(garmentIds.map((id) => markGarmentWorn(id)));
      if (onePieceOutfit) {
        await createWearLog({
          onePieceId: top.id,
          shoesId: shoesRow.id,
          vibe: aiRows?.source.vibe ?? (vibeLabel || undefined),
          occasion: aiRows?.source.occasion ?? occasion,
        });
      } else {
        await createWearLog({
          topId: top.id,
          bottomId: bottom!.id,
          shoesId: shoesRow.id,
          vibe: aiRows?.source.vibe ?? (vibeLabel || undefined),
          occasion: aiRows?.source.occasion ?? occasion,
        });
      }
      setShowCommitSheet(false);
      Alert.alert('Mặc ngay', 'Đã lưu lịch outfit hôm nay và tăng số lần mặc.');
      void loadCatalog();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ghi nhận mặc ngay thất bại';
      Alert.alert('Lỗi', msg);
    } finally {
      setMarkingWear(false);
    }
  }, [
    aiRows?.source.occasion,
    aiRows?.source.vibe,
    bottomIndex,
    loadCatalog,
    markingWear,
    occasion,
    onePieceOutfit,
    shoeIndex,
    shownBottoms,
    shownShoes,
    topIndex,
    tops,
    vibeLabel,
  ]);

  const onViewableTopChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setTopIndex(viewableItems[0].index);
      }
    },
    []
  );

  const onViewableBottomChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setBottomIndex(viewableItems[0].index);
      }
    },
    []
  );

  const onViewableShoeChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setShoeIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  useFocusEffect(
    useCallback(() => {
      const preview = route.params?.previewOutfit;
      if (!preview || catalogItems.length === 0) return;
      const top = catalogItems.find((item) => item.id === preview.topId && item.category === 'top');
      const bottom = catalogItems.find((item) => item.id === preview.bottomId && item.category === 'bottom');
      const shoesRow = catalogItems.find((item) => item.id === preview.shoesId && item.category === 'shoes');
      if (!top || !bottom || !shoesRow) return;
      setAiRows({
        top: [top],
        bottom: [bottom],
        shoes: [shoesRow],
        reason: 'Set mặc thử từ Outfit đã lưu.',
        source: {
          vibe: preview.vibe,
          occasion: 'Mặc thử',
        },
      });
      setTopIndex(0);
      setBottomIndex(0);
      setShoeIndex(0);
      navigation.setParams({ previewOutfit: undefined } as never);
    }, [catalogItems, navigation, route.params?.previewOutfit])
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.screenScroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.sub}>Lướt ngang từng hàng — chọn áo, quần, giày</Text>

          <Text style={styles.sectionLabel}>Vibe</Text>
          <VibeChipRow vibes={VIBES} selectedId={vibeId} onSelect={handleSelectVibe} />
          {vibeLabel ? <Text style={styles.vibeHint}>{vibeLabel}</Text> : null}
          <Text style={[styles.sectionLabel, styles.occasionLabel]}>Dịp</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {OCCASIONS.map((item) => {
              const selected = occasion === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => {
                    setOccasion(item);
                    setAiRows(null);
                  }}
                  style={[styles.occasionChip, selected && styles.occasionChipActive]}>
                  <Text style={[styles.occasionChipText, selected && styles.occasionChipTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.actionRow}>
            <Pressable style={styles.suggestBtn} onPress={() => void handleSuggestOutfit()} disabled={suggesting}>
              {suggesting ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.suggestBtnText}>Phối đồ với AI</Text>
              )}
            </Pressable>
            <Pressable
              style={[styles.wearNowBtn, (savingOutfit || markingWear) && styles.saveOutfitBtnDisabled]}
              onPress={() => setShowCommitSheet(true)}
              disabled={savingOutfit || markingWear}>
              {savingOutfit || markingWear ? (
                <ActivityIndicator size="small" color={theme.colors.ecoGreen} />
              ) : (
                <Text style={styles.wearNowBtnText}>Mặc ngay</Text>
              )}
            </Pressable>
          </View>
          {aiRows?.reason ? <Text style={styles.aiReason}>{aiRows.reason}</Text> : null}
        </View>

        <View style={styles.body}>
          <View style={styles.rowWrap}>
            <Text style={styles.rowTitle}>Áo</Text>
            <FlatList
              data={tops}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <FullWidthCard item={item} />}
              onViewableItemsChanged={onViewableTopChanged}
              viewabilityConfig={viewConfig}
              decelerationRate="fast"
              snapToAlignment="center"
            />
          </View>

          <View style={styles.rowWrap}>
            <Text style={styles.rowTitle}>Quần</Text>
            <FlatList
              data={shownBottoms}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <FullWidthCard item={item} />}
              onViewableItemsChanged={onViewableBottomChanged}
              viewabilityConfig={viewConfig}
              decelerationRate="fast"
              snapToAlignment="center"
            />
          </View>

          <View style={styles.rowWrap}>
            <Text style={styles.rowTitle}>Giày dép</Text>
            <FlatList
              data={shownShoes}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <FullWidthCard item={item} />}
              onViewableItemsChanged={onViewableShoeChanged}
              viewabilityConfig={viewConfig}
              decelerationRate="fast"
              snapToAlignment="center"
            />
          </View>
        </View>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.ecoGreen} />
          </View>
        ) : null}
      </ScrollView>
      <Modal
        visible={showCommitSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCommitSheet(false)}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>Chốt set AI</Text>
            <Text style={styles.sheetHint}>Bạn muốn dùng set này theo cách nào?</Text>
            <Pressable
              style={[
                styles.sheetActionBtn,
                styles.sheetPrimaryBtn,
                (savingOutfit || markingWear) && styles.saveOutfitBtnDisabled,
              ]}
              onPress={() => {
                void handleWearNow();
              }}
              disabled={savingOutfit || markingWear}>
              <Text style={styles.sheetPrimaryBtnText}>Mặc ngay</Text>
            </Pressable>
            <Pressable
              style={[
                styles.sheetActionBtn,
                styles.sheetSecondaryBtn,
                (savingOutfit || markingWear) && styles.saveOutfitBtnDisabled,
              ]}
              onPress={() => {
                void handleSaveCurrentOutfit();
              }}
              disabled={savingOutfit || markingWear}>
              <Text style={styles.sheetSecondaryBtnText}>Lưu set</Text>
            </Pressable>
            <Pressable
              style={styles.sheetGhostBtn}
              onPress={() => setShowCommitSheet(false)}
              disabled={savingOutfit || markingWear}>
              <Text style={styles.sheetGhostBtnText}>Để sau</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

type FullWidthCardProps = {
  item: RackWardrobeItem;
};

function FullWidthCard({ item }: FullWidthCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardImageFrame}>
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="contain" />
      </View>
    </View>
  );
}

const ROW_H = Math.max(210, Math.floor((SCREEN_H - 220) / 3));

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenScroll: {
    paddingBottom: theme.spacing.md,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 4,
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  vibeHint: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.ecoGreen,
  },
  occasionLabel: {
    marginTop: theme.spacing.md,
  },
  occasionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginRight: 8,
  },
  occasionChipActive: {
    borderColor: theme.colors.ecoGreen,
    backgroundColor: theme.colors.neonSoft,
  },
  occasionChipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  occasionChipTextActive: {
    color: theme.colors.ecoGreen,
  },
  suggestBtn: {
    marginTop: theme.spacing.md,
    flex: 1,
    backgroundColor: theme.colors.ecoGreen,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  suggestBtnText: {
    color: theme.colors.surface,
    fontWeight: '800',
    fontSize: 14,
  },
  aiReason: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  actionRow: {
    marginTop: 0,
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  wearNowBtn: {
    marginTop: theme.spacing.md,
    flex: 1,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.ecoGreen,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  saveOutfitBtnDisabled: {
    opacity: 0.7,
  },
  wearNowBtnText: {
    color: theme.colors.ecoGreen,
    fontWeight: '800',
    fontSize: 14,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: theme.spacing.lg,
  },
  sheetCard: {
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  sheetHint: {
    marginTop: 6,
    marginBottom: theme.spacing.md,
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  sheetActionBtn: {
    borderRadius: theme.radii.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  sheetPrimaryBtn: {
    backgroundColor: theme.colors.ecoGreen,
    marginBottom: theme.spacing.sm,
  },
  sheetPrimaryBtnText: {
    color: theme.colors.surface,
    fontWeight: '800',
    fontSize: 14,
  },
  sheetSecondaryBtn: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.ecoGreen,
  },
  sheetSecondaryBtnText: {
    color: theme.colors.ecoGreen,
    fontWeight: '700',
    fontSize: 14,
  },
  sheetGhostBtn: {
    marginTop: theme.spacing.sm,
    alignItems: 'center',
    paddingVertical: 8,
  },
  sheetGhostBtnText: {
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  body: {
    minHeight: ROW_H * 3 + 20,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  rowWrap: {
    height: ROW_H,
    marginBottom: 10,
  },
  rowTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  card: {
    width: SCREEN_W,
    height: ROW_H - 8,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
  },
  cardImageFrame: {
    width: '100%',
    height: '100%',
    borderRadius: theme.radii.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ffffff',
  },
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: 'rgba(13, 79, 60, 0.88)',
    borderBottomLeftRadius: theme.radii.lg,
    borderBottomRightRadius: theme.radii.lg,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  summaryThumb: {
    width: 64,
    height: 80,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 2,
    borderColor: theme.colors.ecoGreen,
  },
});
