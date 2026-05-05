import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { userPublic } from './auth.service.js';
import type { UpdateProfileBodyDto } from '../dto/user.dto.js';

export async function updateProfile(userId: string, input: UpdateProfileBodyDto) {
  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.heightCm !== undefined) data.heightCm = input.heightCm;
  if (input.weightKg !== undefined) data.weightKg = input.weightKg;
  if (input.personImageUrl !== undefined) data.personImageUrl = input.personImageUrl;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.bodyShape !== undefined) data.bodyShape = input.bodyShape;
  if (input.skinTone !== undefined) data.skinTone = input.skinTone;
  if (input.ageGroup !== undefined) data.ageGroup = input.ageGroup;
  if (input.stylePreference !== undefined) data.stylePreference = input.stylePreference as any;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return userPublic(user);
}

export async function setPersonImageUrl(userId: string, personImageUrl: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { personImageUrl },
  });
  return userPublic(user);
}
