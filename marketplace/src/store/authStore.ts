import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '@/lib/api';
import type { User } from '@/types/database';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  display_name?: string;
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeUser(apiUser: Partial<User> & { id: string; email: string; role: User['role'] }): User {
  const now = new Date().toISOString();
  return {
    id: apiUser.id,
    email: apiUser.email,
    email_verified: apiUser.email_verified ?? false,
    password_hash: null,
    username: apiUser.username ?? null,
    display_name: apiUser.display_name ?? null,
    avatar_url: apiUser.avatar_url ?? null,
    bio: apiUser.bio ?? null,
    phone: apiUser.phone ?? null,
    phone_verified: apiUser.phone_verified ?? false,
    location_city: apiUser.location_city ?? null,
    location_state: apiUser.location_state ?? null,
    location_country: apiUser.location_country ?? 'Philippines',
    location_lat: apiUser.location_lat ?? null,
    location_lng: apiUser.location_lng ?? null,
    role: apiUser.role,
    is_active: apiUser.is_active ?? true,
    is_banned: apiUser.is_banned ?? false,
    ban_reason: apiUser.ban_reason ?? null,
    banned_at: apiUser.banned_at ?? null,
    id_verified: apiUser.id_verified ?? false,
    verified_at: apiUser.verified_at ?? null,
    subscription_tier: apiUser.subscription_tier ?? 'free',
    subscription_expires_at: apiUser.subscription_expires_at ?? null,
    listings_count: apiUser.listings_count ?? 0,
    sales_count: apiUser.sales_count ?? 0,
    rating_average: apiUser.rating_average ?? 0,
    rating_count: apiUser.rating_count ?? 0,
    followers_count: apiUser.followers_count ?? 0,
    following_count: apiUser.following_count ?? 0,
    google_id: apiUser.google_id ?? null,
    facebook_id: apiUser.facebook_id ?? null,
    last_login_at: apiUser.last_login_at ?? null,
    last_login_ip: apiUser.last_login_ip ?? null,
    failed_login_attempts: apiUser.failed_login_attempts ?? 0,
    locked_until: apiUser.locked_until ?? null,
    created_at: apiUser.created_at ?? now,
    updated_at: apiUser.updated_at ?? now,
  };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const result = await apiRequest<{
            success: boolean;
            token: string;
            user: { id: string; email: string; role: User['role'] };
          }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email: email.toLowerCase(), password }),
          });

          const me = await apiRequest<{ success: boolean; user: Partial<User> & { id: string; email: string; role: User['role'] } }>(
            '/auth/me',
            { token: result.token }
          );

          set({
            user: normalizeUser(me.user),
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          const result = await apiRequest<{
            success: boolean;
            token: string;
            user: { id: string; email: string; role: User['role'] };
          }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              email: data.email.toLowerCase(),
              password: data.password,
              username: data.username.toLowerCase(),
              displayName: data.display_name || data.username,
            }),
          });

          const me = await apiRequest<{ success: boolean; user: Partial<User> & { id: string; email: string; role: User['role'] } }>(
            '/auth/me',
            { token: result.token }
          );

          set({
            user: normalizeUser(me.user),
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
        }
      },

      logout: async () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false });
          return;
        }

        const payload = decodeJwtPayload(token);
        if (payload?.exp && payload.exp * 1000 < Date.now()) {
          set({ user: null, token: null, isAuthenticated: false });
          return;
        }

        set({ isLoading: true });
        try {
          const result = await apiRequest<{ success: boolean; user: Partial<User> & { id: string; email: string; role: User['role'] } }>(
            '/auth/me',
            { token }
          );
          set({ user: normalizeUser(result.user), isAuthenticated: true, isLoading: false });
        } catch {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateProfile: async (_data: Partial<User>) => {
        return { success: false, error: 'Profile update endpoint is not available yet in backend API' };
      },

      loginWithGoogle: async () => {
        console.warn('Google OAuth is not available in the local backend API');
      },

      resetPassword: async (_email: string) => {
        return { success: false, error: 'Password reset endpoint is not available yet in backend API' };
      },
    }),
    {
      name: 'marketplace-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
