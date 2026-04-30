import { z } from 'zod';
import {
  GarmentCategory,
  GarmentFit,
  GarmentPattern,
  GarmentSubCategory,
} from '@prisma/client';
import { isSubCategoryAllowedForCategory } from '../domain/garment-taxonomy.js';

export const GARMENT_CATEGORIES = [
  GarmentCategory.top,
  GarmentCategory.bottom,
  GarmentCategory.shoes,
  GarmentCategory.outer,
  GarmentCategory.accessory,
  GarmentCategory.onepiece,
] as const;
export type GarmentCategoryDto = (typeof GARMENT_CATEGORIES)[number];

const optionalTrimmed = z
  .string()
  .trim()
  .transform((s) => (s.length === 0 ? undefined : s))
  .optional()
  .nullable();

function refineCategorySubCategory(data: { category: GarmentCategory; subCategory?: GarmentSubCategory | null }) {
  if (data.subCategory == null) return true;
  return isSubCategoryAllowedForCategory(data.category, data.subCategory);
}

export const CreateGarmentBodySchema = z
  .object({
    name: z.string().trim().min(1),
    category: z.nativeEnum(GarmentCategory),
    subCategory: z.nativeEnum(GarmentSubCategory).optional().nullable(),
    imageUrl: z.string().url(),
    brand: optionalTrimmed,
    material: optionalTrimmed,
    fit: z.nativeEnum(GarmentFit).optional().nullable(),
    pattern: z.nativeEnum(GarmentPattern).optional().nullable(),
    size: optionalTrimmed,
    color: optionalTrimmed,
    note: z.string().trim().optional().nullable(),
    purchasePriceVnd: z.number().int().min(0).optional().nullable(),
    wearCount: z.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (!refineCategorySubCategory(data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'subCategory does not match category',
        path: ['subCategory'],
      });
    }
  });

export type CreateGarmentBodyDto = z.infer<typeof CreateGarmentBodySchema>;

export const UpdateGarmentBodySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    category: z.nativeEnum(GarmentCategory).optional(),
    subCategory: z.nativeEnum(GarmentSubCategory).optional().nullable(),
    imageUrl: z.string().url().optional(),
    brand: optionalTrimmed,
    material: optionalTrimmed,
    fit: z.nativeEnum(GarmentFit).optional().nullable(),
    pattern: z.nativeEnum(GarmentPattern).optional().nullable(),
    size: optionalTrimmed,
    color: optionalTrimmed,
    note: z.string().trim().nullable().optional(),
    purchasePriceVnd: z.number().int().min(0).nullable().optional(),
    wearCount: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' })
  .superRefine((data, ctx) => {
    if (data.category !== undefined && data.subCategory != null && data.subCategory !== undefined) {
      if (!isSubCategoryAllowedForCategory(data.category, data.subCategory)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'subCategory does not match category',
          path: ['subCategory'],
        });
      }
    }
  });

export type UpdateGarmentBodyDto = z.infer<typeof UpdateGarmentBodySchema>;

export const ListGarmentQuerySchema = z.object({
  category: z.nativeEnum(GarmentCategory).optional(),
  subCategory: z.nativeEnum(GarmentSubCategory).optional(),
});

export type ListGarmentQueryDto = z.infer<typeof ListGarmentQuerySchema>;
