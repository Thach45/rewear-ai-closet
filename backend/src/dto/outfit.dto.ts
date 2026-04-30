import { z } from 'zod';
import { Occasion, OutfitVibe } from '@prisma/client';

const vibeInputSchema = z.union([z.nativeEnum(OutfitVibe), z.string().trim().min(1)]);
const occasionInputSchema = z.union([z.nativeEnum(Occasion), z.string().trim().min(1)]);

export const SuggestOutfitBodySchema = z.object({
  vibe: vibeInputSchema,
  occasion: occasionInputSchema.optional(),
});

export type SuggestOutfitBodyDto = z.infer<typeof SuggestOutfitBodySchema>;

const outfitCompositionRefine = (
  data: {
    topId?: string | undefined;
    bottomId?: string | undefined;
    shoesId?: string | undefined;
    onePieceId?: string | undefined;
  },
  ctx: z.RefinementCtx
) => {
  const hasSeparates = Boolean(data.topId && data.bottomId && data.shoesId);
  const hasOnePiece = Boolean(data.onePieceId);
  if (hasSeparates && hasOnePiece) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either separates (top+bottom+shoes) or onePieceId, not both',
      path: ['onePieceId'],
    });
  }
  if (!hasSeparates && !hasOnePiece) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide top+bottom+shoes or onePieceId',
    });
  }
  if (hasOnePiece && (data.topId || data.bottomId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Cannot mix onePieceId with top or bottom',
      path: ['onePieceId'],
    });
  }
};

export const SaveAiOutfitBodySchema = z
  .object({
    vibe: vibeInputSchema,
    occasion: occasionInputSchema.optional().nullable(),
    reason: z.string().trim().optional(),
    topId: z.string().trim().min(1).optional(),
    bottomId: z.string().trim().min(1).optional(),
    shoesId: z.string().trim().min(1).optional(),
    onePieceId: z.string().trim().min(1).optional(),
    outerIds: z.array(z.string().trim().min(1)).optional(),
    accessoryIds: z.array(z.string().trim().min(1)).optional(),
  })
  .superRefine((data, ctx) => outfitCompositionRefine(data, ctx));

export type SaveAiOutfitBodyDto = z.infer<typeof SaveAiOutfitBodySchema>;

export const TryOnOutfitBodySchema = z.object({
  personImageUrl: z.string().url().optional(),
});

export type TryOnOutfitBodyDto = z.infer<typeof TryOnOutfitBodySchema>;

export const CreateWearLogBodySchema = z
  .object({
    outfitId: z.string().trim().min(1).optional(),
    topId: z.string().trim().min(1).optional(),
    bottomId: z.string().trim().min(1).optional(),
    shoesId: z.string().trim().min(1).optional(),
    onePieceId: z.string().trim().min(1).optional(),
    outerIds: z.array(z.string().trim().min(1)).optional(),
    accessoryIds: z.array(z.string().trim().min(1)).optional(),
    vibe: vibeInputSchema.optional(),
    occasion: occasionInputSchema.optional(),
    wornAt: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.outfitId) return;
    outfitCompositionRefine(data, ctx);
  });

export type CreateWearLogBodyDto = z.infer<typeof CreateWearLogBodySchema>;
