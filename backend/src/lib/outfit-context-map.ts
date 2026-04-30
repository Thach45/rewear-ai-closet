import { Occasion, OutfitVibe } from '@prisma/client';

const OUTFIT_VIBE_VALUES = new Set<string>(Object.values(OutfitVibe));
const OCCASION_VALUES = new Set<string>(Object.values(Occasion));

/**
 * Maps mobile UI labels (Vietnamese chips) or raw enum strings to OutfitVibe.
 */
export function toOutfitVibe(input: string | OutfitVibe): OutfitVibe {
  if (OUTFIT_VIBE_VALUES.has(input as string)) {
    return input as OutfitVibe;
  }
  const key = typeof input === 'string' ? input.trim() : String(input);
  const labelMap: Record<string, OutfitVibe> = {
    '✨ Năng lượng': OutfitVibe.energetic,
    '☕ Chữa lành': OutfitVibe.minimal,
    '📚 Đi học': OutfitVibe.casual,
    '🌿 Tối giản': OutfitVibe.minimal,
    '💫 Y2K': OutfitVibe.vintage,
    '🎧 Street': OutfitVibe.street,
    '🧠 Smart Casual': OutfitVibe.smartCasual,
    '🖤 Monochrome': OutfitVibe.minimal,
    '🌦️ Hằng ngày': OutfitVibe.casual,
    '🌙 Date Night': OutfitVibe.formal,
    'Hằng ngày': OutfitVibe.casual,
  };
  return labelMap[key] ?? OutfitVibe.casual;
}

/**
 * Maps mobile UI occasion strings or enum values to Occasion.
 */
export function toOccasion(input: string | Occasion): Occasion {
  if (OCCASION_VALUES.has(input as string)) {
    return input as Occasion;
  }
  const key = typeof input === 'string' ? input.trim() : String(input);
  const labelMap: Record<string, Occasion> = {
    'Đi học': Occasion.school,
    'Đi làm': Occasion.work,
    'Đi chơi': Occasion.party,
    Date: Occasion.date,
    Cafe: Occasion.home,
    'Du lịch': Occasion.travel,
  };
  return labelMap[key] ?? Occasion.other;
}

export function toOccasionNullable(
  input: string | Occasion | null | undefined
): Occasion | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  return toOccasion(input);
}
