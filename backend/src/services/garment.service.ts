import type { Garment, GarmentCategory, GarmentSubCategory } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { isSubCategoryAllowedForCategory } from '../domain/garment-taxonomy.js';
import type {
  CreateGarmentBodyDto,
  ListGarmentQueryDto,
  UpdateGarmentBodyDto,
} from '../dto/garment.dto.js';

export async function listGarments(
  userId: string,
  query: ListGarmentQueryDto
): Promise<Garment[]> {
  const where: {
    userId: string;
    category?: GarmentCategory;
    subCategory?: GarmentSubCategory | null;
  } = {
    userId,
  };
  if (query.category !== undefined) {
    where.category = query.category;
  }
  if (query.subCategory !== undefined) {
    where.subCategory = query.subCategory;
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
      category: data.category,
      subCategory: data.subCategory ?? undefined,
      imageUrl: data.imageUrl,
      brand: data.brand ?? null,
      material: data.material ?? null,
      fit: data.fit ?? null,
      pattern: data.pattern ?? null,
      size: data.size ?? null,
      color: data.color ?? null,
      note: data.note ?? undefined,
      purchasePriceVnd: data.purchasePriceVnd ?? null,
      wearCount: data.wearCount ?? 0,
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

  const nextCategory = data.category ?? existing.category;
  const nextSubCategory: GarmentSubCategory | null | undefined =
    data.subCategory !== undefined ? data.subCategory : existing.subCategory;
  if (
    nextSubCategory != null &&
    !isSubCategoryAllowedForCategory(nextCategory, nextSubCategory)
  ) {
    throw new Error('INVALID_GARMENT_TAXONOMY');
  }

  return prisma.garment.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.subCategory !== undefined && { subCategory: data.subCategory }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      ...(data.brand !== undefined && { brand: data.brand ?? null }),
      ...(data.material !== undefined && { material: data.material ?? null }),
      ...(data.fit !== undefined && { fit: data.fit }),
      ...(data.pattern !== undefined && { pattern: data.pattern }),
      ...(data.size !== undefined && { size: data.size ?? null }),
      ...(data.color !== undefined && { color: data.color ?? null }),
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
  const existing = await prisma.garment.findFirst({ where: { id, userId }, select: { id: true } });
  if (!existing) return null;
  return prisma.garment.update({
    where: { id },
    data: { wearCount: { increment: 1 }, lastWornAt: new Date() },
  });
}
