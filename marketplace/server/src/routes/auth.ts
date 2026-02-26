import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/supabase';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'default-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId: string, email: string): string => {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, username, display_name } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    // Check if email already exists
    const { data: existingEmail } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Check if username already exists
    const { data: existingUsername } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Create user
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash,
        username: username.toLowerCase(),
        display_name: display_name || username,
        role: 'user',
        is_active: true,
        email_verified: false,
      })
      .select('id, email, username, display_name, role, avatar_url, bio, location_city, location_country, listings_count, rating_average, rating_count, followers_count, following_count, created_at')
      .single();

    if (error) {
      console.error('Register error:', error);
      return res.status(500).json({ error: 'Failed to create account' });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      message: 'Account created successfully',
      user,
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'An error occurred during registration' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user by email
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is banned
    if (user.is_banned) {
      return res.status(403).json({ error: 'Your account has been suspended' });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(403).json({ error: 'Account is temporarily locked. Please try again later.' });
    }

    // Verify password
    if (!user.password_hash) {
      return res.status(401).json({ error: 'Please login with Google' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      // Increment failed attempts
      await supabaseAdmin
        .from('users')
        .update({
          failed_login_attempts: user.failed_login_attempts + 1,
          locked_until: user.failed_login_attempts >= 4
            ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
            : null,
        })
        .eq('id', user.id);

      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Reset failed attempts and update last login
    await supabaseAdmin
      .from('users')
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // Generate token
    const token = generateToken(user.id, user.email);

    // Remove password_hash from response
    const { password_hash: _, ...safeUser } = user;

    res.json({
      message: 'Login successful',
      user: safeUser,
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// POST /auth/logout
router.post('/logout', (req: Request, res: Response) => {
  // For JWT-based auth, logout is handled client-side by removing the token
  res.json({ message: 'Logout successful' });
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }) as { userId: string; email: string };

    // Get user from database
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, role, is_banned')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    // Generate new token
    const newToken = generateToken(user.id, user.email);

    res.json({ token: newToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .single();

    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // In production, send email with reset link
    // For now, return success
    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /auth/me - Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, username, display_name, role, avatar_url, bio, phone, phone_verified, location_city, location_state, location_country, id_verified, subscription_tier, listings_count, sales_count, rating_average, rating_count, followers_count, following_count, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export { router as authRouter };
