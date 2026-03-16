import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { User } from '@/types/database';

type UpdateProfilePayload = Parameters<typeof api.updateMyProfile>[0];

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  completeGoogleLogin: (idToken: string, state?: string | null) => Promise<{ success: boolean; error?: string }>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  display_name?: string;
}

const GOOGLE_OAUTH_STATE_KEY = 'google_oauth_state';
const GOOGLE_OAUTH_NONCE_KEY = 'google_oauth_nonce';

function randomToken() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => {
        api.setToken(token);
        set({ token });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const result = await api.login(email, password);

          if (result.error) {
            set({ isLoading: false });
            return { success: false, error: result.error };
          }

          if (result.data) {
            set({
              user: result.data.user,
              token: result.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: 'An error occurred' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An error occurred. Please try again.' };
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          const result = await api.register(data.email, data.password, data.username, data.display_name);

          if (result.error) {
            set({ isLoading: false });
            return { success: false, error: result.error };
          }

          if (result.data) {
            set({
              user: result.data.user,
              token: result.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: 'An error occurred' };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An error occurred. Please try again.' };
        }
      },

      logout: async () => {
        await api.logout();
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) return;

        try {
          api.setToken(token);
          const result = await api.getMe();

          if (result.data) {
            set({ user: result.data.user, isAuthenticated: true });
          } else {
            set({ user: null, token: null, isAuthenticated: false });
          }
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      updateProfile: async (data: Partial<User>) => {
        const { token } = get();
        if (!token) return { success: false, error: 'Not authenticated' };

        try {
          api.setToken(token);
          const payload: UpdateProfilePayload = {};

          if (typeof data.display_name === 'string') payload.display_name = data.display_name;
          if (typeof data.bio === 'string') payload.bio = data.bio;
          if (typeof data.phone === 'string') payload.phone = data.phone;
          if (typeof data.location_city === 'string') payload.location_city = data.location_city;
          if (typeof data.location_state === 'string') payload.location_state = data.location_state;
          if (typeof data.location_country === 'string') payload.location_country = data.location_country;
          if (typeof data.location_lat === 'number') payload.location_lat = data.location_lat;
          if (typeof data.location_lng === 'number') payload.location_lng = data.location_lng;

          const result = await api.updateMyProfile(payload);

          if (result.error) {
            return { success: false, error: result.error };
          }

          if (result.data) {
            set({ user: result.data.user });
            return { success: true };
          }

          return { success: false, error: 'An error occurred' };
        } catch {
          return { success: false, error: 'An error occurred' };
        }
      },

      resetPassword: async (email: string) => {
        try {
          const result = await api.resetPassword(email);

          if (result.error) {
            return { success: false, error: result.error };
          }

          return { success: true };
        } catch {
          return { success: false, error: 'An error occurred' };
        }
      },

      loginWithGoogle: async () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

        if (!clientId) {
          toast.error('Missing VITE_GOOGLE_CLIENT_ID. Configure it in marketplace/.env.');
          return;
        }

        const state = randomToken();
        const nonce = randomToken();

        sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);
        sessionStorage.setItem(GOOGLE_OAUTH_NONCE_KEY, nonce);

        const redirectUri = `${window.location.origin}/auth/google/callback`;
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: 'id_token',
          scope: 'openid email profile',
          prompt: 'select_account',
          nonce,
          state,
        });

        window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
      },

      completeGoogleLogin: async (idToken: string, state?: string | null) => {
        const expectedState = sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY);

        sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
        sessionStorage.removeItem(GOOGLE_OAUTH_NONCE_KEY);

        if (expectedState && state && expectedState !== state) {
          return { success: false, error: 'Google login state mismatch. Please try again.' };
        }

        set({ isLoading: true });
        try {
          const result = await api.googleLogin(idToken);

          if (result.error) {
            set({ isLoading: false });
            return { success: false, error: result.error };
          }

          if (result.data) {
            set({
              user: result.data.user,
              token: result.data.token,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return { success: false, error: 'Google login failed' };
        } catch {
          set({ isLoading: false });
          return { success: false, error: 'Google login failed' };
        }
      },
    }),
    {
      name: 'marketplace-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Set token in API client when rehydrating
        if (state?.token) {
          api.setToken(state.token);
        }
      },
    }
  )
);

export default useAuthStore;
