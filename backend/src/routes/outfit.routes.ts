import { Router } from 'express';
import { outfitController } from '../controllers/outfit.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const outfitRouter = Router();

outfitRouter.post('/suggest-ai', requireAuth, outfitController.suggestAi);
outfitRouter.post('/save-ai', requireAuth, outfitController.saveAi);
outfitRouter.post('/wear-logs', requireAuth, outfitController.createWearLog);
outfitRouter.post('/:id/try-on', requireAuth, outfitController.tryOn);
outfitRouter.get('/mine', requireAuth, outfitController.mine);
outfitRouter.get('/wear-logs', requireAuth, outfitController.wearLogs);
outfitRouter.delete('/:id', requireAuth, outfitController.remove);
