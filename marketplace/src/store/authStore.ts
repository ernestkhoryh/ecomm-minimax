import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types/database';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  import.meta.env.VITE_JWT_SECRET || 'default-secret-change-me'
);

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

// Helper to generate JWT
const generateToken = async (userId: string): Promise<string> => {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
};

// Helper to verify JWT
export const verifyToken = async (token: string): Promise<{ userId: string } | null> => {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
};

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
          // Get user by email
          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email.toLowerCase())
            .single();

          if (error || !user) {
            set({ isLoading: false });
            return { success: false, error: 'Invalid email or password' };
          }

          // Check if user is banned
          if (user.is_banned) {
            set({ isLoading: false });
            return { success: false, error: 'Your account has been suspended' };
          }

          // Check if account is locked
          if (user.locked_until && new Date(user.locked_until) > new Date()) {
            set({ isLoading: false });
            return { success: false, error: 'Account is temporarily locked. Please try again later.' };
          }

          // Verify password
          if (!user.password_hash) {
            set({ isLoading: false });
            return { success: false, error: 'Please login with Google' };
          }

          const isValid = await bcrypt.compare(password, user.password_hash);
          if (!isValid) {
            // Increment failed attempts
            await supabase
              .from('users')
              .update({
                failed_login_attempts: user.failed_login_attempts + 1,
                locked_until: user.failed_login_attempts >= 4
                  ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
                  : null,
              })
              .eq('id', user.id);

            set({ isLoading: false });
            return { success: false, error: 'Invalid email or password' };
          }

          // Reset failed attempts and update last login
          await supabase
            .from('users')
            .update({
              failed_login_attempts: 0,
              locked_until: null,
              last_login_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          // Generate JWT token
          const token = await generateToken(user.id);

          // Remove password_hash from user object
          const { password_hash: _, ...safeUser } = user;

          set({
            user: safeUser as User,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An error occurred. Please try again.' };
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true });
        try {
          // Check if email already exists
          const { data: existingEmail } = await supabase
            .from('users')
            .select('id')
            .eq('email', data.email.toLowerCase())
            .single();

          if (existingEmail) {
            set({ isLoading: false });
            return { success: false, error: 'Email already registered' };
          }

          // Check if username already exists
          const { data: existingUsername } = await supabase
            .from('users')
            .select('id')
            .eq('username', data.username.toLowerCase())
            .single();

          if (existingUsername) {
            set({ isLoading: false });
            return { success: false, error: 'Username already taken' };
          }

          // Hash password
          const salt = await bcrypt.genSalt(12);
          const password_hash = await bcrypt.hash(data.password, salt);

          // Create user
          const { data: user, error } = await supabase
            .from('users')
            .insert({
              email: data.email.toLowerCase(),
              password_hash,
              username: data.username.toLowerCase(),
              display_name: data.display_name || data.username,
              role: 'user',
              is_active: true,
              email_verified: false,
            })
            .select()
            .single();

          if (error) {
            set({ isLoading: false });
            return { success: false, error: 'Failed to create account' };
          }

          // Generate JWT token
          const token = await generateToken(user.id);

          // Remove password_hash from user object
          const { password_hash: _, ...safeUser } = user;

          set({
            user: safeUser as User,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: 'An error occurred. Please try again.' };
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
        if (!token) return;

        try {
          const payload = await verifyToken(token);
          if (!payload) {
            set({ user: null, token: null, isAuthenticated: false });
            return;
          }

          const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', payload.userId)
            .single();

          if (error || !user) {
            set({ user: null, token: null, isAuthenticated: false });
            return;
          }

          const { password_hash: _, ...safeUser } = user;
          set({ user: safeUser as User, isAuthenticated: true });
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      updateProfile: async (data: Partial<User>) => {
        const { user } = get();
        if (!user) return { success: false, error: 'Not authenticated' };

        try {
          const { data: updated, error } = await supabase
            .from('users')
            .update(data)
            .eq('id', user.id)
            .select()
            .single();

          if (error) {
            return { success: false, error: 'Failed to update profile' };
          }

          const { password_hash: _, ...safeUser } = updated;
          set({ user: safeUser as User });

          return { success: true };
        } catch {
          return { success: false, error: 'An error occurred' };
        }
      },

      loginWithGoogle: async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) console.error('Google login error:', error);
      },

      resetPassword: async (email: string) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
          });
          if (error) {
            return { success: false, error: error.message };
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
    }
  )
);

export default useAuthStore;
