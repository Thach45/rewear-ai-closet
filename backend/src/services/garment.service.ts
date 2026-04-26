import type { Garment, GarmentCategory } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type {
  CreateGarmentBodyDto,
  ListGarmentQueryDto,
  UpdateGarmentBodyDto,
} from '../dto/garment.dto.js';

export async function listGarments(
  userId: string,
  query: ListGarmentQueryDto
): Promise<Garment[]> {
  const where: { userId: string; category?: GarmentCategory } = {
    userId,
  };
  if (query.category !== undefined) {
    where.category = query.category as GarmentCategory;
  }
  return prisma.garment.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getGarment(userId: string, id: string): Promise<Garment | null> {
  return prisma.garment.findFirst({
    where: { id, userId },
  });
}

export async function createGarment(userId: string, data: CreateGarmentBodyDto): Promise<Garment> {
  return prisma.garment.create({
    data: {
      userId,
      name: data.name,
      category: data.category as GarmentCategory,
      imageUrl: data.imageUrl,
      recycledImageUrl: data.recycledImageUrl,
      brand: data.brand,
      material: data.material,
      fit: data.fit,
      pattern: data.pattern,
      size: data.size,
      color: data.color,
      careWash: data.careWash,
      careDry: data.careDry,
      note: data.note ?? undefined,
      purchasePriceVnd: data.purchasePriceVnd ?? null,
      wearCount: data.wearCount ?? 0,
      outfitIds: [],
    },
  });
}

export async function updateGarment(
  userId: string,
  id: string,
  data: UpdateGarmentBodyDto
): Promise<Garment | null> {
  const existing = await prisma.garment.findFirst({ where: { id, userId } });
  if (!existing) return null;

  return prisma.garment.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category as GarmentCategory }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.recycledImageUrl !== undefined && { recycledImageUrl: data.recycledImageUrl }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.material !== undefined && { material: data.material }),
      ...(data.fit !== undefined && { fit: data.fit }),
      ...(data.pattern !== undefined && { pattern: data.pattern }),
      ...(data.size !== undefined && { size: data.size }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.careWash !== undefined && { careWash: data.careWash }),
      ...(data.careDry !== undefined && { careDry: data.careDry }),
      ...(data.note !== undefined && { note: data.note }),
      ...(data.purchasePriceVnd !== undefined && { purchasePriceVnd: data.purchasePriceVnd }),
      ...(data.wearCount !== undefined && { wearCount: data.wearCount }),
    },
  });
}

export async function deleteGarment(userId: string, id: string): Promise<boolean> {
  const result = await prisma.garment.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}

export async function incrementGarmentWearCount(userId: string, id: string): Promise<Garment | null> {
  const existing = await prisma.garment.findFirst({ where: { id, userId } });
  if (!existing) return null;
  const nextWearCount = (existing.wearCount ?? 0) + 1;
  return prisma.garment.update({
    where: { id },
    data: { wearCount: nextWearCount, lastWornAt: new Date() },
  });
}
