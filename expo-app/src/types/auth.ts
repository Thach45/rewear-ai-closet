/** User payload từ API (không có passwordHash) */
export type AuthUser = {
  id: string;
  email: string;
  name: string;
  personImageUrl: string | null;
  heightCm: number | null;
  weightKg: number | null;
  reuseCount: number;
  co2KgSaved: number;
  createdAt: string;
  updatedAt: string;
};

export type AuthSession = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};
