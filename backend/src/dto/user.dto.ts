import { z } from 'zod';

/** PATCH /users/me — ít nhất một trường */
export const UpdateProfileBodySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    heightCm: z.number().int().min(50).max(260).nullable().optional(),
    weightKg: z.number().int().min(20).max(400).nullable().optional(),
    personImageUrl: z.string().url().nullable().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.heightCm !== undefined ||
      d.weightKg !== undefined ||
      d.personImageUrl !== undefined,
    { message: 'At least one field required' }
  );

export type UpdateProfileBodyDto = z.infer<typeof UpdateProfileBodySchema>;
