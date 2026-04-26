import { z } from 'zod';

export const GARMENT_CATEGORIES = ['top', 'bottom', 'shoes', 'outer', 'accessory'] as const;
export type GarmentCategoryDto = (typeof GARMENT_CATEGORIES)[number];

const trimmedOrDash = z
  .string()
  .trim()
  .transform((s) => (s.length === 0 ? '—' : s));

export const CreateGarmentBodySchema = z.object({
  name: trimmedOrDash,
  category: z.enum(GARMENT_CATEGORIES),
  imageUrl: z.string().url(),
  recycledImageUrl: z.string().url(),
  brand: trimmedOrDash,
  material: trimmedOrDash,
  fit: trimmedOrDash,
  pattern: z.string().trim().min(1),
  size: trimmedOrDash,
  color: trimmedOrDash,
  careWash: trimmedOrDash,
  careDry: trimmedOrDash,
  note: z.string().trim().optional().nullable(),
  purchasePriceVnd: z.number().min(0).optional().nullable(),
  wearCount: z.number().int().min(0).optional(),
});

export type CreateGarmentBodyDto = z.infer<typeof CreateGarmentBodySchema>;

export const UpdateGarmentBodySchema = z
  .object({
    name: trimmedOrDash.optional(),
    category: z.enum(GARMENT_CATEGORIES).optional(),
    imageUrl: z.string().url().optional(),
    recycledImageUrl: z.string().url().optional(),
    brand: trimmedOrDash.optional(),
    material: trimmedOrDash.optional(),
    fit: trimmedOrDash.optional(),
    pattern: z.string().trim().min(1).optional(),
    size: trimmedOrDash.optional(),
    color: trimmedOrDash.optional(),
    careWash: trimmedOrDash.optional(),
    careDry: trimmedOrDash.optional(),
    note: z.string().trim().nullable().optional(),
    purchasePriceVnd: z.number().min(0).nullable().optional(),
    wearCount: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

export type UpdateGarmentBodyDto = z.infer<typeof UpdateGarmentBodySchema>;

export const ListGarmentQuerySchema = z.object({
  category: z.enum(GARMENT_CATEGORIES).optional(),
});

export type ListGarmentQueryDto = z.infer<typeof ListGarmentQuerySchema>;
