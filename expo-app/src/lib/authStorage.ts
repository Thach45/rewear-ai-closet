import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'rewear_access_token';
const REFRESH_KEY = 'rewear_refresh_token';
const ONBOARDING_KEY = 'rewear_onboarding_done';

async function safeDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // ignore missing key
  }
}

export const authStorage = {
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_KEY),
  setAccessToken: (token: string) => SecureStore.setItemAsync(ACCESS_KEY, token),

  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_KEY),
  setRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_KEY, token),

  getOnboardingDone: async (): Promise<boolean> => {
    const v = await SecureStore.getItemAsync(ONBOARDING_KEY);
    return v === '1';
  },
  setOnboardingDone: () => SecureStore.setItemAsync(ONBOARDING_KEY, '1'),
  clearOnboardingDone: () => safeDelete(ONBOARDING_KEY),

  async clearSession(): Promise<void> {
    await safeDelete(ACCESS_KEY);
    await safeDelete(REFRESH_KEY);
  },

  async clearAll(): Promise<void> {
    await this.clearSession();
    await this.clearOnboardingDone();
  },
};
