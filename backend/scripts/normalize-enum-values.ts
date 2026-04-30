import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

type UpdateSpec = {
  collection: string;
  field: string;
  from: string;
  to: string | null;
};

type RegexUpdateSpec = {
  collection: string;
  field: string;
  regex: string;
  to: string | null;
};

const updates: UpdateSpec[] = [
  // Garment.fit
  { collection: 'Garment', field: 'fit', from: 'Regular', to: 'regular' },
  { collection: 'Garment', field: 'fit', from: 'Slim', to: 'slim' },
  { collection: 'Garment', field: 'fit', from: 'Relaxed', to: 'relaxed' },
  { collection: 'Garment', field: 'fit', from: 'Oversized', to: 'oversized' },
  { collection: 'Garment', field: 'fit', from: 'Ôm', to: 'slim' },
  { collection: 'Garment', field: 'fit', from: 'Vừa', to: 'regular' },
  { collection: 'Garment', field: 'fit', from: 'Rộng', to: 'relaxed' },
  { collection: 'Garment', field: 'fit', from: 'Over size', to: 'oversized' },
  { collection: 'Garment', field: 'fit', from: 'Oversize', to: 'oversized' },
  { collection: 'Garment', field: 'fit', from: 'oversize', to: 'oversized' },
  // Garment.pattern
  { collection: 'Garment', field: 'pattern', from: 'Solid', to: 'solid' },
  { collection: 'Garment', field: 'pattern', from: 'Stripe', to: 'stripe' },
  { collection: 'Garment', field: 'pattern', from: 'Plaid', to: 'plaid' },
  { collection: 'Garment', field: 'pattern', from: 'Graphic', to: 'graphic' },
  { collection: 'Garment', field: 'pattern', from: 'Floral', to: 'floral' },
  { collection: 'Garment', field: 'pattern', from: 'Other', to: 'other' },
  { collection: 'Garment', field: 'pattern', from: 'Trơn', to: 'solid' },
  { collection: 'Garment', field: 'pattern', from: 'Kẻ sọc', to: 'stripe' },
  { collection: 'Garment', field: 'pattern', from: 'Kẻ caro', to: 'plaid' },
  { collection: 'Garment', field: 'pattern', from: 'Hoạ tiết', to: 'graphic' },
  { collection: 'Garment', field: 'pattern', from: 'Họa tiết', to: 'graphic' },
  { collection: 'Garment', field: 'pattern', from: 'Hoa', to: 'floral' },
  { collection: 'Garment', field: 'pattern', from: 'Khác', to: 'other' },
  // Outfit / WearLog enum text
  { collection: 'Outfit', field: 'vibe', from: 'Smart Casual', to: 'smartCasual' },
  { collection: 'WearLog', field: 'vibe', from: 'Smart Casual', to: 'smartCasual' },
  { collection: 'Outfit', field: 'vibe', from: '✨ Năng lượng', to: 'energetic' },
  { collection: 'WearLog', field: 'vibe', from: '✨ Năng lượng', to: 'energetic' },
  { collection: 'Outfit', field: 'vibe', from: '☕ Chữa lành', to: 'minimal' },
  { collection: 'WearLog', field: 'vibe', from: '☕ Chữa lành', to: 'minimal' },
  { collection: 'Outfit', field: 'vibe', from: '📚 Đi học', to: 'casual' },
  { collection: 'WearLog', field: 'vibe', from: '📚 Đi học', to: 'casual' },
  { collection: 'Outfit', field: 'vibe', from: '🌿 Tối giản', to: 'minimal' },
  { collection: 'WearLog', field: 'vibe', from: '🌿 Tối giản', to: 'minimal' },
  { collection: 'Outfit', field: 'vibe', from: '💫 Y2K', to: 'vintage' },
  { collection: 'WearLog', field: 'vibe', from: '💫 Y2K', to: 'vintage' },
  { collection: 'Outfit', field: 'vibe', from: '🎧 Street', to: 'street' },
  { collection: 'WearLog', field: 'vibe', from: '🎧 Street', to: 'street' },
  { collection: 'Outfit', field: 'vibe', from: '🧠 Smart Casual', to: 'smartCasual' },
  { collection: 'WearLog', field: 'vibe', from: '🧠 Smart Casual', to: 'smartCasual' },
  { collection: 'Outfit', field: 'vibe', from: '🖤 Monochrome', to: 'minimal' },
  { collection: 'WearLog', field: 'vibe', from: '🖤 Monochrome', to: 'minimal' },
  { collection: 'Outfit', field: 'vibe', from: '🌦️ Hằng ngày', to: 'casual' },
  { collection: 'WearLog', field: 'vibe', from: '🌦️ Hằng ngày', to: 'casual' },
  { collection: 'Outfit', field: 'vibe', from: '🌙 Date Night', to: 'formal' },
  { collection: 'WearLog', field: 'vibe', from: '🌙 Date Night', to: 'formal' },
  { collection: 'Outfit', field: 'occasion', from: 'School', to: 'school' },
  { collection: 'Outfit', field: 'occasion', from: 'Đi học', to: 'school' },
  { collection: 'Outfit', field: 'occasion', from: 'Work', to: 'work' },
  { collection: 'Outfit', field: 'occasion', from: 'Đi làm', to: 'work' },
  { collection: 'Outfit', field: 'occasion', from: 'Date', to: 'date' },
  { collection: 'Outfit', field: 'occasion', from: 'Đi chơi', to: 'party' },
  { collection: 'Outfit', field: 'occasion', from: 'Cafe', to: 'home' },
  { collection: 'Outfit', field: 'occasion', from: 'Du lịch', to: 'travel' },
  { collection: 'Outfit', field: 'occasion', from: 'Travel', to: 'travel' },
  { collection: 'Outfit', field: 'occasion', from: 'Party', to: 'party' },
  { collection: 'Outfit', field: 'occasion', from: 'Sport', to: 'sport' },
  { collection: 'Outfit', field: 'occasion', from: 'Home', to: 'home' },
  { collection: 'Outfit', field: 'occasion', from: 'Other', to: 'other' },
  { collection: 'WearLog', field: 'occasion', from: 'School', to: 'school' },
  { collection: 'WearLog', field: 'occasion', from: 'Đi học', to: 'school' },
  { collection: 'WearLog', field: 'occasion', from: 'Work', to: 'work' },
  { collection: 'WearLog', field: 'occasion', from: 'Đi làm', to: 'work' },
  { collection: 'WearLog', field: 'occasion', from: 'Date', to: 'date' },
  { collection: 'WearLog', field: 'occasion', from: 'Đi chơi', to: 'party' },
  { collection: 'WearLog', field: 'occasion', from: 'Cafe', to: 'home' },
  { collection: 'WearLog', field: 'occasion', from: 'Du lịch', to: 'travel' },
  { collection: 'WearLog', field: 'occasion', from: 'Travel', to: 'travel' },
  { collection: 'WearLog', field: 'occasion', from: 'Party', to: 'party' },
  { collection: 'WearLog', field: 'occasion', from: 'Sport', to: 'sport' },
  { collection: 'WearLog', field: 'occasion', from: 'Home', to: 'home' },
  { collection: 'WearLog', field: 'occasion', from: 'Other', to: 'other' },
];

