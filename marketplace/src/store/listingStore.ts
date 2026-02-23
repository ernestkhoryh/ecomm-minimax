import { create } from 'zustand';
import slugify from 'slugify';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { Listing, ListingWithDetails, Category, ListingCondition, PriceType, ListingStatus, ListingImage } from '@/types/database';

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

function makeBaseListing(raw: Record<string, unknown>): Listing {
  const now = new Date().toISOString();
  return {
    id: String(raw.id),
    seller_id: String(raw.seller_id),
    category_id: (raw.category_id as string) || null,
    title: String(raw.title || ''),
    slug: String(raw.slug || ''),
    description: String(raw.description || ''),
    price: Number(raw.price || 0),
    price_type: (raw.price_type as PriceType) || 'fixed',
    currency: String(raw.currency || 'PHP'),
    original_price: (raw.original_price as number) ?? null,
    condition: ((raw.condition as ListingCondition) || (raw.item_condition as ListingCondition) || 'good'),
    brand: (raw.brand as string) || null,
    model: (raw.model as string) || null,
    location_city: (raw.location_city as string) || null,
    location_state: (raw.location_state as string) || null,
    location_country: (raw.location_country as string) || null,
    location_lat: (raw.location_lat as number) ?? null,
    location_lng: (raw.location_lng as number) ?? null,
    meetup_location: (raw.meetup_location as string) || null,
    status: (raw.status as ListingStatus) || 'published',
    is_featured: Boolean(raw.is_featured),
    is_boosted: Boolean(raw.is_boosted),
    boost_expires_at: (raw.boost_expires_at as string) || null,
    boost_type: (raw.boost_type as Listing['boost_type']) || null,
    views_count: Number(raw.views_count || 0),
    likes_count: Number(raw.likes_count || 0),
    shares_count: Number(raw.shares_count || 0),
    messages_count: Number(raw.messages_count || 0),
    offers_shipping: Boolean(raw.offers_shipping),
    shipping_fee: (raw.shipping_fee as number) ?? null,
    shipping_details: (raw.shipping_details as string) || null,
    is_approved: raw.is_approved === undefined ? true : Boolean(raw.is_approved),
    moderation_notes: (raw.moderation_notes as string) || null,
    moderated_by: (raw.moderated_by as string) || null,
    moderated_at: (raw.moderated_at as string) || null,
    meta_title: (raw.meta_title as string) || null,
    meta_description: (raw.meta_description as string) || null,
    published_at: (raw.published_at as string) || null,
    sold_at: (raw.sold_at as string) || null,
    expires_at: (raw.expires_at as string) || null,
    created_at: (raw.created_at as string) || now,
    updated_at: (raw.updated_at as string) || now,
  };
}

function mapListRow(raw: Record<string, unknown>): ListingWithDetails {
  const listing = makeBaseListing(raw);
  const primaryImageUrl = (raw.primary_image as string) || null;
  const images: ListingImage[] = primaryImageUrl
    ? [{
        id: `${listing.id}-primary`,
        listing_id: listing.id,
        url: primaryImageUrl,
        thumbnail_url: primaryImageUrl,
        medium_url: null,
        alt_text: null,
        sort_order: 0,
        is_primary: true,
        file_size: null,
        width: null,
        height: null,
        mime_type: null,
        created_at: listing.created_at,
      }]
    : [];

  return {
    ...listing,
    images,
    category: raw.category_name
      ? ({
          id: listing.category_id || '',
          name: String(raw.category_name),
          slug: '',
          description: null,
          icon: null,
          image_url: null,
          parent_id: null,
          sort_order: 0,
          is_active: true,
          meta_title: null,
          meta_description: null,
          listings_count: 0,
          created_at: listing.created_at,
          updated_at: listing.updated_at,
        } as Category)
      : undefined,
  };
}

