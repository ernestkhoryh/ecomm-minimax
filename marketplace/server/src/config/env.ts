import dotenv from 'dotenv';
import path from 'path';

// Load environment variables at the very top
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Export environment variables
export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

// Validate required environment variables
if (!config.supabaseUrl || !config.supabaseServiceKey) {
  console.error('Error: Missing required environment variables');
  process.exit(1);
}
