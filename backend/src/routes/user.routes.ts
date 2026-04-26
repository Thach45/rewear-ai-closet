import { Router } from 'express';

import { userController } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadAvatarMiddleware } from '../lib/upload.js';

export const userRouter = Router();

userRouter.patch('/me', requireAuth, userController.patchMe);
userRouter.post(
  '/me/avatar',
  requireAuth,
  uploadAvatarMiddleware.single('file'),
  userController.uploadAvatar
);
