import type { Request, Response } from 'express';

import {
  LoginBodySchema,
  LogoutBodySchema,
  RefreshBodySchema,
  RegisterBodySchema,
} from '../dto/auth.dto.js';
import {
  getUserById,
  login,
  logoutAllDevices,
  logoutByRefreshToken,
  normalizeRouteError,
  refreshSession,
  register,
} from '../services/auth.service.js';
import { verifyAccessToken } from '../services/token.service.js';

const validationJson = { error: 'Invalid body', code: 'VALIDATION' } as const;

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    const parsed = RegisterBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationJson);
      return;
    }
    try {
      const out = await register(parsed.data);
      res.status(201).json(out);
    } catch (err) {
      const n = normalizeRouteError(err);
      res.status(n.status).json({ error: n.error, code: n.code });
    }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const parsed = LoginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationJson);
      return;
    }
    try {
      const out = await login(parsed.data);
      res.status(200).json(out);
    } catch (err) {
      const n = normalizeRouteError(err);
      res.status(n.status).json({ error: n.error, code: n.code });
    }
  },

  refresh: async (req: Request, res: Response): Promise<void> => {
    const parsed = RefreshBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationJson);
      return;
    }
    try {
      const out = await refreshSession(parsed.data.refreshToken);
      res.status(200).json(out);
    } catch (err) {
      const n = normalizeRouteError(err);
      res.status(n.status).json({ error: n.error, code: n.code });
    }
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    const parsed = LogoutBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(validationJson);
      return;
    }
    const { refreshToken, allDevices } = parsed.data;

    if (allDevices) {
      const header = req.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
      if (!token) {
        res.status(401).json({ error: 'Missing authorization', code: 'UNAUTHORIZED' });
        return;
      }
      try {
        const { sub } = verifyAccessToken(token);
        await logoutAllDevices(sub);
        res.status(204).send();
      } catch {
        res.status(401).json({ error: 'Invalid or expired access token', code: 'UNAUTHORIZED' });
      }
      return;
    }

    if (refreshToken) {
      await logoutByRefreshToken(refreshToken);
      res.status(204).send();
      return;
    }

    res.status(400).json({
      error: 'Provide refreshToken or allDevices with Bearer',
      code: 'VALIDATION',
    });
  },

  /** Gọi sau `requireAuth` — `req.userId` đã được gắn */
  me: async (req: Request, res: Response): Promise<void> => {
    const user = await getUserById(req.userId!);
    if (!user) {
      res.status(401).json({ error: 'User not found', code: 'UNAUTHORIZED' });
      return;
    }
    res.status(200).json({ user });
  },
};
