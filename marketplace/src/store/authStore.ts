import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';
import type { User } from '@/types/database';

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
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

interface RegisterData {
  email: string;
  password: string;
  username: string;
  display_name?: string;
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
          const result = await api.updateMyProfile(data);

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
