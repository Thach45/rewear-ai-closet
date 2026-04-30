import type { GarmentCategory, GarmentSubCategory } from '@prisma/client';

/**
 * Maps each garment category to allowed sub-categories (application-layer constraint; Prisma cannot enforce).
 */
export const CATEGORY_TO_SUBCATEGORIES: Record<GarmentCategory, readonly GarmentSubCategory[]> = {
  top: [
    'tshirt',
    'shirt',
    'blouse',
    'polo',
    'tankTop',
    'hoodie',
    'sweater',
  ],
  bottom: ['jeans', 'trousers', 'shorts', 'skirt'],
  shoes: ['sneakers', 'loafers', 'boots', 'sandals', 'heels'],
  outer: ['jacket', 'coat', 'blazer', 'cardigan'],
  accessory: ['bag', 'hat', 'belt', 'jewelry', 'scarf'],
  onepiece: ['dress', 'jumpsuit'],
} as const;

export function isSubCategoryAllowedForCategory(
  category: GarmentCategory,
  subCategory: GarmentSubCategory
): boolean {
  return (CATEGORY_TO_SUBCATEGORIES[category] as readonly GarmentSubCategory[]).includes(subCategory);
}
