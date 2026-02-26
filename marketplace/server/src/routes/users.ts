import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /users/me - Get current user profile
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, email, username, display_name, avatar_url, bio, phone, phone_verified,
        location_city, location_state, location_country, location_lat, location_lng,
        id_verified, verified_at, role, subscription_tier, subscription_expires_at,
        listings_count, sales_count, rating_average, rating_count,
        followers_count, following_count, created_at
      `)
      .eq('id', req.user!.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// PUT /users/me - Update current user profile
router.put('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      display_name,
      bio,
      phone,
      location_city,
      location_state,
      location_country,
      location_lat,
      location_lng,
    } = req.body;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({
        display_name,
        bio,
        phone,
        location_city,
        location_state,
        location_country,
        location_lat,
        location_lng,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user!.id)
      .select(`
        id, email, username, display_name, avatar_url, bio, phone, phone_verified,
        location_city, location_state, location_country, location_lat, location_lng,
        id_verified, role, subscription_tier, listings_count, rating_average,
        rating_count, followers_count, following_count, created_at
      `)
      .single();

    if (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// PUT /users/me/avatar - Update avatar URL
router.put('/me/avatar', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { avatar_url } = req.body;

    if (!avatar_url) {
      return res.status(400).json({ error: 'Avatar URL is required' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update({
        avatar_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.user!.id)
      .select('id, avatar_url')
      .single();

    if (error) {
      console.error('Update avatar error:', error);
      return res.status(500).json({ error: 'Failed to update avatar' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /users/:id - Get public profile
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select(`
        id, username, display_name, avatar_url, bio,
        location_city, location_country, id_verified, verified_at,
        role, listings_count, sales_count, rating_average,
        rating_count, followers_count, following_count, created_at
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's listings
    const { data: listings } = await supabaseAdmin
      .from('listings')
      .select(`
        id, title, slug, price, currency, condition,
        images:listing_images(url, thumbnail_url, is_primary)
      `)
      .eq('seller_id', id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(12);

    res.json({ user, listings: listings || [] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /users/:id/listings - Get user's listings
router.get('/:id/listings', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Check if user exists
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data: listings, count, error } = await supabaseAdmin
      .from('listings')
      .select(`
        *,
        category:categories(id, name, slug),
        images:listing_images(url, thumbnail_url, is_primary)
      `, { count: 'exact' })
      .eq('seller_id', id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('Get user listings error:', error);
      return res.status(500).json({ error: 'Failed to fetch listings' });
    }

    res.json({
      listings: listings || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// POST /users/:id/follow - Follow/unfollow user
router.post('/:id/follow', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if already following
    const { data: existing } = await supabaseAdmin
      .from('user_follows')
      .select('*')
      .eq('follower_id', req.user!.id)
      .eq('following_id', id)
      .single();

    if (existing) {
      // Unfollow
      await supabaseAdmin
        .from('user_follows')
        .delete()
        .eq('follower_id', req.user!.id)
        .eq('following_id', id);

      res.json({ following: false });
    } else {
      // Follow
      await supabaseAdmin
        .from('user_follows')
        .insert({
          follower_id: req.user!.id,
          following_id: id,
        });

      res.json({ following: true });
    }
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /users/:id/followers - Get user's followers
router.get('/:id/followers', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data: follows, count } = await supabaseAdmin
      .from('user_follows')
      .select(`
        follower:users!user_follows_follower_id_fkey(
          id, username, display_name, avatar_url, rating_average
        )
      `, { count: 'exact' })
      .eq('following_id', id)
      .range(offset, offset + limitNum - 1);

    const followers = (follows || []).map((f: any) => f.follower).filter(Boolean);

    res.json({
      followers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /users/:id/following - Get user's following
router.get('/:id/following', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data: follows, count } = await supabaseAdmin
      .from('user_follows')
      .select(`
        following:users!user_follows_following_id_fkey(
          id, username, display_name, avatar_url, rating_average
        )
      `, { count: 'exact' })
      .eq('follower_id', id)
      .range(offset, offset + limitNum - 1);

    const following = (follows || []).map((f: any) => f.following).filter(Boolean);

    res.json({
      following,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /users/:id/reviews - Get user's reviews
router.get('/:id/reviews', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data: reviews, count } = await supabaseAdmin
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviews_reviewer_id_fkey(
          id, username, display_name, avatar_url
        ),
        listing:listings!reviews_listing_id_fkey(id, title, slug)
      `, { count: 'exact' })
      .eq('reviewed_user_id', id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    res.json({
      reviews: reviews || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum),
      },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// POST /users/:id/reviews - Create a review
router.post('/:id/reviews', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, title, content, listing_id } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }

    // Check if review already exists
    const { data: existing } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('reviewer_id', req.user!.id)
      .eq('reviewed_user_id', id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'You have already reviewed this user' });
    }

    const { data: review, error } = await supabaseAdmin
      .from('reviews')
      .insert({
        reviewer_id: req.user!.id,
        reviewed_user_id: id,
        listing_id,
        rating,
        title,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error('Create review error:', error);
      return res.status(500).json({ error: 'Failed to create review' });
    }

    res.status(201).json({ review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

export { router as usersRouter };
