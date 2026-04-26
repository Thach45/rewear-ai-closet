import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Garment } from '@/types/garment';

const DAILY_REMINDER_TAG = 'daily-forgotten-reminder';
const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_REMINDER_HOUR = 16;
const DAILY_REMINDER_MINUTE = 31;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('daily-reminders', {
    name: 'Daily reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0D4F3C',
  });
}

type ReminderContent = {
  title: string;
  body: string;
};

const FALLBACK_REMINDER: ReminderContent = {
  title: 'ReWear nhắc bạn buổi sáng',
  body: 'Mở app xem hôm nay món nào đang bị bỏ quên nhé.',
};

const NEVER_WORN_TEMPLATES: Array<(name: string, days: number) => ReminderContent> = [
  (name, days) => ({
    title: `Bạn quên ${name} rồi đó`,
    body: `${name} vẫn chưa được mặc lần nào trong ${days} ngày qua.`,
  }),
  (name, days) => ({
    title: `${name} đang chờ được lên đồ`,
    body: `Đã ${days} ngày kể từ khi thêm vào tủ, bạn chưa mặc ${name}.`,
  }),
];

const FORGOTTEN_WORN_TEMPLATES: Array<(name: string, days: number) => ReminderContent> = [
  (name, days) => ({
    title: `${name} đang bị bỏ quên`,
    body: `Đã ${days} ngày bạn chưa mặc ${name}.`,
  }),
  (name, days) => ({
    title: `Hôm nay mặc lại ${name} nhé`,
    body: `${name} đã “nghỉ” ${days} ngày rồi, kéo em ấy quay lại outfit đi.`,
  }),
];

function pickTemplateIndex(name: string, days: number, total: number): number {
  if (total <= 1) return 0;
  const seed = `${name}-${days}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % total;
}

export function buildForgottenGarmentReminderContent(garments: Garment[]): ReminderContent {
  const now = Date.now();
  const candidate = garments
    .map((item) => {
      const baseTime = item.lastWornAt ? new Date(item.lastWornAt).getTime() : new Date(item.createdAt).getTime();
      const diffDays = Number.isFinite(baseTime) ? Math.max(0, Math.floor((now - baseTime) / DAY_MS)) : 0;
      const neverWorn = !item.lastWornAt || item.wearCount <= 0;
      return { item, diffDays, neverWorn };
    })
    .filter((x) => x.diffDays >= 7)
    .sort((a, b) => b.diffDays - a.diffDays)[0];

  if (!candidate) return FALLBACK_REMINDER;
  if (candidate.neverWorn) {
    const idx = pickTemplateIndex(candidate.item.name, candidate.diffDays, NEVER_WORN_TEMPLATES.length);
    return NEVER_WORN_TEMPLATES[idx](candidate.item.name, candidate.diffDays);
  }
  const idx = pickTemplateIndex(candidate.item.name, candidate.diffDays, FORGOTTEN_WORN_TEMPLATES.length);
  return FORGOTTEN_WORN_TEMPLATES[idx](candidate.item.name, candidate.diffDays);
}

export async function ensureDailyForgottenGarmentReminder(content?: ReminderContent): Promise<void> {
  const perms = await Notifications.getPermissionsAsync();
  let granted = perms.granted;
  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.granted;
  }
  if (!granted) return;

  await ensureAndroidChannel();

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existingReminder = scheduled.find((item) => item.content.data?.tag === DAILY_REMINDER_TAG);
  if (existingReminder) {
    const trigger = existingReminder.trigger as { hour?: number; minute?: number } | null;
    const sameTime =
      trigger?.hour === DAILY_REMINDER_HOUR &&
      trigger?.minute === DAILY_REMINDER_MINUTE;
    if (sameTime) return;
    await Notifications.cancelScheduledNotificationAsync(existingReminder.identifier);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: content?.title ?? FALLBACK_REMINDER.title,
      body: content?.body ?? FALLBACK_REMINDER.body,
      data: { tag: DAILY_REMINDER_TAG },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: DAILY_REMINDER_HOUR,
      minute: DAILY_REMINDER_MINUTE,
      channelId: 'daily-reminders',
    },
  });
}
