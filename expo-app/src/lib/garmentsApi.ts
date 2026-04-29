import { authStorage } from '@/lib/authStorage';
import {
  apiFetchAuth,
  getApiBaseUrl,
  refreshSessionTokens,
  type AvatarUploadFile,
} from '@/lib/api';
import type { CreateGarmentBody, Garment, UpdateGarmentBody } from '@/types/garment';

type ApiErrorBody = { error?: string; code?: string };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function fetchGarments(params?: {
  category?: Garment['category'];
}): Promise<Garment[]> {
  const search = new URLSearchParams();
  if (params?.category) search.set('category', params.category);
  const q = search.toString();
  const path = q ? `/garments?${q}` : '/garments';
  const res = await apiFetchAuth(path, { method: 'GET' });
  const data = await parseJson<{ garments: Garment[] } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `List garments failed (${res.status})`);
  }
  return data.garments;
}

export async function fetchGarmentById(id: string): Promise<Garment> {
  const res = await apiFetchAuth(`/garments/${id}`, { method: 'GET' });
  const data = await parseJson<{ garment: Garment } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Get garment failed (${res.status})`);
  }
  return data.garment;
}

export async function createGarment(body: CreateGarmentBody): Promise<Garment> {
  const res = await apiFetchAuth('/garments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ garment: Garment } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Create garment failed (${res.status})`);
  }
  return data.garment;
}

export async function updateGarment(id: string, body: UpdateGarmentBody): Promise<Garment> {
  const res = await apiFetchAuth(`/garments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ garment: Garment } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Update garment failed (${res.status})`);
  }
  return data.garment;
}

export async function deleteGarment(id: string): Promise<void> {
  const res = await apiFetchAuth(`/garments/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) {
    const data = await parseJson<ApiErrorBody>(res);
    throw new Error(data.error ?? `Delete garment failed (${res.status})`);
  }
}

export async function markGarmentWorn(id: string): Promise<Garment> {
  const res = await apiFetchAuth(`/garments/${id}/wear`, { method: 'POST' });
  const data = await parseJson<{ garment: Garment } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Mark garment worn failed (${res.status})`);
  }
  return data.garment;
}

/** Upload một ảnh lên backend; trả về URL ảnh đã xoá nền */
export async function postGarmentMedia(file: AvatarUploadFile): Promise<string> {
  const base = getApiBaseUrl();
  const url = `${base}/garments/media`;

  const upload = (token: string) => {
    const fd = new FormData();
    fd.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
    return fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
  };

  let access = await authStorage.getAccessToken();
  if (!access) {
    throw new Error('Not authenticated');
  }
  let res = await upload(access);
  if (res.status === 401) {
    const refreshed = await refreshSessionTokens();
    if (!refreshed) {
      throw new Error('Unauthorized');
    }
    res = await upload(refreshed.accessToken);
  }
  const data = await parseJson<{ noBgUrl: string } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Upload garment media failed (${res.status})`);
  }
  return data.noBgUrl;
}

export type GarmentAnalysisResponse = {
  name: string;
  category: string;
  color: string;
  brand: string;
  material: string;
  pattern: string;
  fit: string;
  size: string;
  careWash: string;
  careDry: string;
};

export async function analyzeGarmentMedia(imageUrl: string): Promise<GarmentAnalysisResponse> {
  const res = await apiFetchAuth('/garments/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
  const data = await parseJson<{ analysis: GarmentAnalysisResponse } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Analyze garment media failed (${res.status})`);
  }
  return data.analysis;
}
