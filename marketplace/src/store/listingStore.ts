import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Listing, ListingWithDetails, Category, ListingCondition, PriceType, ListingStatus } from '@/types/database';
import slugify from 'slugify';

interface ListingFilters {
  query?: string;
  category_id?: string;
  min_price?: number;
  max_price?: number;
  condition?: ListingCondition;
  location?: string;
  sort_by?: 'newest' | 'oldest' | 'price_low' | 'price_high' | 'relevance';
}

interface ListingState {
  listings: ListingWithDetails[];
  featuredListings: ListingWithDetails[];
  userListings: ListingWithDetails[];
  currentListing: ListingWithDetails | null;
  categories: Category[];
  filters: ListingFilters;
  isLoading: boolean;
  hasMore: boolean;
  page: number;

  // Actions
  fetchListings: (reset?: boolean) => Promise<void>;
  fetchFeaturedListings: () => Promise<void>;
  fetchUserListings: (userId: string) => Promise<void>;
  fetchListingById: (id: string) => Promise<ListingWithDetails | null>;
  fetchListingBySlug: (slug: string) => Promise<ListingWithDetails | null>;
  fetchCategories: () => Promise<void>;
  createListing: (data: CreateListingData) => Promise<{ success: boolean; listing?: Listing; error?: string }>;
  updateListing: (id: string, data: Partial<CreateListingData>) => Promise<{ success: boolean; error?: string }>;
  deleteListing: (id: string) => Promise<{ success: boolean; error?: string }>;
  setFilters: (filters: ListingFilters) => void;
  resetFilters: () => void;
  toggleFavorite: (listingId: string, userId: string) => Promise<void>;
  incrementViews: (listingId: string) => Promise<void>;
}

interface CreateListingData {
  title: string;
  description: string;
  price: number;
  price_type: PriceType;
  condition: ListingCondition;
  category_id: string;
  brand?: string;
  model?: string;
  location_city?: string;
  location_state?: string;
  location_country?: string;
  meetup_location?: string;
  offers_shipping?: boolean;
  shipping_fee?: number;
  shipping_details?: string;
  status?: ListingStatus;
  images?: string[];
}

const PAGE_SIZE = 20;

