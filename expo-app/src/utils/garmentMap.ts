import type { Garment } from '@/types/garment';
import type { RackWardrobeItem } from '@/data/dummy';

/** Item hiển thị trên rack + cờ đồ cũ + chỉ số mặc/chi phí */
export type WardrobeRackItem = RackWardrobeItem & {
  wearCount: number;
  purchasePriceVnd: number | null;
  lastWornAt: string | null;
  createdAt: string;
};

export function mapGarmentToRackItem(g: Garment): WardrobeRackItem {
  return {
    id: g.id,
    name: g.name,
    category: g.category,
    subCategory: g.subCategory ?? null,
    image: g.imageUrl,
    recycledImage: g.imageUrl,
    brand: g.brand ?? '—',
    material: g.material ?? '—',
    fit: g.fit ?? '—',
    pattern: g.pattern ?? '—',
    size: g.size ?? '—',
    color: g.color ?? '—',
    careWash: '—',
    careDry: '—',
    note: g.note ?? undefined,
    wearCount: g.wearCount ?? 0,
    purchasePriceVnd: g.purchasePriceVnd ?? null,
    lastWornAt: g.lastWornAt ?? null,
    createdAt: g.createdAt,
  };
}
