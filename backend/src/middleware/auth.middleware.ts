import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/token.service.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
  if (!token) {
    res.status(401).json({ error: 'Missing authorization', code: 'UNAUTHORIZED' });
    return;
  }
  try {
    const { sub } = verifyAccessToken(token);
    req.userId = sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token', code: 'UNAUTHORIZED' });
  }
}
