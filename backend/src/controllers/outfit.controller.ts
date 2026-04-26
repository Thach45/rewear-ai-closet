import type { Request, Response } from 'express';
import {
  CreateWearLogBodySchema,
  SaveAiOutfitBodySchema,
  SuggestOutfitBodySchema,
  TryOnOutfitBodySchema,
} from '../dto/outfit.dto.js';
import { suggestAiOutfit } from '../services/outfit-ai.service.js';
import {
  createWearLog,
  deleteSavedOutfit,
  listSavedOutfits,
  listWearLogs,
  saveAiOutfit,
  tryOnSavedOutfit,
} from '../services/outfit.service.js';

export const outfitController = {
  suggestAi: async (req: Request, res: Response): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log('[api][outfits/suggest-ai] incoming', {
      userId: req.userId,
      hasBody: Boolean(req.body),
    });
    const parsed = SuggestOutfitBodySchema.safeParse(req.body);
    if (!parsed.success) {
      // eslint-disable-next-line no-console
      console.warn('[api][outfits/suggest-ai] validation:failed', parsed.error.flatten().fieldErrors);
      res.status(400).json({ error: 'Invalid body', code: 'VALIDATION' });
      return;
    }
    try {
      const result = await suggestAiOutfit(req.userId!, parsed.data);
      // eslint-disable-next-line no-console
      console.log('[api][outfits/suggest-ai] success', {
        hasOutfit: Boolean(result.outfit),
        usedFallback: (result as { usedFallback?: boolean }).usedFallback ?? false,
      });
      res.status(200).json(result);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[api][outfits/suggest-ai] failed', error);
      res.status(500).json({ error: 'Suggest failed', code: 'AI_SUGGEST_FAILED' });
    }
  },
  saveAi: async (req: Request, res: Response): Promise<void> => {
    const parsed = SaveAiOutfitBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid body', code: 'VALIDATION' });
      return;
    }
    try {
      const outfit = await saveAiOutfit(req.userId!, parsed.data);
      if (!outfit) {
        res.status(400).json({ error: 'Invalid outfit items', code: 'INVALID_OUTFIT_ITEMS' });
        return;
      }
      res.status(201).json({ outfit });
    } catch {
      res.status(500).json({ error: 'Save outfit failed', code: 'SAVE_OUTFIT_FAILED' });
    }
  },
  mine: async (req: Request, res: Response): Promise<void> => {
    try {
      const outfits = await listSavedOutfits(req.userId!);
      res.status(200).json({ outfits });
    } catch {
      res.status(500).json({ error: 'Load outfits failed', code: 'LOAD_OUTFITS_FAILED' });
    }
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    const outfitId = typeof rawId === 'string' ? rawId.trim() : '';
    if (!outfitId) {
      res.status(400).json({ error: 'Missing outfit id', code: 'VALIDATION' });
      return;
    }
    try {
      const removed = await deleteSavedOutfit(req.userId!, outfitId);
      if (!removed) {
        res.status(404).json({ error: 'Outfit not found', code: 'OUTFIT_NOT_FOUND' });
        return;
      }
      res.status(200).json({ ok: true });
    } catch {
      res.status(500).json({ error: 'Delete outfit failed', code: 'DELETE_OUTFIT_FAILED' });
    }
  },
  tryOn: async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    const outfitId = typeof rawId === 'string' ? rawId.trim() : '';
    if (!outfitId) {
      res.status(400).json({ error: 'Missing outfit id', code: 'VALIDATION' });
      return;
    }
    const parsed = TryOnOutfitBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid body', code: 'VALIDATION' });
      return;
    }
    try {
      const result = await tryOnSavedOutfit(req.userId!, outfitId, parsed.data);
      res.status(200).json(result);
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      // eslint-disable-next-line no-console
      console.error('[api][outfits/try-on] failed', {
        userId: req.userId,
        outfitId,
        code,
        error,
      });
      if (code === 'OUTFIT_NOT_FOUND') {
        res.status(404).json({ error: 'Outfit not found', code });
        return;
      }
      if (code === 'OUTFIT_MISSING_REQUIRED_ITEMS' || code === 'MISSING_PERSON_IMAGE') {
        res.status(400).json({
          error: code === 'MISSING_PERSON_IMAGE' ? 'Missing personImageUrl for try-on' : 'Outfit missing top/bottom/shoes',
          code,
        });
        return;
      }
      if (code.startsWith('TRY_ON_INPUT_IMAGE_UNREACHABLE:')) {
        const rawDetail = code.replace('TRY_ON_INPUT_IMAGE_UNREACHABLE:', '').trim();
        let parsedDetail: unknown = rawDetail;
        try {
          parsedDetail = JSON.parse(rawDetail);
        } catch {
          parsedDetail = rawDetail;
        }
        res.status(400).json({
          error: 'Try-on input image is not publicly reachable',
          code: 'TRY_ON_INPUT_IMAGE_UNREACHABLE',
          hint: 'Ensure personImageUrl and garment image URL are public https links returning an image/* content-type.',
          detail: parsedDetail,
        });
        return;
      }
      if (code.startsWith('TRY_ON_PROVIDER_FAILED:')) {
        const rawDetail = code.replace('TRY_ON_PROVIDER_FAILED:', '').trim();
        let parsedDetail: unknown = rawDetail;
        try {
          parsedDetail = JSON.parse(rawDetail);
        } catch {
          parsedDetail = rawDetail;
        }
        res.status(502).json({
          error: 'Try-on provider failed (upstream service error)',
          code: 'TRY_ON_PROVIDER_FAILED',
          hint: 'Please retry in 20-30 seconds. If it keeps failing, verify input images are publicly accessible URLs.',
          detail: parsedDetail,
        });
        return;
      }
      res.status(500).json({
        error: 'Try-on failed',
        code: 'TRY_ON_FAILED',
        detail: code || 'Unknown error',
      });
    }
  },
  createWearLog: async (req: Request, res: Response): Promise<void> => {
    const parsed = CreateWearLogBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid body', code: 'VALIDATION' });
      return;
    }
    try {
      const wearLog = await createWearLog(req.userId!, parsed.data);
      if (!wearLog) {
        res.status(400).json({ error: 'Invalid outfit items', code: 'INVALID_OUTFIT_ITEMS' });
        return;
      }
      res.status(201).json({ wearLog });
    } catch {
      res.status(500).json({ error: 'Create wear log failed', code: 'CREATE_WEAR_LOG_FAILED' });
    }
  },
  wearLogs: async (req: Request, res: Response): Promise<void> => {
    try {
      const logs = await listWearLogs(req.userId!);
      res.status(200).json({ logs });
    } catch {
      res.status(500).json({ error: 'Load wear logs failed', code: 'LOAD_WEAR_LOGS_FAILED' });
    }
  },
};
