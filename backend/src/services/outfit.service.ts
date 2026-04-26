import type { GarmentCategory, Outfit } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { CreateWearLogBodyDto, SaveAiOutfitBodyDto } from '../dto/outfit.dto.js';
import type { TryOnOutfitBodyDto } from '../dto/outfit.dto.js';
import { generateTryOnImage } from './idm-vton.service.js';

type OutfitWithGarments = Outfit & {
  garments: Array<{
    id: string;
    category: GarmentCategory;
    name: string;
    imageUrl: string;
    recycledImageUrl: string;
    brand: string;
  }>;
};

type WearLogWithGarments = {
  id: string;
  vibe: string | null;
  occasion: string | null;
  wornAt: Date;
  createdAt: Date;
  garments: Array<{
    id: string;
    category: GarmentCategory;
    name: string;
    imageUrl: string;
    recycledImageUrl: string;
    brand: string;
  }>;
};

export async function saveAiOutfit(
  userId: string,
  input: SaveAiOutfitBodyDto
): Promise<OutfitWithGarments | null> {
  const ids = [input.topId, input.bottomId, input.shoesId];
  const garments = await prisma.garment.findMany({
    where: {
      userId,
      id: { in: ids },
    },
  });

  const top = garments.find((g) => g.id === input.topId && g.category === 'top');
  const bottom = garments.find((g) => g.id === input.bottomId && g.category === 'bottom');
  const shoes = garments.find((g) => g.id === input.shoesId && g.category === 'shoes');

  if (!top || !bottom || !shoes) return null;

  return prisma.outfit.create({
    data: {
      userId,
      vibe: input.vibe,
      occasion: input.occasion,
      reason: input.reason ?? null,
      garmentIds: [top.id, bottom.id, shoes.id],
      isFavorite: true,
      tryOnImageUrl: null,
    },
    include: {
      garments: {
        select: {
          id: true,
          category: true,
          name: true,
          imageUrl: true,
          recycledImageUrl: true,
          brand: true,
        },
      },
    },
  });
}

export async function listSavedOutfits(userId: string): Promise<OutfitWithGarments[]> {
  return prisma.outfit.findMany({
    where: { userId, isFavorite: true },
    orderBy: { createdAt: 'desc' },
    include: {
      garments: {
        select: {
          id: true,
          category: true,
          name: true,
          imageUrl: true,
          recycledImageUrl: true,
          brand: true,
        },
      },
    },
  });
}

export async function deleteSavedOutfit(userId: string, outfitId: string): Promise<boolean> {
  const existing = await prisma.outfit.findFirst({
    where: {
      id: outfitId,
      userId,
      isFavorite: true,
    },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.outfit.delete({
    where: { id: outfitId },
  });
  return true;
}

function sameOutfitCombo(garmentIds: string[], comboIds: string[]): boolean {
  if (garmentIds.length !== comboIds.length) return false;
  return comboIds.every((id) => garmentIds.includes(id));
}

export async function tryOnSavedOutfit(
  userId: string,
  outfitId: string,
  input: TryOnOutfitBodyDto
): Promise<{ outfit: OutfitWithGarments; usedCache: boolean }> {
  const outfit = await prisma.outfit.findFirst({
    where: { id: outfitId, userId, isFavorite: true },
    include: {
      garments: {
        select: {
          id: true,
          category: true,
          name: true,
          imageUrl: true,
          recycledImageUrl: true,
          brand: true,
        },
      },
    },
  });

  if (!outfit) {
    throw new Error('OUTFIT_NOT_FOUND');
  }

  const top = outfit.garments.find((item) => item.category === 'top');
  const bottom = outfit.garments.find((item) => item.category === 'bottom');
  const shoes = outfit.garments.find((item) => item.category === 'shoes');
  if (!top || !bottom || !shoes) {
    throw new Error('OUTFIT_MISSING_REQUIRED_ITEMS');
  }

  const personImageUrl =
    input.personImageUrl ??
    (
      await prisma.user.findUnique({
        where: { id: userId },
        select: { personImageUrl: true },
      })
    )?.personImageUrl;
  if (!personImageUrl) {
    throw new Error('MISSING_PERSON_IMAGE');
  }

  const comboIds = [top.id, bottom.id, shoes.id];
  const cachedOutfits = await prisma.outfit.findMany({
    where: {
      userId,
      isFavorite: true,
      tryOnImageUrl: { not: null },
      garmentIds: { hasEvery: comboIds },
    },
    select: {
      id: true,
      garmentIds: true,
      tryOnImageUrl: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  });
  const cacheHit = cachedOutfits.find(
    (item) => Boolean(item.tryOnImageUrl) && sameOutfitCombo(item.garmentIds, comboIds)
  );

  const tryOnImageUrl =
    cacheHit?.tryOnImageUrl ??
    (
      await generateTryOnImage({
        personImageUrl,
        garmentImageUrl: top.imageUrl,
      })
    ).outputImageUrl;

  const updated = await prisma.outfit.update({
    where: { id: outfitId },
    data: { tryOnImageUrl },
    include: {
      garments: {
        select: {
          id: true,
          category: true,
          name: true,
          imageUrl: true,
          recycledImageUrl: true,
          brand: true,
        },
      },
    },
  });

  return { outfit: updated, usedCache: Boolean(cacheHit) };
}

export async function createWearLog(
  userId: string,
  input: CreateWearLogBodyDto
): Promise<WearLogWithGarments | null> {
  const ids = [input.topId, input.bottomId, input.shoesId];
  const garments = await prisma.garment.findMany({
    where: { userId, id: { in: ids } },
    select: {
      id: true,
      category: true,
      name: true,
      imageUrl: true,
      recycledImageUrl: true,
      brand: true,
    },
  });
  const top = garments.find((g) => g.id === input.topId && g.category === 'top');
  const bottom = garments.find((g) => g.id === input.bottomId && g.category === 'bottom');
  const shoes = garments.find((g) => g.id === input.shoesId && g.category === 'shoes');
  if (!top || !bottom || !shoes) return null;

  const log = await prisma.wearLog.create({
    data: {
      userId,
      garmentIds: [top.id, bottom.id, shoes.id],
      vibe: input.vibe ?? null,
      occasion: input.occasion ?? null,
      wornAt: input.wornAt ?? new Date(),
    },
  });
  return { ...log, garments: [top, bottom, shoes] };
}

export async function listWearLogs(userId: string): Promise<WearLogWithGarments[]> {
  const logs = await prisma.wearLog.findMany({
    where: { userId },
    orderBy: { wornAt: 'desc' },
    take: 200,
  });
  if (logs.length === 0) return [];
  const garmentIdSet = new Set<string>();
  logs.forEach((log) => log.garmentIds.forEach((id) => garmentIdSet.add(id)));
  const garments = await prisma.garment.findMany({
    where: { userId, id: { in: Array.from(garmentIdSet) } },
    select: {
      id: true,
      category: true,
      name: true,
      imageUrl: true,
      recycledImageUrl: true,
      brand: true,
    },
  });
  const garmentMap = new Map(garments.map((g) => [g.id, g]));
  return logs.map((log) => ({
    ...log,
    garments: log.garmentIds.map((id) => garmentMap.get(id)).filter((g): g is NonNullable<typeof g> => Boolean(g)),
  }));
}
