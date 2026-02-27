import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

// Admin client (service role) - bypasses RLS
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Public client (anon key) - uses RLS
export const supabasePublic: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

// Helper to get user from token
export const getUserFromToken = async (token: string) => {
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    throw new Error('Invalid token');
  }
  return user;
};

export default supabaseAdmin;
