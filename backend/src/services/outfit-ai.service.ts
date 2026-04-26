import { prisma } from '../lib/prisma.js';
import type { SuggestOutfitBodyDto } from '../dto/outfit.dto.js';
import { buildOutfitPromptFromGarments } from './outfit-prompt.builder.js';
import { GeminiOutfitService } from './gemini-outfit.service.js';

type SuggestedOutfitJson = {
  topId: string;
  bottomId: string;
  shoesId: string;
  reason?: string;
};

function parseJsonFromText(text: string): SuggestedOutfitJson | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as SuggestedOutfitJson;
    if (!obj?.topId || !obj?.bottomId || !obj?.shoesId) return null;
    return obj;
  } catch {
    return null;
  }
}

export async function suggestAiOutfit(userId: string, input: SuggestOutfitBodyDto) {
  // eslint-disable-next-line no-console
  console.log('[ai][suggest] start', {
    userId,
    vibe: input.vibe,
    occasion: input.occasion,
  });
  const garments = await prisma.garment.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });

  const tops = garments.filter((g) => g.category === 'top');
  const bottoms = garments.filter((g) => g.category === 'bottom');
  const shoes = garments.filter((g) => g.category === 'shoes');
  // eslint-disable-next-line no-console
  console.log('[ai][suggest] wardrobe:loaded', {
    total: garments.length,
    tops: tops.length,
    bottoms: bottoms.length,
    shoes: shoes.length,
  });

  if (tops.length === 0 || bottoms.length === 0 || shoes.length === 0) {
    // eslint-disable-next-line no-console
    console.log('[ai][suggest] abort:missing-categories');
    return {
      outfit: null,
      reason: 'Thiếu món để phối (cần đủ áo, quần, giày).',
      missing: [
        ...(tops.length === 0 ? ['top'] : []),
        ...(bottoms.length === 0 ? ['bottom'] : []),
        ...(shoes.length === 0 ? ['shoes'] : []),
      ],
    };
  }

  const prompt = buildOutfitPromptFromGarments(garments, {
    vibe: input.vibe,
    occasion: input.occasion,
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

  const fallback = {
    topId: tops[0]!.id,
    bottomId: bottoms[0]!.id,
    shoesId: shoes[0]!.id,
    reason: 'Set fallback từ tủ đồ gần nhất.',
  };

  const picked = parsed ?? fallback;

  const top = garments.find((g) => g.id === picked.topId && g.category === 'top') ?? tops[0]!;
  const bottom =
    garments.find((g) => g.id === picked.bottomId && g.category === 'bottom') ?? bottoms[0]!;
  const shoe = garments.find((g) => g.id === picked.shoesId && g.category === 'shoes') ?? shoes[0]!;
  // eslint-disable-next-line no-console
  console.log('[ai][suggest] final', {
    usedFallback: !parsed,
    topId: top.id,
    bottomId: bottom.id,
    shoesId: shoe.id,
  });

  return {
    outfit: {
      top,
      bottom,
      shoes: shoe,
    },
    reason: picked.reason ?? 'Được gợi ý bởi AI.',
    model: ai.model,
    usedFallback: !parsed,
  };
}
