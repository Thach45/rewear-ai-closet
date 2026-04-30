import { prisma } from '../lib/prisma.js';
import type { Garment } from '@prisma/client';
import type { SuggestOutfitBodyDto } from '../dto/outfit.dto.js';
import { toOccasionNullable, toOutfitVibe } from '../lib/outfit-context-map.js';
import { buildOutfitPromptFromGarments } from './outfit-prompt.builder.js';
import { GeminiOutfitService } from './gemini-outfit.service.js';

type SuggestedOutfitJson = {
  outfitType: 'separates' | 'onepiece';
  topId?: string;
  bottomId?: string;
  shoesId?: string;
  onePieceId?: string;
  reason?: string;
};

function parseJsonFromText(text: string): SuggestedOutfitJson | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as SuggestedOutfitJson;
    if (obj?.outfitType !== 'separates' && obj?.outfitType !== 'onepiece') return null;
    return obj;
  } catch {
    return null;
  }
}

function normalizeId(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  if (!t || t === '') return undefined;
  return t;
}

export type SuggestAiOutfitResult = {
  outfit: {
    top: Garment | null;
    bottom: Garment | null;
    shoes: Garment | null;
    onePiece: Garment | null;
  } | null;
  reason: string;
  missing?: string[];
  model?: string;
  usedFallback?: boolean;
};

export async function suggestAiOutfit(
  userId: string,
  input: SuggestOutfitBodyDto
): Promise<SuggestAiOutfitResult> {
  const vibe = toOutfitVibe(input.vibe);
  const occasion =
    input.occasion !== undefined ? toOccasionNullable(input.occasion) : undefined;

  // eslint-disable-next-line no-console
  console.log('[ai][suggest] start', {
    userId,
    vibe,
    occasion,
  });
  const garments = await prisma.garment.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const tops = garments.filter((g) => g.category === 'top');
  const bottoms = garments.filter((g) => g.category === 'bottom');
  const shoes = garments.filter((g) => g.category === 'shoes');
  const onepieces = garments.filter((g) => g.category === 'onepiece');

  const canSeparates = tops.length > 0 && bottoms.length > 0 && shoes.length > 0;
  const canOnePiece = onepieces.length > 0 && shoes.length > 0;
  const canDressOnly = onepieces.length > 0 && shoes.length === 0;

  // eslint-disable-next-line no-console
  console.log('[ai][suggest] wardrobe:loaded', {
    total: garments.length,
    tops: tops.length,
    bottoms: bottoms.length,
    shoes: shoes.length,
    onepieces: onepieces.length,
  });

  if (!canSeparates && !canOnePiece && !canDressOnly) {
    // eslint-disable-next-line no-console
    console.log('[ai][suggest] abort:missing-categories');
    return {
      outfit: null,
      reason: 'Thiếu món để phối (cần bộ áo+quần+giày, hoặc đầm/jumpsuit).',
      missing: [
        ...(tops.length === 0 && onepieces.length === 0 ? ['top hoặc onepiece'] : []),
        ...(bottoms.length === 0 && onepieces.length === 0 ? ['bottom hoặc onepiece'] : []),
        ...(shoes.length === 0 ? ['shoes'] : []),
      ],
    };
  }

  const prompt = buildOutfitPromptFromGarments(garments, {
    vibe: String(vibe),
    occasion: occasion !== undefined ? String(occasion) : undefined,
  });
  // eslint-disable-next-line no-console
  console.log('[ai][suggest] prompt:built', { chars: prompt.length });

  const gemini = new GeminiOutfitService();
  const ai = await gemini.suggestFromPrompt(prompt);
  const parsed = parseJsonFromText(ai.text);
  // eslint-disable-next-line no-console
  console.log('[ai][suggest] ai:parsed', {
    model: ai.model,
    parsed: Boolean(parsed),
    preview: ai.text.slice(0, 180),
  });

  const fallback: SuggestedOutfitJson = (() => {
    if (canSeparates) {
      return {
        outfitType: 'separates',
        topId: tops[0]!.id,
        bottomId: bottoms[0]!.id,
        shoesId: shoes[0]!.id,
        reason: 'Set fallback từ tủ đồ gần nhất (tách lớp).',
      };
    }
    return {
      outfitType: 'onepiece',
      onePieceId: onepieces[0]!.id,
      shoesId: shoes[0]?.id ?? '',
      reason: 'Set fallback từ tủ đồ gần nhất (one-piece).',
    };
  })();

  const pickValid = (p: SuggestedOutfitJson | null): SuggestedOutfitJson => {
    const use = p ?? fallback;
    if (use.outfitType === 'separates') {
      if (!canSeparates) return fallback;
      return use;
    }
    if (onepieces.length === 0) return fallback;
    return use;
  };

  const picked = pickValid(parsed);

  let top: Garment | null = null;
  let bottom: Garment | null = null;
  let shoe: Garment | null = null;
  let onePiece: Garment | null = null;

  if (picked.outfitType === 'onepiece') {
    const oid = normalizeId(picked.onePieceId);
    onePiece =
      (oid ? garments.find((g) => g.id === oid && g.category === 'onepiece') : undefined) ??
      onepieces[0]!;
    const sid = normalizeId(picked.shoesId);
    shoe =
      (sid ? garments.find((g) => g.id === sid && g.category === 'shoes') : undefined) ?? shoes[0] ?? null;
  } else {
    const tid = normalizeId(picked.topId);
    const bid = normalizeId(picked.bottomId);
    const sid = normalizeId(picked.shoesId);
    top =
      (tid ? garments.find((g) => g.id === tid && g.category === 'top') : undefined) ?? tops[0]!;
    bottom =
      (bid ? garments.find((g) => g.id === bid && g.category === 'bottom') : undefined) ?? bottoms[0]!;
    shoe =
      (sid ? garments.find((g) => g.id === sid && g.category === 'shoes') : undefined) ?? shoes[0]!;
  }

  // eslint-disable-next-line no-console
  console.log('[ai][suggest] final', {
    usedFallback: !parsed,
    outfitType: picked.outfitType,
    topId: top?.id,
    bottomId: bottom?.id,
    shoesId: shoe?.id,
    onePieceId: onePiece?.id,
  });

  return {
    outfit: {
      top,
      bottom,
      shoes: shoe,
      onePiece,
    },
    reason: picked.reason ?? 'Được gợi ý bởi AI.',
    model: ai.model,
    usedFallback: !parsed,
  };
}
