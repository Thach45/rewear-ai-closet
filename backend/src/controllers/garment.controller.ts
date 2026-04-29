import type { Request, Response } from 'express';

import {
  CreateGarmentBodySchema,
  ListGarmentQuerySchema,
  UpdateGarmentBodySchema,
  GarmentAnalysisBodySchema,
} from '../dto/garment.dto.js';
import { GarmentAiService } from '../services/garment-ai.service.js';
import { uploadGarmentImageBuffer } from '../lib/cloudinary.js';
import {
  createGarment,
  deleteGarment,
  getGarment,
  listGarments,
  updateGarment,
  incrementGarmentWearCount,
} from '../services/garment.service.js';

const validationJson = { error: 'Invalid body', code: 'VALIDATION' } as const;

function paramId(req: Request): string {
  const raw = req.params.id;
  return Array.isArray(raw) ? raw[0]! : raw!;
}

export const garmentController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const parsed = ListGarmentQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json(validationJson);
      return;
    }
    const items = await listGarments(req.userId!, parsed.data);
    res.status(200).json({ garments: items });
  },

  getById: async (req: Request, res: Response): Promise<void> => {
    const id = paramId(req);
    const garment = await getGarment(req.userId!, id);
    if (!garment) {
      res.status(404).json({ error: 'Garment not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({ garment });
  },

  create: async (req: Request, res: Response): Promise<void> => {
    const parsed = CreateGarmentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationJson);
      return;
    }
    try {
      const garment = await createGarment(req.userId!, parsed.data);
      res.status(201).json({ garment });
    } catch {
      res.status(500).json({ error: 'Create failed', code: 'INTERNAL' });
    }
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const parsed = UpdateGarmentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationJson);
      return;
    }
    const id = paramId(req);
    const garment = await updateGarment(req.userId!, id, parsed.data);
    if (!garment) {
      res.status(404).json({ error: 'Garment not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(200).json({ garment });
  },

  remove: async (req: Request, res: Response): Promise<void> => {
    const id = paramId(req);
    const ok = await deleteGarment(req.userId!, id);
    if (!ok) {
      res.status(404).json({ error: 'Garment not found', code: 'NOT_FOUND' });
      return;
    }
    res.status(204).send();
  },

  markWorn: async (req: Request, res: Response): Promise<void> => {
    const id = paramId(req);
    try {
      const garment = await incrementGarmentWearCount(req.userId!, id);
      if (!garment) {
        res.status(404).json({ error: 'Garment not found', code: 'NOT_FOUND' });
        return;
      }
      res.status(200).json({ garment });
    } catch {
      res.status(500).json({ error: 'Mark worn failed', code: 'INTERNAL' });
    }
  },

  uploadMedia: async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Missing image file', code: 'VALIDATION' });
      return;
    }
    try {
      const noBgUrl = await uploadGarmentImageBuffer(file.buffer, req.userId!);
      res.status(200).json({ noBgUrl });
    } catch {
      res.status(500).json({ error: 'Upload failed', code: 'UPLOAD_FAILED' });
    }
  },

  analyzeMedia: async (req: Request, res: Response): Promise<void> => {
    const parsed = GarmentAnalysisBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationJson);
      return;
    }
    try {
      const aiService = new GarmentAiService();
      const analysis = await aiService.analyzeGarmentFromUrl(parsed.data.imageUrl);
      res.status(200).json({ analysis });
    } catch (error) {
      console.error('[GarmentController] analyzeMedia error:', error);
      res.status(500).json({ error: 'AI analysis failed', code: 'INTERNAL' });
    }
  },
};
