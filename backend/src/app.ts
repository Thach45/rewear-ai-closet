import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import multer from 'multer';

import { authRouter } from './routes/auth.routes.js';
import { garmentRouter } from './routes/garment.routes.js';
import { healthRouter } from './routes/health.js';
import { outfitRouter } from './routes/outfit.routes.js';
import { userRouter } from './routes/user.routes.js';

export function createApp() {
  const app = express();
  const requestBodyLimit = '10mb';

  app.use(helmet());
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: requestBodyLimit }));

  app.use('/health', healthRouter);
  app.use('/auth', authRouter);
  app.use('/users', userRouter);
  app.use('/garments', garmentRouter);
  app.use('/outfits', outfitRouter);

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'Ảnh quá lớn. Giới hạn 10MB.' });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
