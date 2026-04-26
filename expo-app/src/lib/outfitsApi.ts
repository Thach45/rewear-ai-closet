import { apiFetchAuth } from '@/lib/api';
import type { Garment } from '@/types/garment';

type ApiErrorBody = { error?: string; code?: string };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export type SuggestAiOutfitResponse = {
  outfit: {
    top: Garment;
    bottom: Garment;
    shoes: Garment;
  } | null;
  reason: string;
  missing?: string[];
  model?: string;
  usedFallback?: boolean;
};

export async function suggestAiOutfit(input: {
  vibe: string;
  occasion: string;
}): Promise<SuggestAiOutfitResponse> {
  const res = await apiFetchAuth('/outfits/suggest-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson<SuggestAiOutfitResponse & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Suggest AI outfit failed (${res.status})`);
  }
  return data;
}

export type SavedOutfit = {
  id: string;
  vibe: string;
  occasion?: string | null;
  reason?: string | null;
  createdAt: string;
  tryOnImageUrl?: string | null;
  garments: Array<{
    id: string;
    category: Garment['category'];
    name: string;
    imageUrl: string;
    recycledImageUrl: string;
    brand: string;
  }>;
};

export type WearLog = {
  id: string;
  vibe?: string | null;
  occasion?: string | null;
  wornAt: string;
  createdAt: string;
  garments: Array<{
    id: string;
    category: Garment['category'];
    name: string;
    imageUrl: string;
    recycledImageUrl: string;
    brand: string;
  }>;
};

export async function saveAiOutfit(input: {
  vibe: string;
  occasion: string;
  reason?: string;
  topId: string;
  bottomId: string;
  shoesId: string;
}): Promise<SavedOutfit> {
  const res = await apiFetchAuth('/outfits/save-ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ outfit: SavedOutfit } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Save AI outfit failed (${res.status})`);
  }
  return data.outfit;
}

export async function fetchSavedOutfits(): Promise<SavedOutfit[]> {
  const res = await apiFetchAuth('/outfits/mine', { method: 'GET' });
  const data = await parseJson<{ outfits: SavedOutfit[] } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Load saved outfits failed (${res.status})`);
  }
  return data.outfits;
}

export async function deleteSavedOutfit(outfitId: string): Promise<void> {
  const res = await apiFetchAuth(`/outfits/${outfitId}`, { method: 'DELETE' });
  const data = await parseJson<ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Delete saved outfit failed (${res.status})`);
  }
}

export async function tryOnSavedOutfit(input: {
  outfitId: string;
  personImageUrl?: string;
}): Promise<{ outfit: SavedOutfit; usedCache: boolean }> {
  const res = await apiFetchAuth(`/outfits/${input.outfitId}/try-on`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personImageUrl: input.personImageUrl,
    }),
  });
  const data = await parseJson<{ outfit: SavedOutfit; usedCache: boolean } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Try-on failed (${res.status})`);
  }
  return data;
}

export async function createWearLog(input: {
  topId: string;
  bottomId: string;
  shoesId: string;
  vibe?: string;
  occasion?: string;
}): Promise<WearLog> {
  const res = await apiFetchAuth('/outfits/wear-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ wearLog: WearLog } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Create wear log failed (${res.status})`);
  }
  return data.wearLog;
}

export async function fetchWearLogs(): Promise<WearLog[]> {
  const res = await apiFetchAuth('/outfits/wear-logs', { method: 'GET' });
  const data = await parseJson<{ logs: WearLog[] } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Load wear logs failed (${res.status})`);
  }
  return data.logs;
}
