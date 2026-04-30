import crypto from 'node:crypto';
import { GarmentCategory, OutfitItemRole, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { toOccasionNullable, toOutfitVibe } from '../lib/outfit-context-map.js';
import type { CreateWearLogBodyDto, SaveAiOutfitBodyDto } from '../dto/outfit.dto.js';
import type { TryOnOutfitBodyDto } from '../dto/outfit.dto.js';
import { generateTryOnImage } from './google-vton.service.js';

const garmentSummarySelect = {
  id: true,
  category: true,
  subCategory: true,
  name: true,
  imageUrl: true,
  brand: true,
} satisfies Prisma.GarmentSelect;

type GarmentSummary = Prisma.GarmentGetPayload<{ select: typeof garmentSummarySelect }>;

/** Mobile client từng dùng recycledImageUrl + brand bắt buộc — giữ tương thích */
type GarmentSummaryCompat = GarmentSummary & { recycledImageUrl: string; brand: string };

const outfitDetailInclude = {
  items: {
    orderBy: { order: 'asc' as const },
    include: {
      garment: { select: garmentSummarySelect },
    },
  },
} satisfies Prisma.OutfitInclude;

type OutfitRow = Prisma.OutfitGetPayload<{ include: typeof outfitDetailInclude }>;

export type OutfitWithGarments = OutfitRow & {
  /** @deprecated Derive from `items` + role; kept for API compatibility */
  garments: GarmentSummaryCompat[];
};

const wearLogInclude = {
  items: {
    orderBy: { order: 'asc' as const },
    include: {
      garment: { select: garmentSummarySelect },
    },
  },
  outfit: {
    select: { id: true, vibe: true, occasion: true },
  },
} satisfies Prisma.WearLogInclude;

type WearLogRow = Prisma.WearLogGetPayload<{ include: typeof wearLogInclude }>;

export type WearLogWithGarments = WearLogRow & {
  /** @deprecated Derive from `items`; kept for API compatibility */
  garments: GarmentSummaryCompat[];
};

function toCompatGarmentSummary(g: GarmentSummary): GarmentSummaryCompat {
  return {
    ...g,
    recycledImageUrl: g.imageUrl,
    brand: g.brand ?? '—',
  };
}

function toGarmentListFromJoinItems(
  items: Array<{ order: number; garment: GarmentSummary }>
): GarmentSummaryCompat[] {
  return [...items]
    .sort((a, b) => a.order - b.order)
    .map((i) => toCompatGarmentSummary(i.garment));
}

function toOutfitApi(outfit: OutfitRow): OutfitWithGarments {
  const publicTryOnImageUrl = outfit.tryOnImageUrl?.split('#p=')[0] ?? null;
  return {
    ...outfit,
    tryOnImageUrl: publicTryOnImageUrl,
    garments: toGarmentListFromJoinItems(outfit.items),
  };
}

function toWearLogApi(log: WearLogRow): WearLogWithGarments {
  return {
    ...log,
    garments: toGarmentListFromJoinItems(log.items),
  };
}

type OutfitCompositionInput = {
  topId?: string | undefined;
  bottomId?: string | undefined;
  shoesId?: string | undefined;
  onePieceId?: string | undefined;
  outerIds?: string[] | undefined;
  accessoryIds?: string[] | undefined;
};

async function buildOutfitItemCreates(
  userId: string,
  input: OutfitCompositionInput
): Promise<Array<{ garmentId: string; role: OutfitItemRole; order: number }> | null> {
  const ids = new Set<string>();
  if (input.topId) ids.add(input.topId);
  if (input.bottomId) ids.add(input.bottomId);
  if (input.shoesId) ids.add(input.shoesId);
  if (input.onePieceId) ids.add(input.onePieceId);
  for (const id of input.outerIds ?? []) ids.add(id);
  for (const id of input.accessoryIds ?? []) ids.add(id);
  if (ids.size === 0) return null;

  const garments = await prisma.garment.findMany({
    where: { userId, id: { in: [...ids] } },
  });
  const byId = new Map(garments.map((g) => [g.id, g]));

  const need = (id: string | undefined, category: GarmentCategory) => {
    if (!id) return null;
    const g = byId.get(id);
    if (!g || g.category !== category) return null;
    return g;
  };

  const out: Array<{ garmentId: string; role: OutfitItemRole; order: number }> = [];
  let order = 0;

  if (input.onePieceId) {
    const op = need(input.onePieceId, GarmentCategory.onepiece);
    if (!op) return null;
    out.push({ garmentId: op.id, role: OutfitItemRole.onepiece, order: order++ });
    if (input.shoesId) {
      const sh = need(input.shoesId, GarmentCategory.shoes);
      if (!sh) return null;
      out.push({ garmentId: sh.id, role: OutfitItemRole.shoes, order: order++ });
    }
  } else {
    const top = need(input.topId, GarmentCategory.top);
    const bottom = need(input.bottomId, GarmentCategory.bottom);
    const shoes = need(input.shoesId, GarmentCategory.shoes);
    if (!top || !bottom || !shoes) return null;
    out.push(
      { garmentId: top.id, role: OutfitItemRole.top, order: order++ },
      { garmentId: bottom.id, role: OutfitItemRole.bottom, order: order++ },
      { garmentId: shoes.id, role: OutfitItemRole.shoes, order: order++ }
    );
  }

  for (const oid of input.outerIds ?? []) {
    const g = need(oid, GarmentCategory.outer);
    if (!g) return null;
    out.push({ garmentId: g.id, role: OutfitItemRole.outer, order: order++ });
  }
  for (const aid of input.accessoryIds ?? []) {
    const g = need(aid, GarmentCategory.accessory);
    if (!g) return null;
    out.push({ garmentId: g.id, role: OutfitItemRole.accessory, order: order++ });
  }

  return out;
}

function assertOutfitTryOnReady(items: Array<{ role: OutfitItemRole }>): void {
  const roles = new Set(items.map((i) => i.role));
  if (roles.has(OutfitItemRole.onepiece)) {
    if (roles.has(OutfitItemRole.top) || roles.has(OutfitItemRole.bottom)) {
      throw new Error('OUTFIT_MISSING_REQUIRED_ITEMS');
    }
    return;
  }
  if (
    !roles.has(OutfitItemRole.top) ||
    !roles.has(OutfitItemRole.bottom) ||
    !roles.has(OutfitItemRole.shoes)
  ) {
    throw new Error('OUTFIT_MISSING_REQUIRED_ITEMS');
  }
}

function resolveTryOnGarmentImageUrl(
  items: Array<{ role: OutfitItemRole; garment: { imageUrl: string } }>
): string {
  const onepiece = items.find((i) => i.role === OutfitItemRole.onepiece);
  if (onepiece) return onepiece.garment.imageUrl;
  const top = items.find((i) => i.role === OutfitItemRole.top);
  if (!top) throw new Error('OUTFIT_MISSING_REQUIRED_ITEMS');
  return top.garment.imageUrl;
}

function itemsSignature(
  items: Array<{ role: OutfitItemRole; garmentId: string }>
): string {
  return [...items]
    .map((i) => ({ role: i.role, garmentId: i.garmentId }))
    .sort(
      (a, b) => a.role.localeCompare(b.role) || a.garmentId.localeCompare(b.garmentId)
    )
    .map((i) => `${i.role}:${i.garmentId}`)
    .join('|');
}

function personImageSignature(personImageUrl: string): string {
  return crypto.createHash('sha256').update(personImageUrl, 'utf8').digest('hex');
}

export async function saveAiOutfit(
  userId: string,
  input: SaveAiOutfitBodyDto
): Promise<OutfitWithGarments | null> {
  const creates = await buildOutfitItemCreates(userId, input);
  if (!creates) return null;

  const outfit = await prisma.outfit.create({
    data: {
      userId,
      vibe: toOutfitVibe(input.vibe),
      occasion: toOccasionNullable(input.occasion),
      reason: input.reason ?? null,
      isFavorite: true,
      tryOnImageUrl: null,
      items: {
        create: creates,
      },
    },
    include: outfitDetailInclude,
  });

  return toOutfitApi(outfit);
}

export async function listSavedOutfits(userId: string): Promise<OutfitWithGarments[]> {
  const rows = await prisma.outfit.findMany({
    where: { userId, isFavorite: true },
    orderBy: { createdAt: 'desc' },
    include: outfitDetailInclude,
  });
  return rows.map(toOutfitApi);
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

export async function tryOnSavedOutfit(
  userId: string,
  outfitId: string,
  input: TryOnOutfitBodyDto
): Promise<{ outfit: OutfitWithGarments; usedCache: boolean }> {
  const outfit = await prisma.outfit.findFirst({
    where: { id: outfitId, userId, isFavorite: true },
    include: outfitDetailInclude,
  });

  if (!outfit) {
    throw new Error('OUTFIT_NOT_FOUND');
  }

  assertOutfitTryOnReady(outfit.items);

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

  const garmentImageUrl = resolveTryOnGarmentImageUrl(outfit.items);

  const targetSig = itemsSignature(
    outfit.items.map((i) => ({ role: i.role, garmentId: i.garmentId }))
  );
  const targetPersonSig = personImageSignature(personImageUrl);

  const cachedOutfits = await prisma.outfit.findMany({
    where: {
      userId,
      isFavorite: true,
      tryOnImageUrl: { not: null },
    },
    select: {
      id: true,
      tryOnImageUrl: true,
      updatedAt: true,
      items: {
        select: { role: true, garmentId: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 40,
  });

  const cacheHit = cachedOutfits.find((item) => {
    if (!item.tryOnImageUrl) return false;
    const [storedSig, storedPersonSig] = item.tryOnImageUrl.split('#p=');
    if (!storedSig || !storedPersonSig) return false;
    return storedSig === targetSig && storedPersonSig === targetPersonSig;
  });

  const generatedTryOnImageUrl = cacheHit?.tryOnImageUrl
    ? cacheHit.tryOnImageUrl.split('#p=')[0]!
    : (
        await generateTryOnImage({
          userId,
          personImageUrl,
          garmentImageUrl,
        })
      ).outputImageUrl;
  const tryOnImageUrl = `${generatedTryOnImageUrl}#p=${targetPersonSig}`;

  const updated = await prisma.outfit.update({
    where: { id: outfitId },
    data: { tryOnImageUrl },
    include: outfitDetailInclude,
  });

  return {
    outfit: {
      ...toOutfitApi(updated),
      tryOnImageUrl: generatedTryOnImageUrl,
    },
    usedCache: Boolean(cacheHit),
  };
}

export async function createWearLog(
  userId: string,
  input: CreateWearLogBodyDto
): Promise<WearLogWithGarments | null> {
  if (input.outfitId) {
    const outfit = await prisma.outfit.findFirst({
      where: { id: input.outfitId, userId },
      include: {
        items: {
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!outfit || outfit.items.length === 0) return null;

    const wornAt = input.wornAt ?? new Date();
    const garmentIds = outfit.items.map((it) => it.garmentId);
    const log = await prisma.$transaction(async (tx) => {
      const created = await tx.wearLog.create({
        data: {
          userId,
          outfitId: outfit.id,
          ...(input.vibe !== undefined && { vibe: toOutfitVibe(input.vibe) }),
          ...(input.occasion !== undefined && {
            occasion: toOccasionNullable(input.occasion),
          }),
          wornAt,
          items: {
            create: outfit.items.map((it) => ({
              garmentId: it.garmentId,
              role: it.role,
              order: it.order,
            })),
          },
        },
        include: wearLogInclude,
      });
      await tx.garment.updateMany({
        where: { userId, id: { in: garmentIds } },
        data: {
          wearCount: { increment: 1 },
          lastWornAt: wornAt,
        },
      });
      return created;
    });

    return toWearLogApi(log);
  }

  const creates = await buildOutfitItemCreates(userId, input);
  if (!creates) return null;
  const wornAt = input.wornAt ?? new Date();
  const garmentIds = creates.map((it) => it.garmentId);

  const log = await prisma.$transaction(async (tx) => {
    const created = await tx.wearLog.create({
      data: {
        userId,
        ...(input.vibe !== undefined && { vibe: toOutfitVibe(input.vibe) }),
        ...(input.occasion !== undefined && {
          occasion: toOccasionNullable(input.occasion),
        }),
        wornAt,
        items: { create: creates },
      },
      include: wearLogInclude,
    });
    await tx.garment.updateMany({
      where: { userId, id: { in: garmentIds } },
      data: {
        wearCount: { increment: 1 },
        lastWornAt: wornAt,
      },
    });
    return created;
  });

  return toWearLogApi(log);
}

export async function listWearLogs(userId: string): Promise<WearLogWithGarments[]> {
  const logs = await prisma.wearLog.findMany({
    where: { userId },
    orderBy: { wornAt: 'desc' },
    take: 200,
    include: wearLogInclude,
  });
  return logs.map(toWearLogApi);
}
