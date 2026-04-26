import type { User } from '@prisma/client';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { loadEnv } from '../config/env.js';
import {
  hashRefreshToken,
  parseDurationToMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from './token.service.js';

const BCRYPT_ROUNDS = 12;

export function userPublic(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash: _p, ...rest } = user;
  return rest;
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
}): Promise<{ user: Omit<User, 'passwordHash'>; accessToken: string; refreshToken: string }> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase().trim(),
      passwordHash,
      name: input.name.trim(),
    },
  });
  return issueSession(user);
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<{ user: Omit<User, 'passwordHash'>; accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase().trim() },
  });
  if (!user?.passwordHash) {
    const err = new Error('Invalid credentials');
    (err as NodeJS.ErrnoException).code = 'UNAUTHORIZED';
    throw err;
  }
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    const err = new Error('Invalid credentials');
    (err as NodeJS.ErrnoException).code = 'UNAUTHORIZED';
    throw err;
  }
  return issueSession(user);
}

async function issueSession(user: User): Promise<{
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}> {
  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id);
  const env = loadEnv();
  const expiresAt = new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES));
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      hashedToken: hashRefreshToken(refreshToken),
      expiresAt,
    },
  });
  return { user: userPublic(user), accessToken, refreshToken };
}

export async function refreshSession(refreshToken: string): Promise<{
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}> {
  let userId: string;
  try {
    ({ userId } = verifyRefreshToken(refreshToken));
  } catch {
    const err = new Error('Invalid refresh token');
    (err as NodeJS.ErrnoException).code = 'UNAUTHORIZED';
    throw err;
  }
  const hash = hashRefreshToken(refreshToken);
  const existing = await prisma.refreshToken.findFirst({
    where: { hashedToken: hash, userId },
  });
  if (!existing || existing.expiresAt < new Date()) {
    const err = new Error('Invalid refresh token');
    (err as NodeJS.ErrnoException).code = 'UNAUTHORIZED';
    throw err;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const err = new Error('Invalid refresh token');
    (err as NodeJS.ErrnoException).code = 'UNAUTHORIZED';
    throw err;
  }
  await prisma.refreshToken.delete({ where: { id: existing.id } });
  return issueSession(user);
}

export async function logoutByRefreshToken(refreshToken: string): Promise<void> {
  const hash = hashRefreshToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { hashedToken: hash } });
}

export async function logoutAllDevices(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function getUserById(id: string): Promise<Omit<User, 'passwordHash'> | null> {
  const user = await prisma.user.findUnique({ where: { id } });
  return user ? userPublic(user) : null;
}

/** Map Prisma / JWT errors to HTTP-friendly codes */
export function normalizeRouteError(err: unknown): { status: number; error: string; code?: string } {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code?: string }).code === 'UNAUTHORIZED' &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    return { status: 401, error: (err as { message: string }).message, code: 'UNAUTHORIZED' };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    return { status: 409, error: 'Email already registered', code: 'CONFLICT' };
  }
  if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
    return { status: 401, error: 'Invalid or expired token', code: 'UNAUTHORIZED' };
  }
  if (err instanceof Error && err.message.startsWith('Invalid environment')) {
    return { status: 500, error: 'Server misconfiguration', code: 'CONFIG' };
  }
  return { status: 500, error: 'Internal server error', code: 'INTERNAL' };
}
