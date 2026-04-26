import type { Request, Response } from 'express';

import { UpdateProfileBodySchema } from '../dto/user.dto.js';
import { uploadAvatarBuffer } from '../lib/cloudinary.js';
import { setPersonImageUrl, updateProfile } from '../services/user.service.js';

const validationJson = { error: 'Invalid body', code: 'VALIDATION' } as const;

export const userController = {
  patchMe: async (req: Request, res: Response): Promise<void> => {
    const parsed = UpdateProfileBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationJson);
      return;
    }
    try {
      const user = await updateProfile(req.userId!, parsed.data);
      res.status(200).json({ user });
    } catch {
      res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    }
  },

  uploadAvatar: async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'Missing image file', code: 'VALIDATION' });
      return;
    }
    try {
      const personImageUrl = await uploadAvatarBuffer(file.buffer, req.userId!);
      const user = await setPersonImageUrl(req.userId!, personImageUrl);
      res.status(200).json({ user });
    } catch {
      res.status(500).json({ error: 'Upload avatar failed', code: 'UPLOAD_FAILED' });
    }
  },
};
