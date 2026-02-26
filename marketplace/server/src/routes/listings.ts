import { Router, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /listings - Get all listings with filters
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      min_price,
      max_price,
      condition,
      city,
      sort = 'created_at',
      order = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('listings')
      .select(`
        *,
        seller:users!listings_seller_id_fkey(id, username, display_name, avatar_url, rating_average, listings_count),
        category:categories(id, name, slug),
        images:listing_images(id, url, thumbnail_url, is_primary)
      `, { count: 'exact' })
      .eq('status', 'published')
      .eq('is_approved', true)
      .order(sort as string, { ascending: order === 'asc' })
      .range(offset, offset + limitNum - 1);

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq('category_id', category);
    }

    if (min_price) {
      query = query.gte('price', parseFloat(min_price as string));
    }

    if (max_price) {
      query = query.lte('price', parseFloat(max_price as string));
    }

    if (condition) {
      query = query.eq('condition', condition);
    }

    if (city) {
      query = query.ilike('location_city', `%${city}%`);
    }

    const { data: listings, count, error } = await query;

    if (error) {
      console.error('Listings error:', error);
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
    console.error('Listings error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /listings/featured - Get featured listings
router.get('/featured', async (req: AuthRequest, res: Response) => {
  try {
    const { data: listings, error } = await supabaseAdmin
      .from('listings')
      .select(`
        *,
        seller:users!listings_seller_id_fkey(id, username, display_name, avatar_url),
        category:categories(id, name, slug),
        images:listing_images(id, url, thumbnail_url, is_primary)
      `)
      .eq('status', 'published')
      .eq('is_featured', true)
      .order('published_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Featured listings error:', error);
      return res.status(500).json({ error: 'Failed to fetch featured listings' });
    }

    res.json({ listings: listings || [] });
  } catch (error) {
    console.error('Featured listings error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /listings/my-listings - Get current user's listings
router.get('/my-listings', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = supabaseAdmin
      .from('listings')
      .select(`
        *,
        category:categories(id, name, slug),
        images:listing_images(id, url, thumbnail_url, is_primary)
      `, { count: 'exact' })
      .eq('seller_id', req.user!.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: listings, count, error } = await query;

    if (error) {
      console.error('My listings error:', error);
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
    console.error('My listings error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /listings/:id - Get single listing
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const { data: listing, error } = await supabaseAdmin
      .from('listings')
      .select(`
        *,
        seller:users!listings_seller_id_fkey(
          id, username, display_name, avatar_url, bio,
          location_city, location_country, rating_average,
          rating_count, listings_count, created_at
        ),
        category:categories(id, name, slug),
        images:listing_images(id, url, thumbnail_url, medium_url, is_primary, sort_order)
      `)
      .eq('id', id)
      .single();

    if (error || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Increment views count
    await supabaseAdmin
      .from('listings')
      .update({ views_count: listing.views_count + 1 })
      .eq('id', id);

    // Check if user has liked this listing
    let is_liked = false;
    if (req.user) {
      const { data: favorite } = await supabaseAdmin
        .from('user_favorites')
        .select('*')
        .eq('user_id', req.user.id)
        .eq('listing_id', id)
        .single();
      is_liked = !!favorite;
    }

    res.json({ listing, is_liked });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// POST /listings - Create new listing
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      price,
      price_type = 'fixed',
      currency = 'PHP',
      original_price,
      condition = 'good',
      brand,
      model,
      location_city,
      location_state,
      location_country,
      meetup_location,
      category_id,
      offers_shipping = false,
      shipping_fee,
      shipping_details,
    } = req.body;

    if (!title || !description || !price) {
      return res.status(400).json({ error: 'Title, description, and price are required' });
    }

    // Generate slug
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    // Create listing
    const { data: listing, error } = await supabaseAdmin
      .from('listings')
      .insert({
        seller_id: req.user!.id,
        title,
        slug,
        description,
        price,
        price_type,
        currency,
        original_price,
        condition,
        brand,
        model,
        location_city,
        location_state,
        location_country: location_country || 'Philippines',
        meetup_location,
        category_id,
        offers_shipping,
        shipping_fee,
        shipping_details,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Create listing error:', error);
      return res.status(500).json({ error: 'Failed to create listing' });
    }

    res.status(201).json({ listing });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// PUT /listings/:id - Update listing
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check ownership
    const { data: existing } = await supabaseAdmin
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (existing.seller_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to update this listing' });
    }

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.seller_id;
    delete updates.created_at;
    delete updates.views_count;

    const { data: listing, error } = await supabaseAdmin
      .from('listings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update listing error:', error);
      return res.status(500).json({ error: 'Failed to update listing' });
    }

    res.json({ listing });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// DELETE /listings/:id - Delete listing
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check ownership
    const { data: existing } = await supabaseAdmin
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (existing.seller_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized to delete this listing' });
    }

    const { error } = await supabaseAdmin
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete listing error:', error);
      return res.status(500).json({ error: 'Failed to delete listing' });
    }

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// POST /listings/:id/images - Upload images
router.post('/:id/images', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { imageUrls } = req.body;

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ error: 'Image URLs are required' });
    }

    // Check ownership
    const { data: existing } = await supabaseAdmin
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (existing.seller_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get current max sort order
    const { data: currentImages } = await supabaseAdmin
      .from('listing_images')
      .select('sort_order')
      .eq('listing_id', id)
      .order('sort_order', { ascending: false })
      .limit(1);

    let sortOrder = currentImages?.[0]?.sort_order ?? -1;

    // Insert images
    const images = imageUrls.map((url: string, index: number) => ({
      listing_id: id,
      url,
      thumbnail_url: url, // In production, generate thumbnails
      medium_url: url,
      is_primary: index === 0 && currentImages?.length === 0,
      sort_order: sortOrder + index + 1,
    }));

    const { data: insertedImages, error } = await supabaseAdmin
      .from('listing_images')
      .insert(images)
      .select();

    if (error) {
      console.error('Upload images error:', error);
      return res.status(500).json({ error: 'Failed to upload images' });
    }

    res.status(201).json({ images: insertedImages });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// DELETE /listings/:id/images/:imageId - Delete image
router.delete('/:id/images/:imageId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id, imageId } = req.params;

    // Check ownership
    const { data: image } = await supabaseAdmin
      .from('listing_images')
      .select('listing_id')
      .eq('id', imageId)
      .eq('listing_id', id)
      .single();

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const { data: listing } = await supabaseAdmin
      .from('listings')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (listing?.seller_id !== req.user!.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { error } = await supabaseAdmin
      .from('listing_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      console.error('Delete image error:', error);
      return res.status(500).json({ error: 'Failed to delete image' });
    }

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// POST /listings/:id/like - Like/unlike listing
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if already liked
    const { data: existing } = await supabaseAdmin
      .from('user_favorites')
      .select('*')
      .eq('user_id', req.user!.id)
      .eq('listing_id', id)
      .single();

    if (existing) {
      // Unlike
      await supabaseAdmin
        .from('user_favorites')
        .delete()
        .eq('user_id', req.user!.id)
        .eq('listing_id', id);

      res.json({ liked: false });
    } else {
      // Like
      await supabaseAdmin
        .from('user_favorites')
        .insert({
          user_id: req.user!.id,
          listing_id: id,
        });

      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Like error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// GET /listings/:id/similar - Get similar listings
router.get('/:id/similar', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = 4 } = req.query;

    // Get current listing's category
    const { data: currentListing } = await supabaseAdmin
      .from('listings')
      .select('category_id, condition, price')
      .eq('id', id)
      .single();

    if (!currentListing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Get similar listings
    const { data: listings, error } = await supabaseAdmin
      .from('listings')
      .select(`
        *,
        seller:users!listings_seller_id_fkey(id, username, display_name, avatar_url),
        category:categories(id, name, slug),
        images:listing_images(id, url, thumbnail_url, is_primary)
      `)
      .eq('status', 'published')
      .eq('category_id', currentListing.category_id)
      .neq('id', id)
      .eq('condition', currentListing.condition)
      .order('published_at', { ascending: false })
      .limit(parseInt(limit as string));

    if (error) {
      console.error('Similar listings error:', error);
      return res.status(500).json({ error: 'Failed to fetch similar listings' });
    }

    res.json({ listings: listings || [] });
  } catch (error) {
    console.error('Similar listings error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
});

export { router as listingsRouter };
