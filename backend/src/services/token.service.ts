import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { loadEnv } from '../config/env.js';

export type AccessJwtPayload = { sub: string; email: string };

export function hashRefreshToken(plain: string): string {
  return crypto.createHash('sha256').update(plain, 'utf8').digest('hex');
}

export function signAccessToken(userId: string, email: string): string {
  const env = loadEnv();
  const expiresIn = env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'];
  return jwt.sign({ sub: userId, email }, env.JWT_ACCESS_SECRET, {
    expiresIn,
  });
}

export function verifyAccessToken(token: string): AccessJwtPayload {
  const env = loadEnv();
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload & {
    sub?: string;
    email?: string;
  };
  if (!decoded.sub || !decoded.email) {
    throw new Error('Invalid access token payload');
  }
  return { sub: decoded.sub, email: decoded.email };
}

export function signRefreshToken(userId: string): string {
  const env = loadEnv();
  const jti = crypto.randomBytes(16).toString('hex');
  const expiresIn = env.JWT_REFRESH_EXPIRES as SignOptions['expiresIn'];
  return jwt.sign({ sub: userId, jti }, env.JWT_REFRESH_SECRET, {
    expiresIn,
  });
}

export function verifyRefreshToken(token: string): { userId: string } {
  const env = loadEnv();
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload & {
    sub?: string;
  };
  if (!decoded.sub) {
    throw new Error('Invalid refresh token payload');
  }
  return { userId: decoded.sub };
}

export function parseDurationToMs(expires: string): number {
  const m = /^(\d+)([smhd])$/i.exec(expires.trim());
  if (!m) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const mult =
    u === 's' ? 1000 : u === 'm' ? 60_000 : u === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}
