import { z } from 'zod';

/** PATCH /users/me — ít nhất một trường */
export const UpdateProfileBodySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    heightCm: z.number().int().min(50).max(260).nullable().optional(),
    weightKg: z.number().int().min(20).max(400).nullable().optional(),
    personImageUrl: z.string().url().nullable().optional(),

    gender: z.enum(['male', 'female', 'unisex']).nullable().optional(),
    bodyShape: z.enum(['rectangle', 'pear', 'inverted_triangle', 'apple', 'hourglass']).nullable().optional(),
    skinTone: z.enum(['fair', 'light', 'medium', 'tan', 'dark']).nullable().optional(),
    ageGroup: z.enum(['under_18', 'age_18_24', 'age_25_34', 'age_35_44', 'above_45']).nullable().optional(),
    stylePreference: z.array(z.string()).optional(), // OutfitVibe enum values
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.heightCm !== undefined ||
      d.weightKg !== undefined ||
      d.personImageUrl !== undefined ||
      d.gender !== undefined ||
      d.bodyShape !== undefined ||
      d.skinTone !== undefined ||
      d.ageGroup !== undefined ||
      d.stylePreference !== undefined,
    { message: 'At least one field required' }
  );

export type UpdateProfileBodyDto = z.infer<typeof UpdateProfileBodySchema>;