const regexUpdates: RegexUpdateSpec[] = [
  // Free-text Vietnamese pattern values
  { collection: 'Garment', field: 'pattern', regex: 'sọc|stripe', to: 'stripe' },
  { collection: 'Garment', field: 'pattern', regex: 'caro|plaid', to: 'plaid' },
  { collection: 'Garment', field: 'pattern', regex: 'hoa|floral', to: 'floral' },
  { collection: 'Garment', field: 'pattern', regex: 'họa tiết|hoạ tiết|graphic|pattern', to: 'graphic' },
  { collection: 'Garment', field: 'pattern', regex: 'trơn|solid', to: 'solid' },
];

async function run() {
  let total = 0;
  for (const item of updates) {
    const result = (await prisma.$runCommandRaw({
      update: item.collection,
      updates: [
        {
          q: { [item.field]: item.from },
          u: { $set: { [item.field]: item.to } },
          multi: true,
        },
      ],
    })) as { n?: number; nModified?: number };
    const changed = result.nModified ?? result.n ?? 0;
    total += changed;
    if (changed > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[updated] ${item.collection}.${item.field}: "${item.from}" -> "${String(item.to)}" (${changed})`
      );
    }
  }

  for (const item of regexUpdates) {
    const result = (await prisma.$runCommandRaw({
      update: item.collection,
      updates: [
        {
          q: {
            [item.field]: {
              $regex: item.regex,
              $options: 'i',
              $type: 'string',
            },
          },
          u: { $set: { [item.field]: item.to } },
          multi: true,
        },
      ],
    })) as { n?: number; nModified?: number };
    const changed = result.nModified ?? result.n ?? 0;
    total += changed;
    if (changed > 0) {
      // eslint-disable-next-line no-console
      console.log(
        `[regex-updated] ${item.collection}.${item.field}: /${item.regex}/i -> "${String(
          item.to
        )}" (${changed})`
      );
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[done] total updated documents: ${total}`);
}

run()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[failed] normalize enum values', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
