import type { Garment } from '@prisma/client';

export type OutfitSuggestionContext = {
  vibe?: string;
  occasion?: string;
  weather?: string;
  temperatureC?: number;
  extraNotes?: string;
};

function normalize(value: string | null | undefined): string {
  const text = value?.trim();
  return text && text.length > 0 ? text : '—';
}

function garmentToLine(item: Garment): string {
  return [
    `id=${item.id}`,
    `name=${normalize(item.name)}`,
    `category=${item.category}`,
    `brand=${normalize(item.brand)}`,
    `material=${normalize(item.material)}`,
    `fit=${normalize(item.fit)}`,
    `pattern=${normalize(item.pattern)}`,
    `color=${normalize(item.color)}`,
    `size=${normalize(item.size)}`,
  ].join(' | ');
}

/**
 * Build tiếng Việt prompt text từ wardrobe cho AI phối đồ.
 * Kết quả được giữ deterministic và ngắn gọn để model dễ bám.
 */
export function buildOutfitPromptFromGarments(
  garments: Garment[],
  context: OutfitSuggestionContext = {}
): string {
  const grouped = {
    top: garments.filter((g) => g.category === 'top'),
    bottom: garments.filter((g) => g.category === 'bottom'),
    shoes: garments.filter((g) => g.category === 'shoes'),
    outer: garments.filter((g) => g.category === 'outer'),
    accessory: garments.filter((g) => g.category === 'accessory'),
  } as const;

  const sections = (Object.keys(grouped) as Array<keyof typeof grouped>).map((category) => {
    const items = grouped[category];
    if (items.length === 0) return `## ${category.toUpperCase()}\n- (trống)`;
    return `## ${category.toUpperCase()}\n${items.map((item) => `- ${garmentToLine(item)}`).join('\n')}`;
  });

  return [
    '# DU_LIEU_GOI_Y_PHOI_DO',
    `vibe: ${normalize(context.vibe)}`,
    `dip: ${normalize(context.occasion)}`,
    `thoi_tiet: ${normalize(context.weather)}`,
    `nhiet_do_C: ${context.temperatureC ?? '—'}`,
    `ghi_chu: ${normalize(context.extraNotes)}`,
    '',
    '# TU_DO',
    ...sections,
    '',
    '# YEU_CAU',
    'Hãy chọn 1 set tốt nhất để mặc ngay.',
    'Chỉ dùng ID có trong danh sách ở trên.',
    'Ưu tiên fit cân bằng, tránh đụng hoa văn quá mạnh.',
    'Trả về JSON hợp lệ theo key được yêu cầu trong system prompt.',
  ].join('\n');
}
