import * as SplashScreen from 'expo-splash-screen';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  fetchAuthMe,
  getAuthMe,
  patchUserProfile,
  postAuthLogin,
  postAuthLogout,
  postAuthRegister,
  postUserAvatar,
  refreshSessionTokens,
  type AvatarUploadFile,
  type PatchUserProfileBody,
} from '@/lib/api';
import { authStorage } from '@/lib/authStorage';
import { fetchGarments } from '@/lib/garmentsApi';
import {
  buildForgottenGarmentReminderContent,
  ensureDailyForgottenGarmentReminder,
} from '@/lib/notifications';
import type { AuthUser } from '@/types/auth';

type AuthContextValue = {
  user: AuthUser | null;
  /** true trong lần đọc SecureStore + /me lúc mở app */
  isHydrating: boolean;
  /** Đã hoàn tất onboarding (avatar) — Root hiển thị Main */
  isLoggedIn: boolean;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ needsOnboarding: boolean }>;
  signUp: (input: { email: string; password: string; name: string }) => Promise<{ needsOnboarding: boolean }>;
  refreshSession: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  updateProfile: (body: PatchUserProfileBody) => Promise<void>;
  uploadAvatar: (file: AvatarUploadFile) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (!cancelled) setIsHydrating(false);
    };

    (async () => {
      try {
        const onboardingDone = await authStorage.getOnboardingDone();
        if (cancelled) return;
        if (onboardingDone) setIsLoggedIn(true);

        let access = await authStorage.getAccessToken();
        const refresh = await authStorage.getRefreshToken();

        if (!access && refresh) {
          const session = await refreshSessionTokens();
          if (cancelled) return;
          if (session) {
            access = session.accessToken;
            setUser(session.user);
          }
        }

        if (!access) return;

        try {
          const u = await getAuthMe(access);
          if (cancelled) return;
          setUser(u);
        } catch {
          const session = await refreshSessionTokens();
          if (cancelled) return;
          if (session) {
            setUser(session.user);
          } else {
            await authStorage.clearSession();
            setUser(null);
          }
        }
      } finally {
        finish();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrating) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isHydrating]);

  useEffect(() => {
    if (!isLoggedIn || !user) return;
    (async () => {
      try {
        const garments = await fetchGarments();
        const reminderContent = buildForgottenGarmentReminderContent(garments);
        await ensureDailyForgottenGarmentReminder(reminderContent);
      } catch (err) {
        console.log('[notifications] Reminder content fallback', err);
        ensureDailyForgottenGarmentReminder().catch((innerErr) => {
          console.log('[notifications] Daily reminder setup failed', innerErr);
        });
      }
    })();
  }, [isLoggedIn, user]);

  const completeOnboarding = useCallback(async () => {
    await authStorage.setOnboardingDone();
    setIsLoggedIn(true);
  }, []);

  const signOut = useCallback(async () => {
    const rt = await authStorage.getRefreshToken();
    if (rt) await postAuthLogout(rt);
    await authStorage.clearAll();
    setUser(null);
    setIsLoggedIn(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const session = await postAuthLogin({ email, password });
    await authStorage.setAccessToken(session.accessToken);
    await authStorage.setRefreshToken(session.refreshToken);
    setUser(session.user);
    const onboardingDone = await authStorage.getOnboardingDone();
    const isReady = onboardingDone || Boolean(session.user.personImageUrl);
    if (isReady) {
      if (!onboardingDone) {
        await authStorage.setOnboardingDone();
      }
      setIsLoggedIn(true);
    }
    return { needsOnboarding: !isReady };
  }, []);

  const signUp = useCallback(async (input: { email: string; password: string; name: string }) => {
    const session = await postAuthRegister(input);
    await authStorage.setAccessToken(session.accessToken);
    await authStorage.setRefreshToken(session.refreshToken);
    setUser(session.user);
    return { needsOnboarding: true };
  }, []);

  const refreshSession = useCallback(async () => {
    const session = await refreshSessionTokens();
    if (session) {
      setUser(session.user);
      return true;
    }
    await authStorage.clearSession();
    setUser(null);
    return false;
  }, []);

  const refreshUser = useCallback(async () => {
    const u = await fetchAuthMe();
    setUser(u);
  }, []);

  const updateProfile = useCallback(async (body: PatchUserProfileBody) => {
    const u = await patchUserProfile(body);
    setUser(u);
  }, []);

  const uploadAvatar = useCallback(async (file: AvatarUploadFile) => {
    const u = await postUserAvatar(file);
    setUser(u);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isHydrating,
      isLoggedIn,
      completeOnboarding,
      signOut,
      signIn,
      signUp,
      refreshSession,
      refreshUser,
      updateProfile,
      uploadAvatar,
    }),
    [
      user,
      isHydrating,
      isLoggedIn,
      completeOnboarding,
      signOut,
      signIn,
      signUp,
      refreshSession,
      refreshUser,
      updateProfile,
      uploadAvatar,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
