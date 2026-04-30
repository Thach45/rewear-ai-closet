import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { theme } from '@/constants/theme';
import { fetchWearLogs, type WearLog } from '@/lib/outfitsApi';

type DayCell = { date: Date; key: string; inMonth: boolean };
type MonthSection = { key: string; label: string; cells: DayCell[] };

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(monthCursor: Date): string {
  return monthCursor.toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
  });
}

function addMonths(base: Date, offset: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + offset, 1);
}

function buildMonthGrid(monthCursor: Date): DayCell[] {
  const firstDay = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1);
  const startWeekday = firstDay.getDay(); // 0..6, CN..T7
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - startWeekday);

  return Array.from({ length: 42 }).map((_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return {
      date,
      key: toYmd(date),
      inMonth: date.getMonth() === monthCursor.getMonth(),
    };
  });
}

function formatSelectedDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function WearLogScreen() {
  const [logs, setLogs] = useState<WearLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const hasAutoScrolledRef = useRef(false);
  const monthOffsetsRef = useRef<Record<string, number>>({});
  const currentMonthKey = useMemo(() => toYmd(startOfMonth(new Date())), []);
  const scrollToCurrentMonth = useCallback(() => {
    const y = monthOffsetsRef.current[currentMonthKey];
    if (typeof y !== 'number') return false;
    scrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: false });
    hasAutoScrolledRef.current = true;
    return true;
  }, [currentMonthKey]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWearLogs();
      setLogs(data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      hasAutoScrolledRef.current = false;
      void loadLogs();
    }, [loadLogs])
  );

  useEffect(() => {
    if (loading || hasAutoScrolledRef.current) return;
    const t = setTimeout(() => {
      void scrollToCurrentMonth();
    }, 80);
    return () => clearTimeout(t);
  }, [loading, scrollToCurrentMonth]);

  const logMap = useMemo(() => {
    const map = new Map<string, WearLog[]>();
    logs.forEach((log) => {
      const key = toYmd(startOfDay(new Date(log.wornAt)));
      const current = map.get(key) ?? [];
      current.push(log);
      map.set(key, current);
    });
    return map;
  }, [logs]);

  const monthSections = useMemo<MonthSection[]>(() => {
    const nowMonth = startOfMonth(new Date());
    const months = Array.from({ length: 18 }).map((_, i) => addMonths(nowMonth, i - 9));
    return months.map((cursor) => ({
      key: toYmd(cursor),
      label: monthLabel(cursor),
      cells: buildMonthGrid(cursor),
    }));
  }, []);
  const selectedLogs = selectedDate ? logMap.get(selectedDate) ?? [] : [];
  const selectedPrimaryLog = selectedLogs[0] ?? null;
  const selectedGarments = selectedPrimaryLog?.garments ?? [];
  const selectedOnePiece = selectedGarments.find((g) => g.category === 'onepiece');
  const selectedTop =
    selectedOnePiece ?? selectedGarments.find((g) => g.category === 'top') ?? null;
  const selectedBottom = selectedOnePiece
    ? null
    : selectedGarments.find((g) => g.category === 'bottom') ?? null;
  const selectedShoes = selectedGarments.find((g) => g.category === 'shoes') ?? null;
  const weekDayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const handleGoToday = useCallback(() => {
    const today = startOfDay(new Date());
    setSelectedDate(toYmd(today));
    hasAutoScrolledRef.current = false;
    void scrollToCurrentMonth();
  }, [scrollToCurrentMonth]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          if (hasAutoScrolledRef.current) return;
          void scrollToCurrentMonth();
        }}>
        <Text style={styles.title}>Lịch outfit đã mặc</Text>
        <Text style={styles.subtitle}>Mỗi lần bấm "Mặc ngay" sẽ được lưu vào đây.</Text>
        <Pressable style={styles.todayBtn} onPress={handleGoToday}>
          <Ionicons name="today-outline" size={14} color={theme.colors.ecoGreen} />
          <Text style={styles.todayBtnText}>Hôm nay</Text>
        </Pressable>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.colors.ecoGreen} />
          </View>
        ) : logs.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-clear-outline" size={36} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>Chưa có dữ liệu mặc đồ.</Text>
          </View>
        ) : (
          <>
            {monthSections.map((section) => (
              <View
                key={section.key}
                style={styles.calendarCard}
                onLayout={(e) => {
                  const y = e.nativeEvent.layout.y;
                  monthOffsetsRef.current[section.key] = y;
                  if (!hasAutoScrolledRef.current && section.key === currentMonthKey) {
                    void scrollToCurrentMonth();
                  }
                }}>
                <Text style={styles.monthTitle}>{section.label}</Text>
                <View style={styles.weekHeaderRow}>
                  {weekDayLabels.map((label) => (
                    <Text key={`${section.key}-${label}`} style={styles.weekHeaderCell}>
                      {label}
                    </Text>
                  ))}
                </View>
                <View style={styles.grid}>
                  {section.cells.map((cell) => {
                    const dayLogs = logMap.get(cell.key) ?? [];
                    const active = selectedDate === cell.key;
                    const hasLog = dayLogs.length > 0;
                    const firstLog = dayLogs[0];
                    const gs = firstLog?.garments ?? [];
                    const op = gs.find((g) => g.category === 'onepiece');
                    const top = op ?? gs.find((g) => g.category === 'top');
                    const bottom = op ? undefined : gs.find((g) => g.category === 'bottom');
                    const shoes = gs.find((g) => g.category === 'shoes');
                    return (
                      <Pressable
                        key={cell.key}
                        style={[
                          styles.dayCell,
                          !cell.inMonth && styles.dayCellMuted,
                          hasLog && styles.dayCellHasLog,
                          active && styles.dayCellActive,
                        ]}
                        onPress={() => {
                          setSelectedDate(cell.key);
                        }}>
                        <Text style={[styles.dayNumber, !cell.inMonth && styles.dayNumberMuted]}>
                          {cell.date.getDate()}
                        </Text>
                        {firstLog ? (
                          <View style={styles.dayThumbStack}>
                            {top ? <Image source={{ uri: top.imageUrl }} style={[styles.dayThumb, styles.dayThumbTop]} /> : null}
                            {bottom ? <Image source={{ uri: bottom.imageUrl }} style={[styles.dayThumb, styles.dayThumbMid]} /> : null}
                            {shoes ? <Image source={{ uri: shoes.imageUrl }} style={[styles.dayThumb, styles.dayThumbBot]} /> : null}
                          </View>
                        ) : null}
                        {dayLogs.length > 1 ? (
                          <View style={styles.dayThumbCount}>
                            <Text style={styles.dayThumbCountText}>+{dayLogs.length - 1}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
      <Modal
        visible={Boolean(selectedDate)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDate(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {selectedDate ? formatSelectedDate(selectedDate) : 'Chi tiết outfit'}
              </Text>
              <Pressable style={styles.modalCloseBtn} onPress={() => setSelectedDate(null)}>
                <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            {selectedPrimaryLog ? (
              <>
                <View style={styles.modalThumbStack}>
                  {selectedTop ? (
                    <Image source={{ uri: selectedTop.imageUrl }} style={[styles.modalThumb, styles.modalThumbTop]} />
                  ) : null}
                  {selectedBottom ? (
                    <Image source={{ uri: selectedBottom.imageUrl }} style={[styles.modalThumb, styles.modalThumbMid]} />
                  ) : null}
                  {selectedShoes ? (
                    <Image source={{ uri: selectedShoes.imageUrl }} style={[styles.modalThumb, styles.modalThumbBot]} />
                  ) : null}
                </View>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailVibe} numberOfLines={1}>
                    {selectedPrimaryLog.vibe ?? 'Outfit đã mặc'}
                  </Text>
                  <Text style={styles.detailOccasion} numberOfLines={1}>
                    {selectedPrimaryLog.occasion ?? 'Hằng ngày'}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyDayText}>Chưa có outfit mặc trong ngày này.</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.xxl },
  title: { fontSize: 28, fontWeight: '900', color: theme.colors.text, marginTop: theme.spacing.sm },
  subtitle: { marginTop: 6, fontSize: 14, color: theme.colors.textSecondary },
  todayBtn: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.ecoGreen,
    backgroundColor: theme.colors.neonSoft,
    borderRadius: theme.radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  todayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.ecoGreen,
  },
  loadingWrap: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { marginTop: theme.spacing.xl, alignItems: 'center', gap: theme.spacing.sm },
  emptyText: { color: theme.colors.textSecondary, fontSize: 14 },
  calendarCard: {
    marginTop: theme.spacing.lg,
    marginHorizontal: -4,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.neonSoft,
  },
  monthTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text, textTransform: 'capitalize' },
  weekHeaderRow: { flexDirection: 'row', marginTop: theme.spacing.sm, marginBottom: 6 },
  weekHeaderCell: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, color: theme.colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    height: 58,
    borderRadius: theme.radii.md,
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'relative',
    paddingTop: 4,
  },
  dayCellMuted: { opacity: 0.45 },
  dayCellHasLog: {
    backgroundColor: theme.colors.neonSoft,
    borderWidth: 1,
    borderColor: 'rgba(13,79,60,0.18)',
  },
  dayCellActive: { backgroundColor: theme.colors.neonSoft, borderWidth: 1, borderColor: theme.colors.ecoGreen },
  dayNumber: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  dayNumberMuted: { color: theme.colors.textSecondary },
  dayThumbStack: {
    position: 'absolute',
    left: 4,
    right: 4,
    bottom: 3,
    height: 26,
  },
  dayThumb: {
    position: 'absolute',
    width: 18,
    height: 24,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: '#ffffffcc',
  },
  dayThumbTop: {
    left: 4,
    top: 2,
    transform: [{ rotate: '-10deg' }],
    zIndex: 3,
  },
  dayThumbMid: {
    left: 14,
    top: 0,
    zIndex: 2,
  },
  dayThumbBot: {
    left: 24,
    top: 3,
    transform: [{ rotate: '9deg' }],
    zIndex: 1,
  },
  dayThumbCount: {
    position: 'absolute',
    right: 3,
    bottom: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.ecoGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayThumbCountText: { color: theme.colors.surface, fontSize: 9, fontWeight: '800' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.sm,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    marginLeft: 8,
  },
  modalThumbStack: {
    width: '100%',
    height: 210,
    position: 'relative',
    borderRadius: theme.radii.lg,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  modalThumb: {
    position: 'absolute',
    width: 136,
    height: 192,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: '#ffffffcc',
    backgroundColor: theme.colors.surfaceMuted,
  },
  modalThumbTop: {
    left: 18,
    top: 10,
    transform: [{ rotate: '-8deg' }],
    zIndex: 3,
  },
  modalThumbMid: {
    left: 104,
    top: 6,
    zIndex: 2,
  },
  modalThumbBot: {
    left: 190,
    top: 12,
    transform: [{ rotate: '8deg' }],
    zIndex: 1,
  },
  detailMetaRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  detailVibe: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailOccasion: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  group: { marginTop: theme.spacing.lg },
  groupDate: { fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  emptyDayText: { fontSize: 13, color: theme.colors.textSecondary },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: theme.spacing.sm, gap: 8 },
  metaVibe: { fontSize: 14, fontWeight: '700', color: theme.colors.text, flex: 1 },
  metaOccasion: { fontSize: 12, color: theme.colors.textSecondary },
  imagesRow: { flexDirection: 'row', gap: 8 },
  imageWrap: { width: 84 },
  image: { width: 84, height: 108, borderRadius: theme.radii.md, backgroundColor: theme.colors.surfaceMuted },
  imageLabel: { marginTop: 4, fontSize: 11, color: theme.colors.textSecondary },
});