function mapDetailRow(raw: Record<string, unknown>): ListingWithDetails {
  const listing = makeBaseListing(raw);
  const images = Array.isArray(raw.images) ? (raw.images as ListingImage[]) : [];

  return {
    ...listing,
    images,
    category: raw.category_name
      ? ({
          id: listing.category_id || '',
          name: String(raw.category_name),
          slug: String(raw.category_slug || ''),
          description: null,
          icon: null,
          image_url: null,
          parent_id: null,
          sort_order: 0,
          is_active: true,
          meta_title: null,
          meta_description: null,
          listings_count: 0,
          created_at: listing.created_at,
          updated_at: listing.updated_at,
        } as Category)
      : undefined,
    seller: raw.seller_username || raw.seller_display_name
      ? ({
          id: listing.seller_id,
          email: '',
          email_verified: false,
          password_hash: null,
          username: (raw.seller_username as string) || null,
          display_name: (raw.seller_display_name as string) || null,
          avatar_url: (raw.seller_avatar_url as string) || null,
          bio: null,
          phone: null,
          phone_verified: false,
          location_city: null,
          location_state: null,
          location_country: 'Philippines',
          location_lat: null,
          location_lng: null,
          role: 'user',
          is_active: true,
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          id_verified: false,
          verified_at: null,
          subscription_tier: 'free',
          subscription_expires_at: null,
          listings_count: 0,
          sales_count: 0,
          rating_average: 0,
          rating_count: 0,
          followers_count: 0,
          following_count: 0,
          google_id: null,
          facebook_id: null,
          last_login_at: null,
          last_login_ip: null,
          failed_login_attempts: 0,
          locked_until: null,
          created_at: (raw.seller_created_at as string) || listing.created_at,
          updated_at: listing.updated_at,
        })
      : undefined,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

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
    const { filters, page, isLoading, hasMore, categories } = get();
    if (isLoading || (!reset && !hasMore)) return;

    set({ isLoading: true });
    const currentPage = reset ? 1 : page + 1;

    try {
      let categoryId = filters.category_id;
      if (categoryId && !isUuid(categoryId)) {
        const category = categories.find((c) => c.slug === categoryId);
        categoryId = category?.id;
      }

      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(PAGE_SIZE));
      params.set('status', 'published');
      if (filters.query) params.set('q', filters.query);
      if (categoryId) params.set('categoryId', categoryId);
      if (filters.min_price !== undefined) params.set('minPrice', String(filters.min_price));
      if (filters.max_price !== undefined) params.set('maxPrice', String(filters.max_price));

      const result = await apiRequest<{ success: boolean; data: Record<string, unknown>[] }>(`/listings?${params.toString()}`);
      let newListings = (result.data || []).map(mapListRow);

      if (filters.condition) {
        newListings = newListings.filter((l) => l.condition === filters.condition);
      }
      if (filters.location) {
        const needle = filters.location.toLowerCase();
        newListings = newListings.filter((l) => (l.location_city || '').toLowerCase().includes(needle));
      }

      switch (filters.sort_by) {
        case 'oldest':
          newListings.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          break;
        case 'price_low':
          newListings.sort((a, b) => a.price - b.price);
          break;
        case 'price_high':
          newListings.sort((a, b) => b.price - a.price);
          break;
        case 'newest':
        case 'relevance':
        default:
          newListings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      set({
        listings: reset ? newListings : [...get().listings, ...newListings],
        page: currentPage,
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
      const result = await apiRequest<{ success: boolean; data: Record<string, unknown>[] }>('/listings?status=published&limit=12&page=1');
      const listings = (result.data || []).map(mapListRow);
      set({ featuredListings: listings.slice(0, 12) });
    } catch (error) {
      console.error('Error fetching featured listings:', error);
    }
  },

  fetchUserListings: async (_userId: string) => {
    const token = useAuthStore.getState().token;
    if (!token) return;

    set({ isLoading: true });
    try {
      const result = await apiRequest<{ success: boolean; data: Record<string, unknown>[] }>('/listings/mine', { token });
      set({ userListings: (result.data || []).map(mapListRow), isLoading: false });
    } catch (error) {
      console.error('Error fetching user listings:', error);
      set({ isLoading: false });
    }
  },

  fetchListingById: async (id: string) => {
    try {
      const result = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(`/listings/${id}`);
      const listing = mapDetailRow(result.data);
      set({ currentListing: listing });
      return listing;
    } catch (error) {
      console.error('Error fetching listing:', error);
      return null;
    }
  },

  fetchListingBySlug: async (slug: string) => {
    try {
      const result = await apiRequest<{ success: boolean; data: Record<string, unknown> }>(`/listings/slug/${encodeURIComponent(slug)}`);
      const listing = mapDetailRow(result.data);
      set({ currentListing: listing });
      return listing;
    } catch (error) {
      console.error('Error fetching listing by slug:', error);
      return null;
    }
  },

  fetchCategories: async () => {
    try {
      const result = await apiRequest<{ success: boolean; data: Category[] }>('/categories');
      set({ categories: result.data || [] });
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  },

  createListing: async (data: CreateListingData) => {
    const token = useAuthStore.getState().token;
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const baseSlug = slugify(data.title, { lower: true, strict: true });
      const payload = {
        title: data.title,
        description: data.description,
        price: data.price,
        categoryId: data.category_id || null,
        priceType: data.price_type || 'fixed',
        itemCondition: data.condition || 'good',
        brand: data.brand || null,
        model: data.model || null,
        locationCity: data.location_city || null,
        locationState: data.location_state || null,
        locationCountry: data.location_country || 'Philippines',
        meetupLocation: data.meetup_location || null,
        offersShipping: data.offers_shipping || false,
        shippingFee: data.shipping_fee || null,
        shippingDetails: data.shipping_details || null,
        status: data.status || 'published',
        slugHint: `${baseSlug}-${Date.now().toString(36)}`,
        images: (data.images || []).map((url) => ({ url })),
      };

      const result = await apiRequest<{ success: boolean; data: { id: string; slug: string } }>('/listings', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      });

      const created = await get().fetchListingById(result.data.id);
      return { success: true, listing: created || undefined };
    } catch (error) {
      console.error('Error creating listing:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create listing' };
    }
  },

  updateListing: async (id: string, data: Partial<CreateListingData>) => {
    const token = useAuthStore.getState().token;
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      const payload = {
        title: data.title,
        description: data.description,
        price: data.price,
        categoryId: data.category_id,
        priceType: data.price_type,
        itemCondition: data.condition,
        brand: data.brand,
        model: data.model,
        locationCity: data.location_city,
        locationState: data.location_state,
        locationCountry: data.location_country,
        meetupLocation: data.meetup_location,
        offersShipping: data.offers_shipping,
        shippingFee: data.shipping_fee,
        shippingDetails: data.shipping_details,
        status: data.status,
      };

      await apiRequest(`/listings/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify(payload),
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating listing:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update listing' };
    }
  },

  deleteListing: async (id: string) => {
    const token = useAuthStore.getState().token;
    if (!token) return { success: false, error: 'Not authenticated' };

    try {
      await apiRequest(`/listings/${id}`, { method: 'DELETE', token });
      set({
        listings: get().listings.filter((l) => l.id !== id),
        userListings: get().userListings.filter((l) => l.id !== id),
      });
      return { success: true };
    } catch (error) {
      console.error('Error deleting listing:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete listing' };
    }
  },

  toggleFavorite: async (_listingId: string, _userId: string) => {
    // Favorites endpoint is not available in local backend API yet.
  },

  incrementViews: async (_listingId: string) => {
    // Listing views are incremented in GET /api/listings/:id and /api/listings/slug/:slug.
  },
}));

export default useListingStore;
