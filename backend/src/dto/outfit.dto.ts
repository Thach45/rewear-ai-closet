import { z } from 'zod';

export const SuggestOutfitBodySchema = z.object({
  vibe: z.string().trim().min(1),
  occasion: z.string().trim().min(1),
});

export type SuggestOutfitBodyDto = z.infer<typeof SuggestOutfitBodySchema>;

export const SaveAiOutfitBodySchema = z.object({
  vibe: z.string().trim().min(1),
  occasion: z.string().trim().min(1),
  reason: z.string().trim().optional(),
  topId: z.string().trim().min(1),
  bottomId: z.string().trim().min(1),
  shoesId: z.string().trim().min(1),
});

export type SaveAiOutfitBodyDto = z.infer<typeof SaveAiOutfitBodySchema>;

export const TryOnOutfitBodySchema = z.object({
  personImageUrl: z.string().url().optional(),
});

export type TryOnOutfitBodyDto = z.infer<typeof TryOnOutfitBodySchema>;

export const CreateWearLogBodySchema = z.object({
  topId: z.string().trim().min(1),
  bottomId: z.string().trim().min(1),
  shoesId: z.string().trim().min(1),
  vibe: z.string().trim().optional(),
  occasion: z.string().trim().optional(),
  wornAt: z.coerce.date().optional(),
});

export type CreateWearLogBodyDto = z.infer<typeof CreateWearLogBodySchema>;
