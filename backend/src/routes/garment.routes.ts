import { Router } from 'express';

import { garmentController } from '../controllers/garment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadGarmentMiddleware } from '../lib/upload.js';

export const garmentRouter = Router();

garmentRouter.get('/', requireAuth, garmentController.list);
garmentRouter.post(
  '/media',
  requireAuth,
  uploadGarmentMiddleware.single('file'),
  garmentController.uploadMedia
);
garmentRouter.post('/analyze', requireAuth, garmentController.analyzeMedia);
garmentRouter.post('/', requireAuth, garmentController.create);
garmentRouter.post('/:id/wear', requireAuth, garmentController.markWorn);
garmentRouter.get('/:id', requireAuth, garmentController.getById);
garmentRouter.patch('/:id', requireAuth, garmentController.update);
garmentRouter.delete('/:id', requireAuth, garmentController.remove);
