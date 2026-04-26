import { z } from 'zod';

export const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(120),
});

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RefreshBodySchema = z.object({
  refreshToken: z.string().min(10),
});

export const LogoutBodySchema = z.object({
  refreshToken: z.string().min(10).optional(),
  allDevices: z.boolean().optional(),
});

export type RegisterBodyDto = z.infer<typeof RegisterBodySchema>;
export type LoginBodyDto = z.infer<typeof LoginBodySchema>;
export type RefreshBodyDto = z.infer<typeof RefreshBodySchema>;
export type LogoutBodyDto = z.infer<typeof LogoutBodySchema>;