export const useListingStore = create<ListingState>((set, get) => ({
  listings: [],
  featuredListings: [],
  userListings: [],
  currentListing: null,
  categories: [],
  filters: {},
  isLoading: false,
  hasMore: true,
  page: 0,

  setFilters: (filters) => {
    set({ filters, page: 0, listings: [], hasMore: true });
    get().fetchListings(true);
  },

  resetFilters: () => {
    set({ filters: {}, page: 0, listings: [], hasMore: true });
    get().fetchListings(true);
  },

  fetchListings: async (reset = false) => {
    const { filters, page, isLoading, hasMore } = get();

    if (isLoading || (!reset && !hasMore)) return;

    set({ isLoading: true });

    const currentPage = reset ? 0 : page;

    try {
      let query = supabase
        .from('listings')
        .select(`
          *,
          seller:users!seller_id(id, username, display_name, avatar_url, rating_average, rating_count),
          category:categories!category_id(id, name, slug, icon),
          images:listing_images(id, url, thumbnail_url, is_primary, sort_order)
        `)
        .eq('status', 'published')
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      // Apply filters
      if (filters.query) {
        query = query.textSearch('search_vector', filters.query);
      }
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters.min_price !== undefined) {
        query = query.gte('price', filters.min_price);
      }
      if (filters.max_price !== undefined) {
        query = query.lte('price', filters.max_price);
      }
      if (filters.condition) {
        query = query.eq('condition', filters.condition);
      }
      if (filters.location) {
        query = query.ilike('location_city', `%${filters.location}%`);
      }

      // Apply sorting
      switch (filters.sort_by) {
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'price_low':
          query = query.order('price', { ascending: true });
          break;
        case 'price_high':
          query = query.order('price', { ascending: false });
          break;
        default:
          query = query.order('is_boosted', { ascending: false })
                       .order('is_featured', { ascending: false })
                       .order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      const newListings = data || [];

      set({
        listings: reset ? newListings : [...get().listings, ...newListings],
        page: currentPage + 1,
        hasMore: newListings.length === PAGE_SIZE,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error fetching listings:', error);
      set({ isLoading: false });
    }
  },

  fetchFeaturedListings: async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          seller:users!seller_id(id, username, display_name, avatar_url, rating_average),
          category:categories!category_id(id, name, slug, icon),
          images:listing_images(id, url, thumbnail_url, is_primary, sort_order)
        `)
        .eq('status', 'published')
        .or('is_featured.eq.true,is_boosted.eq.true')
        .order('is_featured', { ascending: false })
        .limit(12);

      if (error) throw error;

      set({ featuredListings: data || [] });
    } catch (error) {
      console.error('Error fetching featured listings:', error);
    }
  },

  fetchUserListings: async (userId: string) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          category:categories!category_id(id, name, slug, icon),
          images:listing_images(id, url, thumbnail_url, is_primary, sort_order)
        `)
        .eq('seller_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ userListings: data || [], isLoading: false });
    } catch (error) {
      console.error('Error fetching user listings:', error);
      set({ isLoading: false });
    }
  },

  fetchListingById: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          seller:users!seller_id(id, username, display_name, avatar_url, bio, rating_average, rating_count, created_at, listings_count, sales_count),
          category:categories!category_id(id, name, slug, icon, parent_id),
          images:listing_images(id, url, thumbnail_url, medium_url, is_primary, sort_order)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      set({ currentListing: data });
      return data;
    } catch (error) {
      console.error('Error fetching listing:', error);
      return null;
    }
  },

  fetchListingBySlug: async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          seller:users!seller_id(id, username, display_name, avatar_url, bio, rating_average, rating_count, created_at, listings_count, sales_count),
          category:categories!category_id(id, name, slug, icon, parent_id),
          images:listing_images(id, url, thumbnail_url, medium_url, is_primary, sort_order)
        `)
        .eq('slug', slug)
        .single();

      if (error) throw error;

      set({ currentListing: data });
      return data;
    } catch (error) {
      console.error('Error fetching listing:', error);
      return null;
    }
  },

  fetchCategories: async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      set({ categories: data || [] });
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  },

  createListing: async (data: CreateListingData) => {
    try {
      // Generate unique slug
      const baseSlug = slugify(data.title, { lower: true, strict: true });
      const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          ...data,
          slug: uniqueSlug,
          status: data.status || 'draft',
          currency: 'PHP',
          published_at: data.status === 'published' ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload images if provided
      if (data.images && data.images.length > 0) {
        const imageInserts = data.images.map((url, index) => ({
          listing_id: listing.id,
          url,
          thumbnail_url: url,
          sort_order: index,
          is_primary: index === 0,
        }));

        await supabase.from('listing_images').insert(imageInserts);
      }

      return { success: true, listing };
    } catch (error) {
      console.error('Error creating listing:', error);
      return { success: false, error: 'Failed to create listing' };
    }
  },

  updateListing: async (id: string, data: Partial<CreateListingData>) => {
    try {
      const updateData: Record<string, unknown> = { ...data };

      // Update slug if title changed
      if (data.title) {
        const baseSlug = slugify(data.title, { lower: true, strict: true });
        updateData.slug = `${baseSlug}-${Date.now().toString(36)}`;
      }

      // Set published_at if status changed to published
      if (data.status === 'published') {
        const { data: current } = await supabase
          .from('listings')
          .select('published_at')
          .eq('id', id)
          .single();

        if (!current?.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error updating listing:', error);
      return { success: false, error: 'Failed to update listing' };
    }
  },

  deleteListing: async (id: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      set({
        listings: get().listings.filter((l) => l.id !== id),
        userListings: get().userListings.filter((l) => l.id !== id),
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting listing:', error);
      return { success: false, error: 'Failed to delete listing' };
    }
  },

  toggleFavorite: async (listingId: string, userId: string) => {
    try {
      // Check if already favorited
      const { data: existing } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', userId)
        .eq('listing_id', listingId)
        .single();

      if (existing) {
        // Remove favorite
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('listing_id', listingId);
      } else {
        // Add favorite
        await supabase
          .from('user_favorites')
          .insert({ user_id: userId, listing_id: listingId });
      }

      // Update local state
      const updateListings = (listings: ListingWithDetails[]) =>
        listings.map((l) =>
          l.id === listingId
            ? { ...l, is_favorited: !existing, likes_count: l.likes_count + (existing ? -1 : 1) }
            : l
        );

      set({
        listings: updateListings(get().listings),
        featuredListings: updateListings(get().featuredListings),
        currentListing: get().currentListing?.id === listingId
          ? { ...get().currentListing!, is_favorited: !existing, likes_count: get().currentListing!.likes_count + (existing ? -1 : 1) }
          : get().currentListing,
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  },

  incrementViews: async (listingId: string) => {
    try {
      await supabase.rpc('increment_listing_views', { listing_id: listingId });
    } catch (error) {
      // Silently fail - not critical
      console.error('Error incrementing views:', error);
    }
  },
}));

export default useListingStore;
