import Constants from 'expo-constants';

import type { AuthSession, AuthUser } from '@/types/auth';
import { authStorage } from '@/lib/authStorage';

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromExtra = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  const base = (fromEnv ?? fromExtra ?? 'https://rewear-ai-closet.onrender.com').trim();
  return base.replace(/\/$/, '');
}

type ApiErrorBody = { error?: string; code?: string };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function postAuthRegister(body: {
  email: string;
  password: string;
  name: string;
}): Promise<AuthSession> {
  const res = await fetch(`${getApiBaseUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJson<AuthSession & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Register failed (${res.status})`);
  }
  return data as AuthSession;
}

export async function postAuthLogin(body: { email: string; password: string }): Promise<AuthSession> {
  const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJson<AuthSession & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Login failed (${res.status})`);
  }
  return data as AuthSession;
}

export async function postAuthRefresh(refreshToken: string): Promise<AuthSession> {
  const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await parseJson<AuthSession & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Refresh failed (${res.status})`);
  }
  return data as AuthSession;
}

export async function postAuthLogout(refreshToken: string): Promise<void> {
  try {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // best-effort
  }
}

export async function getAuthMe(accessToken: string): Promise<AuthUser> {
  const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await parseJson<{ user: AuthUser } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Me failed (${res.status})`);
  }
  return data.user;
}

let refreshInFlight: Promise<AuthSession | null> | null = null;

/** Làm mới refresh token (một flight dùng chung); trả null nếu không có refresh hoặc API lỗi. */
export async function refreshSessionTokens(): Promise<AuthSession | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const rt = await authStorage.getRefreshToken();
      if (!rt) return null;
      try {
        const session = await postAuthRefresh(rt);
        await authStorage.setAccessToken(session.accessToken);
        await authStorage.setRefreshToken(session.refreshToken);
        return session;
      } catch {
        return null;
      }
    })();
  }
  const flight = refreshInFlight;
  const result = await flight;
  if (refreshInFlight === flight) {
    refreshInFlight = null;
  }
  return result;
}

/**
 * Gọi API có Bearer; nếu 401 thì thử refresh một lần rồi gọi lại.
 */
export async function apiFetchAuth(path: string, init: RequestInit = {}): Promise<Response> {
  const base = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = new Headers(init.headers ?? {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  const access = await authStorage.getAccessToken();
  if (access) headers.set('Authorization', `Bearer ${access}`);

  let res = await fetch(url, { ...init, headers });

  if (res.status === 401) {
    const refreshed = await refreshSessionTokens();
    if (refreshed) {
      const h2 = new Headers(init.headers ?? {});
      if (!h2.has('Accept')) h2.set('Accept', 'application/json');
      h2.set('Authorization', `Bearer ${refreshed.accessToken}`);
      res = await fetch(url, { ...init, headers: h2 });
    }
  }

  return res;
}

/** GET /auth/me với token trong SecureStore + refresh 401 */
export async function fetchAuthMe(): Promise<AuthUser> {
  const res = await apiFetchAuth('/auth/me', { method: 'GET' });
  const data = await parseJson<{ user: AuthUser } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Me failed (${res.status})`);
  }
  return data.user;
}

export type PatchUserProfileBody = {
  name?: string;
  heightCm?: number | null;
  weightKg?: number | null;
  personImageUrl?: string | null;
  gender?: string | null;
  bodyShape?: string | null;
  skinTone?: string | null;
  ageGroup?: string | null;
  stylePreference?: string[];
};

export async function patchUserProfile(body: PatchUserProfileBody): Promise<AuthUser> {
  const res = await apiFetchAuth('/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await parseJson<{ user: AuthUser } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Update profile failed (${res.status})`);
  }
  return data.user;
}

/** React Native: append file descriptor; tạo FormData mới mỗi lần gửi (retry sau 401) */
export type AvatarUploadFile = { uri: string; name: string; type: string };

export async function postUserAvatar(file: AvatarUploadFile): Promise<AuthUser> {
  const base = getApiBaseUrl();
  const url = `${base}/users/me/avatar`;

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
  const data = await parseJson<{ user: AuthUser } & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(data.error ?? `Upload avatar failed (${res.status})`);
  }
  return data.user;
}
